const { CobrancaMensal, ProcessoCobranca, NotificacaoCobranca, ConfiguracaoWebhook } = require('../models');
const { Op, QueryTypes } = require('sequelize');
const webhookService = require('./webhook');
const configuracaoCobrancaService = require('./configuracaocobranca');

const SCHEMA = (process.env.DB_SCHEMA || 'dev').trim();

const calcularDiferencaMeses = (inicio, fim) => {
  if (!(inicio instanceof Date) || !(fim instanceof Date)) return 1;
  const anos = fim.getFullYear() - inicio.getFullYear();
  const meses = fim.getMonth() - inicio.getMonth();
  const total = anos * 12 + meses;
  return total > 0 ? total : 1;
};

const montarMensagemResultadoWebhook = (resultado) => {
  if (!resultado) {
    return 'Webhook enviado com sucesso';
  }

  const resposta = resultado.resposta;
  if (resposta !== undefined && resposta !== null) {
    if (typeof resposta === 'string') {
      return resposta;
    }
    if (typeof resposta === 'object' && resposta.message) {
      return resposta.message;
    }
    try {
      return JSON.stringify(resposta);
    } catch (erro) {
      return String(resposta);
    }
  }

  if (resultado.erro) {
    return resultado.erro;
  }

  return resultado.sucesso ? 'Webhook enviado com sucesso' : 'Erro ao enviar webhook';
};

const montarPayloadCobrancas = (cobrancas) => cobrancas.map((cobranca) => ({
  id: cobranca.id,
  mesReferencia: cobranca.mesReferencia,
  valor: parseFloat(cobranca.valor) || 0,
  dataVencimento: cobranca.dataVencimento,
  diasAtraso: calcularDiasAtraso(cobranca.dataVencimento),
  status: cobranca.status,
  observacao: cobranca.observacao || ''
}));
const montarPayloadProcesso = (processo) => {
  if (!processo) return null;
  return {
    id: processo.id,
    nome: processo.nome,
    tipo: processo.tipo,
    status: processo.status,
    diaVencimento: processo.diaVencimento,
    dataInicioCobranca: processo.dataInicioCobranca,
    quantidadeMeses: processo.quantidadeMeses,
    observacao: processo.observacao || ''
  };
};

const calcularDiasAtraso = (dataVencimento) => {
  if (!dataVencimento) return 0;
  const hoje = new Date();
  const vencimento = new Date(dataVencimento);
  vencimento.setHours(0, 0, 0, 0);
  hoje.setHours(0, 0, 0, 0);
  const dias = Math.floor((hoje - vencimento) / (1000 * 60 * 60 * 24));
  return dias > 0 ? dias : 0;
};

class InadimplenciaService {
  /**
   * Detectar inadimplência e disparar webhooks (executado pelo cron)
   */
  async detectarInadimplenciaAutomatico() {
    console.log('[Inadimplência] Iniciando detecção automática...');

    const configuracao = await configuracaoCobrancaService.obterOuCriar();
    if (!configuracaoCobrancaService.deveExecutarHoje(configuracao)) {
      console.log(`[Inadimplência] Detecção automática pulada (modo ${configuracao.modo})`);
      return {
        cobrancasVerificadas: 0,
        statusAtualizados: 0,
        webhooksEnviados: 0,
        webhooksFalharam: 0
      };
    }

    const cobrancasAtrasadas = await this.buscarCobrancasAtrasadasParaNotificar();

    console.log(`[Inadimplência] Encontradas ${cobrancasAtrasadas.length} cobranças atrasadas`);

    const resultado = await this.processarCobrancasAtrasadas(
      cobrancasAtrasadas,
      { respeitarNotificacaoHoje: true }
    );

    await configuracaoCobrancaService.registrarExecucao(configuracao);

    console.log('[Inadimplência] Detecção concluída:', {
      cobrancasVerificadas: cobrancasAtrasadas.length,
      ...resultado
    });

    return {
      cobrancasVerificadas: cobrancasAtrasadas.length,
      ...resultado
    };
  }

