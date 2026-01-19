const { CobrancaMensal, ProcessoCobranca, NotificacaoCobranca, ConfiguracaoWebhook } = require('../models');
const { Op } = require('sequelize');
const webhookService = require('./webhook');

class InadimplenciaService {
  /**
   * Detectar inadimplência e disparar webhooks (executado pelo cron)
   */
  async detectarInadimplenciaAutomatico() {
    console.log('[Inadimplência] Iniciando detecção automática...');

    const cobrancasAtrasadas = await this.buscarCobrancasAtrasadasParaNotificar();

    console.log(`[Inadimplência] Encontradas ${cobrancasAtrasadas.length} cobranças atrasadas`);

    const resultado = await this.processarCobrancasAtrasadas(
      cobrancasAtrasadas,
      { respeitarNotificacaoHoje: true }
    );

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

  async processarCobrancasAtrasadas(cobrancas, { respeitarNotificacaoHoje = true } = {}) {
    let statusAtualizados = 0;
    let webhooksEnviados = 0;
    let webhooksFalharam = 0;

    for (const cobranca of cobrancas) {
      try {
        if (cobranca.status === 'pendente') {
          await cobranca.update({ status: 'atrasado' });
          statusAtualizados++;
          console.log(`[Inadimplência] Cobrança ${cobranca.id} marcada como atrasada`);
        }

        if (respeitarNotificacaoHoje) {
          const notificadoHoje = await this.verificarNotificacaoHoje(cobranca.id);
          if (notificadoHoje) {
            console.log(`[Inadimplência] Cobrança ${cobranca.id} já foi notificada hoje`);
            continue;
          }
        }

        const resultado = await this.dispararWebhookInadimplencia(cobranca);
        if (resultado.sucesso) {
          webhooksEnviados++;
        } else {
          webhooksFalharam++;
        }
      } catch (erro) {
        console.error(`[Inadimplência] Erro ao processar cobrança ${cobranca.id}:`, erro.message);
        webhooksFalharam++;
      }
    }

    return { statusAtualizados, webhooksEnviados, webhooksFalharam };
  }

  async notificarManualmente() {
    console.log('[Inadimplência] Iniciando notificação manual...');

    const cobrancasAtrasadas = await this.buscarCobrancasAtrasadasParaNotificar();

    console.log(`[Inadimplência] Encontradas ${cobrancasAtrasadas.length} cobranças para notificar manualmente`);

    const resultado = await this.processarCobrancasAtrasadas(
      cobrancasAtrasadas,
      { respeitarNotificacaoHoje: false }
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
  async dispararWebhookInadimplencia(cobranca) {
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
      const resultado = await webhookService.enviarWebhook(cobranca, configuracao);

      // Registrar notificação
      await NotificacaoCobranca.create({
        cobrancaMensalId: cobranca.id,
        tipo: 'automatica',
        canal: 'webhook',
        status: resultado.sucesso ? 'enviada' : 'falha',
        mensagem: resultado.erro || 'Webhook enviado com sucesso'
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

    // Buscar inadimplentes
    const inadimplentes = await CobrancaMensal.findAll({
      where,
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
          order: [['createdAt', 'DESC']],
          limit: 5
        }
      ],
      order: [['dataVencimento', 'ASC']]
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

    return inadimplentesComDias;
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
  async obterEstatisticasInadimplencia() {
    const hoje = new Date();

    // Total de inadimplentes
    const totalInadimplentes = await CobrancaMensal.count({
      where: { status: 'atrasado' }
    });

    // Valor total em atraso
    const cobrancasAtrasadas = await CobrancaMensal.findAll({
      where: { status: 'atrasado' },
      attributes: ['valor', 'dataVencimento']
    });

    const valorTotalAtraso = cobrancasAtrasadas.reduce(
      (total, cobranca) => total + parseFloat(cobranca.valor),
      0
    );

    // Inadimplentes por faixa de dias
    const faixas = {
      ate7dias: 0,
      de8a15dias: 0,
      de16a30dias: 0,
      acima30dias: 0
    };

    cobrancasAtrasadas.forEach(cobranca => {
      const vencimento = new Date(cobranca.dataVencimento);
      const diasAtraso = Math.floor((hoje - vencimento) / (1000 * 60 * 60 * 24));

      if (diasAtraso <= 7) {
        faixas.ate7dias++;
      } else if (diasAtraso <= 15) {
        faixas.de8a15dias++;
      } else if (diasAtraso <= 30) {
        faixas.de16a30dias++;
      } else {
        faixas.acima30dias++;
      }
    });

    // Tempo médio de atraso
    let tempoMedioAtraso = 0;
    if (cobrancasAtrasadas.length > 0) {
      const somaAtrasos = cobrancasAtrasadas.reduce((total, cobranca) => {
        const vencimento = new Date(cobranca.dataVencimento);
        const diasAtraso = Math.floor((hoje - vencimento) / (1000 * 60 * 60 * 24));
        return total + diasAtraso;
      }, 0);
      tempoMedioAtraso = Math.round(somaAtrasos / cobrancasAtrasadas.length);
    }

    // Total de notificações enviadas hoje
    const inicioHoje = new Date(hoje);
    inicioHoje.setHours(0, 0, 0, 0);
    
    const fimHoje = new Date(hoje);
    fimHoje.setHours(23, 59, 59, 999);

    const notificacoesHoje = await NotificacaoCobranca.count({
      where: {
        tipo: 'automatica',
        createdAt: {
          [Op.between]: [inicioHoje, fimHoje]
        }
      }
    });

    // KPIs adicionais para o dashboard
    const processosAtivos = await ProcessoCobranca.count({
      where: { status: 'ativo' }
    });

    const totalCobrancas = await CobrancaMensal.count();
    
    const cobrancasPagas = await CobrancaMensal.count({
      where: { status: 'pago' }
    });

    const countCobrancasAtrasadas = await CobrancaMensal.count({
      where: { status: 'atrasado' }
    });

    return {
      // KPIs principais
      processosAtivos,
      totalCobrancas,
      cobrancasPagas,
      cobrancasAtrasadas: countCobrancasAtrasadas,
      // Estatísticas de inadimplência
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
  async obterDadosGraficos(meses = 6) {
      const dataFinal = new Date();
      const dataInicial = new Date();
      dataInicial.setMonth(dataInicial.getMonth() - meses);

    // Gráfico de evolução de inadimplência (linha)
    const evolucaoInadimplencia = [];
    for (let i = 0; i < meses; i++) {
      const mesReferencia = new Date();
      mesReferencia.setMonth(mesReferencia.getMonth() - (meses - i - 1));
      mesReferencia.setDate(1);
      mesReferencia.setHours(0, 0, 0, 0);

      const proximoMes = new Date(mesReferencia);
      proximoMes.setMonth(proximoMes.getMonth() + 1);

      const cobrancasAtrasadas = await CobrancaMensal.count({
        where: {
          mesReferencia: mesReferencia,
          status: 'atrasado'
        }
      });

      const cobrancasPendentes = await CobrancaMensal.count({
        where: {
          mesReferencia: mesReferencia,
          status: 'pendente'
        }
      });

      const cobrancasPagas = await CobrancaMensal.count({
        where: {
          mesReferencia: mesReferencia,
          status: 'pago'
        }
      });

      evolucaoInadimplencia.push({
        mes: mesReferencia.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }),
        atrasadas: cobrancasAtrasadas,
        pendentes: cobrancasPendentes,
        pagas: cobrancasPagas,
        total: cobrancasAtrasadas + cobrancasPendentes + cobrancasPagas
      });
    }

    // Gráfico de inadimplência por consultor (barra)
    const inadimplenciaPorConsultor = await CobrancaMensal.findAll({
      where: {
        status: 'atrasado'
      },
      include: [
        {
          association: 'processoCobranca',
          include: [
            {
              association: 'cota',
              include: [
                { association: 'consultor' }
              ]
            }
          ]
        }
      ]
    });

    const consultoresMap = {};
    inadimplenciaPorConsultor.forEach(cobranca => {
      const consultor = cobranca.processoCobranca?.cota?.consultor;
      if (consultor) {
        const nome = consultor.nome;
        if (!consultoresMap[nome]) {
          consultoresMap[nome] = {
            nome,
            quantidade: 0,
            valor: 0
          };
        }
        consultoresMap[nome].quantidade++;
        consultoresMap[nome].valor += parseFloat(cobranca.valor);
      }
    });

    const inadimplenciaPorConsultorArray = Object.values(consultoresMap)
      .sort((a, b) => b.quantidade - a.quantidade)
      .slice(0, 10); // Top 10

    // Gráfico de taxa de recuperação (pizza)
    const totalCobrancas = await CobrancaMensal.count({
      where: {
        mesReferencia: {
          [Op.gte]: dataInicial
        }
      }
    });

    const cobrancasPagas = await CobrancaMensal.count({
      where: {
        mesReferencia: {
          [Op.gte]: dataInicial
        },
        status: 'pago'
      }
    });

    const cobrancasAtrasadas = await CobrancaMensal.count({
      where: {
        mesReferencia: {
          [Op.gte]: dataInicial
        },
        status: 'atrasado'
      }
    });

    const cobrancasPendentes = await CobrancaMensal.count({
      where: {
        mesReferencia: {
          [Op.gte]: dataInicial
        },
        status: 'pendente'
      }
    });

    const distribuicaoStatus = {
      pagas: cobrancasPagas,
      atrasadas: cobrancasAtrasadas,
      pendentes: cobrancasPendentes,
      total: totalCobrancas
    };

    // Gráfico de taxa de inadimplência por mês (linha)
    const taxaInadimplenciaPorMes = [];
    for (let i = 0; i < meses; i++) {
      const mesReferencia = new Date();
      mesReferencia.setMonth(mesReferencia.getMonth() - (meses - i - 1));
      mesReferencia.setDate(1);
      mesReferencia.setHours(0, 0, 0, 0);

      // Total de cobranças do mês
      const totalCobrancasMes = await CobrancaMensal.count({
        where: {
          mesReferencia: mesReferencia
        }
      });

      // Cobranças atrasadas do mês
      const cobrancasAtrasadasMes = await CobrancaMensal.count({
        where: {
          mesReferencia: mesReferencia,
          status: 'atrasado'
        }
      });

      // Calcular taxa de inadimplência (percentual)
      const taxa = totalCobrancasMes > 0 
        ? ((cobrancasAtrasadasMes / totalCobrancasMes) * 100).toFixed(2)
        : 0;

      taxaInadimplenciaPorMes.push({
        mes: mesReferencia.toLocaleDateString('pt-BR', { month: 'short', year: 'numeric' }),
        taxa: parseFloat(taxa),
        atrasadas: cobrancasAtrasadasMes,
        total: totalCobrancasMes
      });
    }

    return {
      evolucaoInadimplencia,
      inadimplenciaPorConsultor: inadimplenciaPorConsultorArray,
      distribuicaoStatus,
      taxaInadimplenciaPorMes
    };
  }
}

module.exports = new InadimplenciaService();