  async buscarCobrancasAtrasadasParaNotificar() {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    return CobrancaMensal.findAll({
      where: {
        status: {
          [Op.in]: ['pendente', 'atrasado']
        },
        dataVencimento: {
          [Op.lt]: hoje
        }
      },
      include: [
        {
          association: 'processoCobranca',
          where: {
            status: 'ativo'
          },
          include: [
            {
              association: 'cota',
              include: [
                { association: 'cliente' },
                { association: 'consultor' }
              ]
            }
          ]
        }
      ]
    });
  }

  async processarCobrancasAtrasadas(cobrancas, { respeitarNotificacaoHoje = true, evento = 'inadimplencia_detectada' } = {}) {
    let statusAtualizados = 0;
    let webhooksEnviados = 0;
    let webhooksFalharam = 0;
    const processosMap = new Map();

    for (const cobranca of cobrancas) {
      if (cobranca.status === 'pendente') {
        await cobranca.update({ status: 'atrasado' });
        statusAtualizados++;
        console.log(`[Inadimplência] Cobrança ${cobranca.id} marcada como atrasada`);
      }

      const processId = cobranca.processoCobrancaId;
      if (!processId) continue;

      if (!processosMap.has(processId)) {
        processosMap.set(processId, {
          processo: cobranca.processoCobranca,
          cobrancas: []
        });
      }
      processosMap.get(processId).cobrancas.push(cobranca);
    }

    for (const { processo, cobrancas: grupoCobrancas } of processosMap.values()) {
      try {
        if (respeitarNotificacaoHoje) {
          const notificadoHoje = await this.verificarNotificacaoHoje(grupoCobrancas[0].id);
          if (notificadoHoje) {
            console.log(`[Inadimplência] Processo ${processo?.id} já foi notificado hoje`);
            continue;
          }
        }

        const resultado = await this.dispararWebhookProcesso(processo, grupoCobrancas, evento);
        if (resultado.sucesso) {
          webhooksEnviados++;
        } else {
          webhooksFalharam++;
        }
      } catch (erro) {
        console.error(`[Inadimplência] Erro ao processar processo ${processo?.id}:`, erro.message);
        webhooksFalharam++;
      }
    }

    return { statusAtualizados, webhooksEnviados, webhooksFalharam };
  }

  async dispararWebhookProcesso(processo, cobrancas, evento = 'inadimplencia_detectada') {
    try {
      const configuracao = await ConfiguracaoWebhook.findOne({
        where: { ativo: true }
      });

      const registrarNotificacoes = async (mensagem, status) => {
        const promessas = cobrancas.map((cobranca) => NotificacaoCobranca.create({
          cobrancaMensalId: cobranca.id,
          tipo: 'automatica',
          canal: 'webhook',
          status,
          mensagem
        }));
        await Promise.all(promessas);
      };

      if (!configuracao) {
        const mensagem = 'Nenhuma configuração de webhook ativa';
        await registrarNotificacoes(mensagem, 'falha');
        return {
          sucesso: false,
          erro: mensagem
        };
      }

      const extraPayload = {
        processo: montarPayloadProcesso(processo),
        cobrancas: montarPayloadCobrancas(cobrancas)
      };

      const resultado = await webhookService.enviarWebhook(
        cobrancas[0],
        configuracao,
        1,
        evento,
        extraPayload
      );

      const mensagemResposta = montarMensagemResultadoWebhook(resultado);
      const statusNotificacao = resultado.sucesso ? 'enviada' : 'falha';
      await registrarNotificacoes(mensagemResposta, statusNotificacao);

      if (resultado.sucesso) {
        const agora = new Date();
        await Promise.all(cobrancas.map(cobranca => cobranca.update({
          ultimaNotificacaoEm: agora,
          totalNotificacoes: cobranca.totalNotificacoes + 1
        })));
      }

      return resultado;
    } catch (erro) {
      const mensagem = erro.message;
      const promessas = cobrancas.map((cobranca) => NotificacaoCobranca.create({
        cobrancaMensalId: cobranca.id,
        tipo: 'automatica',
        canal: 'webhook',
        status: 'falha',
        mensagem
      }));
      await Promise.all(promessas);
      return {
        sucesso: false,
        erro: mensagem
      };
    }
  }

  async notificarManualmente() {
    console.log('[Inadimplência] Iniciando notificação manual...');

    const cobrancasAtrasadas = await this.buscarCobrancasAtrasadasParaNotificar();

    console.log(`[Inadimplência] Encontradas ${cobrancasAtrasadas.length} cobranças para notificar manualmente`);

    const resultado = await this.processarCobrancasAtrasadas(
      cobrancasAtrasadas,
      { respeitarNotificacaoHoje: true }
    );

    console.log('[Inadimplência] Notificação manual concluída:', {
      cobrancasVerificadas: cobrancasAtrasadas.length,
      ...resultado
    });

    return {
      cobrancasVerificadas: cobrancasAtrasadas.length,
      ...resultado
    };
  }

  async verificarStatusInadimplencia() {
    console.log('[Inadimplência] Iniciando verificação de status de inadimplência...');

    const cobrancasAtrasadas = await this.buscarCobrancasAtrasadasParaNotificar();

    console.log(`[Inadimplência] Encontradas ${cobrancasAtrasadas.length} cobranças para verificar o status`);

    const resultado = await this.processarCobrancasAtrasadas(
      cobrancasAtrasadas,
      { respeitarNotificacaoHoje: true, evento: 'inadimplencia_validar' }
    );

    console.log('[Inadimplência] Verificação de status concluída:', {
      cobrancasVerificadas: cobrancasAtrasadas.length,
      ...resultado
    });

    return {
      cobrancasVerificadas: cobrancasAtrasadas.length,
      ...resultado
    };
  }

  /**
   * Verificar se cobrança já foi notificada hoje
   */
  async verificarNotificacaoHoje(cobrancaMensalId) {
    const hoje = new Date();
    hoje.setHours(0, 0, 0, 0);

    const amanha = new Date(hoje);
    amanha.setDate(amanha.getDate() + 1);

    const notificacao = await NotificacaoCobranca.findOne({
      where: {
        cobrancaMensalId,
        tipo: 'automatica',
        createdAt: {
          [Op.gte]: hoje,
          [Op.lt]: amanha
        }
      }
    });

    return !!notificacao;
  }

  /**
   * Disparar webhook de inadimplência
   */
  async dispararWebhookInadimplencia(cobranca, evento = 'inadimplencia_detectada') {
    try {
      // Buscar configuração ativa do webhook
      const configuracao = await ConfiguracaoWebhook.findOne({
        where: { ativo: true }
      });

      if (!configuracao) {
        console.warn('[Inadimplência] Nenhuma configuração de webhook ativa encontrada');
        
        // Registrar notificação como falha
        await NotificacaoCobranca.create({
          cobrancaMensalId: cobranca.id,
          tipo: 'automatica',
          canal: 'webhook',
          status: 'falha',
          mensagem: 'Nenhuma configuração de webhook ativa'
        });

        return {
          sucesso: false,
          erro: 'Nenhuma configuração de webhook ativa'
        };
      }

      // Enviar webhook usando o WebhookService
      const resultado = await webhookService.enviarWebhook(cobranca, configuracao, 1, evento);
      const mensagemResposta = montarMensagemResultadoWebhook(resultado);

      // Registrar notificação
      await NotificacaoCobranca.create({
        cobrancaMensalId: cobranca.id,
        tipo: 'automatica',
        canal: 'webhook',
        status: resultado.sucesso ? 'enviada' : 'falha',
        mensagem: mensagemResposta
      });

      // Atualizar cobrança
      if (resultado.sucesso) {
        await cobranca.update({
          ultimaNotificacaoEm: new Date(),
          totalNotificacoes: cobranca.totalNotificacoes + 1
        });
      }

      return resultado;

    } catch (erro) {
      console.error('[Inadimplência] Erro ao disparar webhook:', erro);

      // Registrar notificação de erro
      await NotificacaoCobranca.create({
        cobrancaMensalId: cobranca.id,
        tipo: 'automatica',
        canal: 'webhook',
        status: 'falha',
        mensagem: erro.message
      });

      return {
        sucesso: false,
        erro: erro.message
      };
    }
  }

  /**
   * Listar inadimplentes com informações detalhadas
   */
  async listarInadimplentes(filtros = {}) {
    const where = {
      status: 'atrasado'
    };

    // Filtro por dias de atraso
    if (filtros.diasAtrasoMin || filtros.diasAtrasoMax) {
      const hoje = new Date();
      
      if (filtros.diasAtrasoMax) {
        const dataMinima = new Date(hoje);
        dataMinima.setDate(dataMinima.getDate() - filtros.diasAtrasoMax);
        where.dataVencimento = {
          ...where.dataVencimento,
          [Op.gte]: dataMinima
        };
      }

      if (filtros.diasAtrasoMin) {
        const dataMaxima = new Date(hoje);
        dataMaxima.setDate(dataMaxima.getDate() - filtros.diasAtrasoMin);
        where.dataVencimento = {
          ...where.dataVencimento,
          [Op.lte]: dataMaxima
        };
      }
    }

    const consultorFiltro = filtros.consultorId || null;
    const includeConsultor = {
      association: 'consultor'
    };
    if (consultorFiltro) {
      includeConsultor.where = { id: consultorFiltro };
      includeConsultor.required = true;
    }

    const limite = filtros.limite ? parseInt(filtros.limite, 10) : 50;
    const pagina = filtros.pagina ? parseInt(filtros.pagina, 10) : 1;
    const offset = (pagina - 1) * limite;

    // Buscar inadimplentes com paginação
    const { count: total, rows: inadimplentes } = await CobrancaMensal.findAndCountAll({
      where,
      include: [
        {
          association: 'processoCobranca',
          include: [
            {
              association: 'cota',
              include: [
                { association: 'cliente' },
                includeConsultor
              ]
            }
          ]
        },
        {
          association: 'notificacoes',
          order: [['createdAt', 'DESC']],
          limit: 5,
          separate: true
        }
      ],
      order: [['dataVencimento', 'ASC']],
      limit: limite,
      offset,
      distinct: true
    });

    // Calcular dias de atraso para cada cobrança
    const hoje = new Date();
    const inadimplentesComDias = inadimplentes.map(cobranca => {
      const vencimento = new Date(cobranca.dataVencimento);
      const diasAtraso = Math.floor((hoje - vencimento) / (1000 * 60 * 60 * 24));

      return {
        ...cobranca.toJSON(),
        diasAtraso
      };
    });

    return {
      dados: inadimplentesComDias,
      total,
      pagina,
      limite,
      totalPaginas: Math.ceil(total / limite)
    };
  }

  /**
   * Obter detalhes de um inadimplente específico
   */
  async obterDetalhesInadimplente(cobrancaId) {
    const cobranca = await CobrancaMensal.findByPk(cobrancaId, {
      include: [
        {
          association: 'processoCobranca',
          include: [
            {
              association: 'cota',
              include: [
                { association: 'cliente' },
                { association: 'consultor' }
              ]
            }
          ]
        },
        {
          association: 'notificacoes',
          include: [
            { association: 'usuario' }
          ],
          order: [['createdAt', 'DESC']]
        }
      ]
    });

    if (!cobranca) {
      throw new Error('Cobrança não encontrada');
    }

    // Calcular dias de atraso
    const hoje = new Date();
    const vencimento = new Date(cobranca.dataVencimento);
    const diasAtraso = Math.floor((hoje - vencimento) / (1000 * 60 * 60 * 24));

    return {
      ...cobranca.toJSON(),
      diasAtraso
    };
  }

  /**
   * Adicionar anotação manual ao histórico
   */
  async adicionarAnotacao(cobrancaId, dados) {
    const { tipo, canal, mensagem, usuarioId } = dados;

    // Validar tipo e canal
    const tiposValidos = ['manual'];
    const canaisValidos = ['ligacao', 'whatsapp_manual', 'email', 'observacao', 'sistema'];

    if (!tiposValidos.includes(tipo)) {
      throw new Error('Tipo de notificação inválido');
    }

    if (!canaisValidos.includes(canal)) {
      throw new Error('Canal de notificação inválido');
    }

    // Criar notificação
    const notificacao = await NotificacaoCobranca.create({
      cobrancaMensalId: cobrancaId,
      tipo,
      canal,
      status: 'enviada', // Anotações manuais sempre são "enviadas"
      mensagem,
      usuarioId
    });

    console.log(`[Inadimplência] Anotação adicionada à cobrança ${cobrancaId}`);

    return notificacao;
  }

  async listarNotificacoes(cobrancaId) {
    const notificacoes = await NotificacaoCobranca.findAll({
      where: { cobrancaMensalId: cobrancaId },
      include: [
        {
          association: 'usuario',
          attributes: ['id', 'name', 'email']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    return notificacoes;
  }

  /**
   * Obter estatísticas de inadimplência
   */
  async obterEstatisticasInadimplencia(filtros = {}) {
    const { consultorId = null, mes = null, ano = null } = filtros;
    const consultorFiltro = consultorId || null;
    const periodo = this.montarRangeMesReferencia(mes, ano);
    const includeConsultor = consultorFiltro
      ? this.montarIncludeProcessoComConsultor(consultorFiltro)
      : undefined;

    const montarWhere = (status) => {
      const where = {};
      if (status) where.status = status;
      if (periodo) {
        where.mesReferencia = {
          [Op.gte]: periodo.inicio,
          [Op.lt]: periodo.fim
        };
      }
      return where;
    };

    const whereAtrasadas = montarWhere('atrasado');
    const wherePagas = montarWhere('pago');
    const whereTotal = montarWhere();

    const totalInadimplentes = await CobrancaMensal.count({
      where: whereAtrasadas,
      ...(includeConsultor ? { include: includeConsultor } : {})
    });

    // Agregações via SQL — evita carregar todos os registros em memória
    const periodoWhere = periodo
      ? `AND cm."mesReferencia" >= :mesInicio AND cm."mesReferencia" < :mesFim`
      : '';

    const baseReplacements = {
      ...(consultorFiltro ? { consultorId: consultorFiltro } : {}),
      ...(periodo ? { mesInicio: periodo.inicio, mesFim: periodo.fim } : {})
    };

    const consultorJoinAgr = consultorFiltro
      ? `INNER JOIN "${SCHEMA}"."processos_cobranca" agr_pc ON agr_pc.id = cm."processoCobrancaId"
         INNER JOIN "${SCHEMA}"."cotas" agr_c ON agr_c.id = agr_pc."cotaId" AND agr_c."consultorId" = :consultorId`
      : '';

    const consultorJoinNtf = consultorFiltro
      ? `INNER JOIN "${SCHEMA}"."processos_cobranca" ntf_pc ON ntf_pc.id = cm."processoCobrancaId"
         INNER JOIN "${SCHEMA}"."cotas" ntf_c ON ntf_c.id = ntf_pc."cotaId" AND ntf_c."consultorId" = :consultorId`
      : '';

    const [agregados] = await CobrancaMensal.sequelize.query(
      `SELECT
        COALESCE(SUM(CAST(cm.valor AS NUMERIC)), 0) AS "valorTotal",
        ROUND(AVG((CURRENT_DATE - cm."dataVencimento"::date)::numeric), 0) AS "tempoMedio",
        COUNT(CASE WHEN (CURRENT_DATE - cm."dataVencimento"::date) <= 7 THEN 1 END) AS "ate7dias",
        COUNT(CASE WHEN (CURRENT_DATE - cm."dataVencimento"::date) BETWEEN 8 AND 15 THEN 1 END) AS "de8a15dias",
        COUNT(CASE WHEN (CURRENT_DATE - cm."dataVencimento"::date) BETWEEN 16 AND 30 THEN 1 END) AS "de16a30dias",
        COUNT(CASE WHEN (CURRENT_DATE - cm."dataVencimento"::date) > 30 THEN 1 END) AS "acima30dias"
       FROM "${SCHEMA}"."cobrancas_mensais" cm
       ${consultorJoinAgr}
       WHERE cm.status = 'atrasado' ${periodoWhere}`,
      { replacements: baseReplacements, type: QueryTypes.SELECT }
    );

    const valorTotalAtraso = parseFloat(agregados?.valorTotal || 0);
    const tempoMedioAtraso = parseInt(agregados?.tempoMedio || 0, 10);
    const faixas = {
      ate7dias:    parseInt(agregados?.ate7dias || 0, 10),
      de8a15dias:  parseInt(agregados?.de8a15dias || 0, 10),
      de16a30dias: parseInt(agregados?.de16a30dias || 0, 10),
      acima30dias: parseInt(agregados?.acima30dias || 0, 10)
    };

    const [ntfRow] = await CobrancaMensal.sequelize.query(
      `SELECT COUNT(*)::int AS "notificacoesHoje"
       FROM "${SCHEMA}"."notificacoes_cobranca" nc
       INNER JOIN "${SCHEMA}"."cobrancas_mensais" cm ON cm.id = nc."cobrancaMensalId"
       ${consultorJoinNtf}
       WHERE cm.status = 'atrasado'
         AND nc.tipo = 'automatica'
         AND nc."createdAt"::date = CURRENT_DATE
         ${periodoWhere}`,
      { replacements: baseReplacements, type: QueryTypes.SELECT }
    );
    const notificacoesHoje = ntfRow?.notificacoesHoje || 0;

    const processosAtivos = await ProcessoCobranca.count({
      where: { status: 'ativo' },
      ...(consultorFiltro ? { include: this.montarIncludeConsultorParaProcesso(consultorFiltro) } : {})
    });

    const totalCobrancas = await CobrancaMensal.count({
      where: whereTotal,
      ...(includeConsultor ? { include: includeConsultor } : {})
    });
    
    const cobrancasPagas = await CobrancaMensal.count({
      where: wherePagas,
      ...(includeConsultor ? { include: includeConsultor } : {})
    });

    const countCobrancasAtrasadas = totalInadimplentes;

    return {
      processosAtivos,
      totalCobrancas,
      cobrancasPagas,
      cobrancasAtrasadas: countCobrancasAtrasadas,
      totalInadimplentes,
      valorTotalAtraso,
      tempoMedioAtraso,
      faixas,
      notificacoesHoje
    };
  }

  /**
   * Forçar notificação manual de uma cobrança
   */
  async forcarNotificacao(cobrancaId) {
    const cobranca = await CobrancaMensal.findByPk(cobrancaId, {
      include: [
        {
          association: 'processoCobranca',
          include: [
            {
              association: 'cota',
              include: [
                { association: 'cliente' },
                { association: 'consultor' }
              ]
            }
          ]
        }
      ]
    });

    if (!cobranca) {
      throw new Error('Cobrança não encontrada');
    }

    if (cobranca.status === 'pago') {
      throw new Error('Não é possível notificar uma cobrança já paga');
    }

    // Disparar webhook
    const resultado = await this.dispararWebhookInadimplencia(cobranca);

    return resultado;
  }

  /**
   * Obter dados para gráficos (evolução de inadimplência)
   */
  async obterDadosGraficos(meses = 6, filtros = {}) {
    const consultorFiltro = filtros.consultorId || null;
    const periodo = this.montarRangeMesReferencia(filtros.mes, filtros.ano);

    // Calcular janela: se não há período explícito, usar últimos N meses
    const baseInicial = (() => {
      if (periodo?.inicio) return new Date(periodo.inicio);
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() - (meses - 1));
      d.setHours(0, 0, 0, 0);
      return d;
    })();
    const baseFinal = periodo?.fim ? new Date(periodo.fim) : (() => {
      const d = new Date();
      d.setDate(1);
      d.setMonth(d.getMonth() + 1);
      d.setHours(0, 0, 0, 0);
      return d;
    })();

    const baseInicialStr = this.formatarPrimeiroDia(baseInicial);
    const baseFinalStr = this.formatarPrimeiroDia(baseFinal);

    // JOIN de consultor (reutilizado nas 3 queries)
    const consultorJoin = consultorFiltro
      ? `INNER JOIN "${SCHEMA}"."processos_cobranca" gf_pc ON gf_pc.id = cm."processoCobrancaId"
         INNER JOIN "${SCHEMA}"."cotas" gf_c ON gf_c.id = gf_pc."cotaId" AND gf_c."consultorId" = :consultorId`
      : '';
    const baseReplacements = {
      baseInicial: baseInicialStr,
      baseFinal: baseFinalStr,
      ...(consultorFiltro ? { consultorId: consultorFiltro } : {})
    };

    // ── Query 1: evolução por mês e status (substitui N×3 COUNTs) ────────────
    const rowsEvolucao = await CobrancaMensal.sequelize.query(
      `SELECT cm."mesReferencia", cm.status, COUNT(cm.id)::int AS total
       FROM "${SCHEMA}"."cobrancas_mensais" cm
       ${consultorJoin}
       WHERE cm."mesReferencia" >= :baseInicial
         AND cm."mesReferencia" <  :baseFinal
         AND cm.status IN ('atrasado', 'pendente', 'pago')
       GROUP BY cm."mesReferencia", cm.status
       ORDER BY cm."mesReferencia" ASC`,
      { replacements: baseReplacements, type: QueryTypes.SELECT }
    );

    // Montar mapa mesReferencia → { atrasadas, pendentes, pagas }
    const evolucaoMap = new Map();
    rowsEvolucao.forEach(({ mesReferencia, status, total }) => {
      const chave = mesReferencia.toString().substring(0, 7); // YYYY-MM
      if (!evolucaoMap.has(chave)) evolucaoMap.set(chave, { atrasadas: 0, pendentes: 0, pagas: 0 });
      const entry = evolucaoMap.get(chave);
      if (status === 'atrasado') entry.atrasadas = total;
      else if (status === 'pendente') entry.pendentes = total;
      else if (status === 'pago') entry.pagas = total;
    });

    // Gerar todos os meses no intervalo (mesmo os sem dados)
    const MESES_PT = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez'];
    const evolucaoInadimplencia = [];
    const cursor = new Date(baseInicial);
    while (cursor < baseFinal) {
      const chave = `${cursor.getFullYear()}-${String(cursor.getMonth() + 1).padStart(2, '0')}`;
      const entry = evolucaoMap.get(chave) || { atrasadas: 0, pendentes: 0, pagas: 0 };
      evolucaoInadimplencia.push({
        mes: `${MESES_PT[cursor.getMonth()]}. ${String(cursor.getFullYear()).slice(-2)}`,
        atrasadas: entry.atrasadas,
        pendentes: entry.pendentes,
        pagas: entry.pagas,
        total: entry.atrasadas + entry.pendentes + entry.pagas
      });
      cursor.setMonth(cursor.getMonth() + 1);
    }

    // taxaInadimplenciaPorMes é derivada da mesma evolução
    const taxaInadimplenciaPorMes = evolucaoInadimplencia.map(item => ({
      mes: item.mes,
      taxa: item.total > 0 ? parseFloat(((item.atrasadas / item.total) * 100).toFixed(2)) : 0,
      atrasadas: item.atrasadas,
      total: item.total
    }));

    // ── Query 2: distribuição de status no período inteiro (substitui 4 COUNTs) ─
    const rowsStatus = await CobrancaMensal.sequelize.query(
      `SELECT cm.status, COUNT(cm.id)::int AS total
       FROM "${SCHEMA}"."cobrancas_mensais" cm
       ${consultorJoin}
       WHERE cm."mesReferencia" >= :baseInicial
         AND cm."mesReferencia" <  :baseFinal
       GROUP BY cm.status`,
      { replacements: baseReplacements, type: QueryTypes.SELECT }
    );

    const distribuicaoStatus = { pagas: 0, atrasadas: 0, pendentes: 0, total: 0 };
    rowsStatus.forEach(({ status, total }) => {
      distribuicaoStatus.total += total;
      if (status === 'pago') distribuicaoStatus.pagas = total;
      else if (status === 'atrasado') distribuicaoStatus.atrasadas = total;
      else if (status === 'pendente') distribuicaoStatus.pendentes = total;
    });

    // ── Query 3: inadimplência por consultor — top 10 (GROUP BY SQL) ──────────
    const consultorFiltroWhere = consultorFiltro ? `AND co.id = :consultorId` : '';
    const inadimplenciaPorConsultorArray = await CobrancaMensal.sequelize.query(
      `SELECT co.nome, COUNT(cm.id)::int AS quantidade, COALESCE(SUM(CAST(cm.valor AS NUMERIC)), 0) AS valor
       FROM "${SCHEMA}"."cobrancas_mensais" cm
       INNER JOIN "${SCHEMA}"."processos_cobranca" pc ON pc.id = cm."processoCobrancaId"
       INNER JOIN "${SCHEMA}"."cotas" c ON c.id = pc."cotaId"
       INNER JOIN "${SCHEMA}"."consultores" co ON co.id = c."consultorId"
       WHERE cm.status = 'atrasado'
         AND cm."mesReferencia" >= :baseInicial
         AND cm."mesReferencia" <  :baseFinal
         ${consultorFiltroWhere}
       GROUP BY co.id, co.nome
       ORDER BY quantidade DESC
       LIMIT 10`,
      { replacements: baseReplacements, type: QueryTypes.SELECT }
    );

    return {
      evolucaoInadimplencia,
      inadimplenciaPorConsultor: inadimplenciaPorConsultorArray,
      distribuicaoStatus,
      taxaInadimplenciaPorMes
    };
  }

  montarRangeMesReferencia(mes, ano) {
    const possuiMes = mes !== undefined && mes !== null && mes !== '';
    const possuiAno = ano !== undefined && ano !== null && ano !== '';

    if (!possuiMes && !possuiAno) {
      return null;
    }

    const anoAtual = this.parseNumero(ano, new Date().getFullYear());
    if (!Number.isFinite(anoAtual)) {
      return null;
    }

    if (possuiMes) {
      const mesAtual = this.parseNumero(mes);
      if (!Number.isFinite(mesAtual) || mesAtual < 1 || mesAtual > 12) {
        return null;
      }
      const inicio = new Date(anoAtual, mesAtual - 1, 1);
      const fim = new Date(anoAtual, mesAtual, 1);
      return {
        inicio: this.formatarPrimeiroDia(inicio),
        fim: this.formatarPrimeiroDia(fim)
      };
    }

    const inicio = new Date(anoAtual, 0, 1);
    const fim = new Date(anoAtual + 1, 0, 1);
    return {
      inicio: this.formatarPrimeiroDia(inicio),
      fim: this.formatarPrimeiroDia(fim)
    };
  }

  parseNumero(valor, fallback = null) {
    if (valor === undefined || valor === null || valor === '') {
      return fallback;
    }
    const inteiro = Number(valor);
    return Number.isFinite(inteiro) ? inteiro : fallback;
  }

  formatarPrimeiroDia(data) {
    const ano = data.getFullYear();
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    return `${ano}-${mes}-01`;
  }

  montarIncludeProcessoComConsultor(consultorId) {
    if (!consultorId) {
      return undefined;
    }

    return [
      {
        association: 'processoCobranca',
        required: true,
        include: [
          {
            association: 'cota',
            required: true,
            include: [
              {
                association: 'consultor',
                where: { id: consultorId },
                required: true
              }
            ]
          }
        ]
      }
    ];
  }

  montarIncludeConsultorParaProcesso(consultorId) {
    if (!consultorId) {
      return undefined;
    }

    return [
      {
        association: 'cota',
        required: true,
        include: [
          {
            association: 'consultor',
            where: { id: consultorId },
            required: true
          }
        ]
      }
    ];
  }
}

module.exports = new InadimplenciaService();
