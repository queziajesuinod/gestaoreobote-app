const {
  ProcessoCobranca,
  CobrancaMensal,
  Cota,
  Cliente,
  CotaProcessoCobranca
} = require('../models');
const { Op } = require('sequelize');
const inadimplenciaService = require('./inadimplencia');

class CobrancaService {
  normalizarDataCancelamento(dataCancelamento) {
    if (dataCancelamento) {
      return dataCancelamento;
    }
    return new Date().toISOString().slice(0, 10);
  }

  async cancelarCobrancasAbertas(where) {
    await CobrancaMensal.update(
      { status: 'cancelado' },
      {
        where: {
          ...where,
          status: { [Op.in]: ['pendente', 'atrasado'] }
        }
      }
    );
  }

  async encerrarProcessosDaCota(cotaId, dataCancelamento = null) {
    const data = this.normalizarDataCancelamento(dataCancelamento);
    const processosAfetados = new Set();

    const vinculos = await CotaProcessoCobranca.findAll({
      where: {
        cotaId,
        status: { [Op.ne]: 'encerrado' }
      }
    });

    for (const vinculo of vinculos) {
      await vinculo.update({ status: 'encerrado' });
      processosAfetados.add(vinculo.processoCobrancaId);
      await this.cancelarCobrancasAbertas({ cotaProcessoId: vinculo.id });
    }

    const processosLegado = await ProcessoCobranca.findAll({
      where: {
        cotaId,
        status: { [Op.ne]: 'encerrado' }
      }
    });

    for (const processo of processosLegado) {
      await processo.update({ status: 'encerrado' });
      processosAfetados.add(processo.id);
      await this.cancelarCobrancasAbertas({ processoCobrancaId: processo.id });
      await this.criarAnotacaoCancelamento(processo, data);
    }

    for (const processoId of processosAfetados) {
      const processo = await ProcessoCobranca.findByPk(processoId);
      if (!processo || processo.status === 'encerrado') {
        continue;
      }

      const cotasAbertas = await CotaProcessoCobranca.count({
        where: {
          processoCobrancaId: processoId,
          status: { [Op.ne]: 'encerrado' }
        }
      });

      if (cotasAbertas === 0) {
        await processo.update({ status: 'encerrado' });
        await this.cancelarCobrancasAbertas({ processoCobrancaId: processo.id });
        await this.criarAnotacaoCancelamento(processo, data);
      }
    }

    console.log(`[Cobrança] Processos da cota ${cotaId} encerrados por cancelamento de cota`);

    return { processosAfetados: Array.from(processosAfetados) };
  }

  async cancelarCotasDoProcesso(processoId, dataCancelamento = null) {
    const data = this.normalizarDataCancelamento(dataCancelamento);
    const processo = await ProcessoCobranca.findByPk(processoId);
    if (!processo) {
      throw new Error('Processo não encontrado');
    }

    const cotaIds = new Set();
    if (processo.cotaId) {
      cotaIds.add(processo.cotaId);
    }

    const vinculos = await CotaProcessoCobranca.findAll({
      where: { processoCobrancaId: processoId }
    });

    for (const vinculo of vinculos) {
      cotaIds.add(vinculo.cotaId);
      if (vinculo.status !== 'encerrado') {
        await vinculo.update({ status: 'encerrado' });
      }
    }

    if (cotaIds.size > 0) {
      await Cota.update(
        { status: 'cancelado', dataCancelamento: data },
        { where: { id: { [Op.in]: Array.from(cotaIds) } } }
      );
    }

    await this.cancelarCobrancasAbertas({ processoCobrancaId: processoId });

    return { cotaIds: Array.from(cotaIds), dataCancelamento: data };
  }

  /**
   * Extrair ano e mês do primeiro mês pago (formato YYYY-MM ou YYYY-MM-DD)
   */
  extrairAnoMes(valor) {
    if (!valor) {
      throw new Error('Primeiro mês pago inválido');
    }

    const partes = valor.split('-').map((item) => Number(item));
    if (partes.length < 2) {
      throw new Error('Primeiro mês pago deve conter ano e mês');
    }

    const ano = partes[0];
    const mes = partes[1];

    if (!Number.isInteger(ano) || !Number.isInteger(mes) || mes < 1 || mes > 12) {
      throw new Error('Ano ou mês do histórico retroativo inválidos');
    }

    return { ano, mes };
  }
  /**
   * Criar processo de cobrança com histórico retroativo opcional
   * Suporta tanto cota única quanto múltiplas cotas
   */
  async criarProcessoCobranca(dados) {
    const {
      cotaId,
      cotas, // NOVO: array de cotas para processo múltiplo
      nome,
      diaVencimento,
      dataInicioCobranca,
      historicoRetroativo,
      quantidadeMeses: quantidadeMesesRaw
    } = dados;

    // Verificar se é processo múltiplo ou único
    const isProcessoMultiplo = cotas && Array.isArray(cotas) && cotas.length > 0;
    
    if (isProcessoMultiplo) {
      // NOVO: Criar processo com múltiplas cotas
      return await this.criarProcessoMultiploCotas({ nome, cotas });
    } else {
      // LEGADO: Criar processo de cota única
      return await this.criarProcessoUnicaCota({
        cotaId,
        nome,
        diaVencimento,
        dataInicioCobranca,
        historicoRetroativo,
        quantidadeMeses: quantidadeMesesRaw
      });
    }
  }

  /**
   * Criar processo com múltiplas cotas (NOVO)
   */
  async criarProcessoMultiploCotas(dados) {
    const { nome, cotas } = dados;
    const { CotaProcessoCobranca } = require('../models');

    if (!cotas || cotas.length === 0) {
      throw new Error('Nenhuma cota fornecida para o processo');
    }

    // Validar todas as cotas
    for (const cotaConfig of cotas) {
      const cota = await Cota.findByPk(cotaConfig.cotaId);
      if (!cota) {
        throw new Error(`Cota ${cotaConfig.cotaId} não encontrada`);
      }
    }

    // Criar processo
    const processo = await ProcessoCobranca.create({
      nome: nome || 'Processo Múltiplas Cotas',
      tipo: 'multiplo',
      status: 'ativo'
    });

    console.log(`[Cobrança] Processo ${processo.id} criado com ${cotas.length} cotas`);

    // Adicionar cada cota ao processo
    for (const cotaConfig of cotas) {
      const {
        cotaId,
        valor,
        diaVencimento,
        quantidadeMeses,
        mesesPagosRetroativo,
        dataInicioCobranca,
        observacao
      } = cotaConfig;

      await CotaProcessoCobranca.create({
        processoCobrancaId: processo.id,
        cotaId,
        valor,
        diaVencimento,
        quantidadeMeses: quantidadeMeses || null,
        mesesPagosRetroativo: mesesPagosRetroativo || 0,
        dataInicioCobranca,
        status: 'ativo',
        observacao
      });

      console.log(`[Cobrança] Cota ${cotaId} adicionada ao processo ${processo.id}`);
    }

    // Gerar cobranças retroativas e atuais
    await this.gerarCobrancasProcesso(processo.id);

    return processo;
  }

  /**
   * Criar processo de cota única (LEGADO)
   */
  async criarProcessoUnicaCota(dados) {
    const {
      cotaId,
      nome,
      diaVencimento,
      dataInicioCobranca,
      historicoRetroativo,
      quantidadeMeses
    } = dados;

    // Validar cota
    const cota = await Cota.findByPk(cotaId);
    if (!cota) {
      throw new Error('Cota não encontrada');
    }

    // Verificar se já existe processo ativo para esta cota
    const processoExistente = await ProcessoCobranca.findOne({
      where: {
        cotaId,
        status: 'ativo'
      }
    });

    if (processoExistente) {
      throw new Error('Já existe um processo de cobrança ativo para esta cota');
    }

    const valorCota = Number.parseFloat(cota.valor);
    const valorBase = !Number.isNaN(valorCota) ? valorCota : 0;

    // Criar processo de cobrança
    const quantidadeMesesNormalizado = this.normalizarQuantidadeMeses(quantidadeMeses);

    const processo = await ProcessoCobranca.create({
      cotaId,
      nome: nome || `Processo - Cota ${cota.cota}`,
      tipo: 'unico',
      diaVencimento,
      dataInicioCobranca,
      status: 'ativo',
      quantidadeMeses: quantidadeMesesNormalizado
    });

    // Importar histórico retroativo se solicitado
    if (historicoRetroativo && historicoRetroativo.quantidadeMeses > 0) {
      await this.importarHistoricoRetroativo(
        processo.id,
        historicoRetroativo.primeiroMesPago,
        historicoRetroativo.quantidadeMeses,
        valorBase,
        diaVencimento
      );
    }

    // Gerar cobrança do mês atual se já passou da data de início
    await this.gerarCobrancasProcesso(processo.id);

    return processo;
  }

  /**
   * Importar histórico retroativo de cobranças já pagas
   */
  async importarHistoricoRetroativo(processoId, primeiroMesPago, quantidadeMeses, valorBase, diaVencimento) {
    console.log(`[Cobrança] Importando ${quantidadeMeses} meses de histórico retroativo...`);

    const cobrancas = [];

    const { ano: anoInicial, mes: mesInicial } = this.extrairAnoMes(primeiroMesPago);

    for (let i = 0; i < quantidadeMeses; i++) {
      const mesCorrigido = mesInicial - 1 + i;
      const ano = anoInicial + Math.floor(mesCorrigido / 12);
      const mes = mesCorrigido % 12;

      const formatarData = (year, m, day) => {
        const mesFormatado = String(m + 1).padStart(2, '0');
        const diaFormatado = String(day).padStart(2, '0');
        return `${year}-${mesFormatado}-${diaFormatado}`;
      };

      const primeiroDiaMes = formatarData(ano, mes, 1);
      const dataVencimento = formatarData(ano, mes, diaVencimento);

      cobrancas.push({
        processoCobrancaId: processoId,
        mesReferencia: primeiroDiaMes,
        valor: valorBase,
        dataVencimento,
        status: 'pago',
        dataPagamento: dataVencimento, // Assumir pagamento em dia
        historicoRetroativo: true
      });
    }

    // Criar todas as cobranças retroativas
    await CobrancaMensal.bulkCreate(cobrancas);

    console.log(`[Cobrança] ${quantidadeMeses} cobranças retroativas criadas com sucesso`);

    await this.tentarEncerrarProcesso(processoId);

    return cobrancas;
  }

  /**
   * Gerar cobranças mensais automaticamente (executado pelo cron)
   */
  async gerarCobrancasMensaisAutomatico() {
    console.log('[Cobrança] Iniciando geração automática de cobranças mensais...');

    const hoje = new Date();
    const anoAtual = hoje.getFullYear();
    const mesAtual = hoje.getMonth(); // 0-11

    // Buscar todos os processos ativos
    const processosAtivos = await ProcessoCobranca.findAll({
      where: {
        status: 'ativo'
      }
    });

    console.log(`[Cobrança] Encontrados ${processosAtivos.length} processos ativos`);

    let cobrancasCriadas = 0;
    let cobrancasIgnoradas = 0;

    for (const processo of processosAtivos) {
      try {
        const resultado = await this.gerarCobrancasProcesso(processo.id);
        if (resultado.criada) {
          cobrancasCriadas++;
        } else {
          cobrancasIgnoradas++;
        }
      } catch (erro) {
        console.error(`[Cobrança] Erro ao gerar cobrança do processo ${processo.id}:`, erro.message);
      }
    }

    console.log(`[Cobrança] Geração concluída: ${cobrancasCriadas} criadas, ${cobrancasIgnoradas} ignoradas`);

    return {
      processosVerificados: processosAtivos.length,
      cobrancasCriadas,
      cobrancasIgnoradas
    };
  }

  /**
   * Gerar cobrança para um processo específico
   * Suporta tanto processos de cota única quanto processos com múltiplas cotas
   */
  async gerarCobrancasProcesso(processoId) {
    const { CotaProcessoCobranca } = require('../models');
    
    const processo = await ProcessoCobranca.findByPk(processoId, {
      include: [
        {
          association: 'cota' // LEGADO: para processos tipo='unico'
        },
        {
          association: 'cotasProcesso', // NOVO: para processos tipo='multiplo'
          where: { status: 'ativo' },
          required: false
        }
      ]
    });
    
    if (!processo) {
      throw new Error('Processo de cobrança não encontrado');
    }

    const hoje = new Date();
    const anoAtual = hoje.getFullYear();
    const mesAtual = hoje.getMonth(); // 0-11

    const formatarData = (day) => {
      const mesFormatado = String(mesAtual + 1).padStart(2, '0');
      const diaFormatado = String(day).padStart(2, '0');
      return `${anoAtual}-${mesFormatado}-${diaFormatado}`;
    };

    const mesReferencia = formatarData(1);
    const mesReferenciaDate = new Date(mesReferencia);
    
    if (Number.isNaN(mesReferenciaDate.getTime())) {
      throw new Error('Mês de referência inválido');
    }

    // Verificar tipo de processo
    if (processo.tipo === 'multiplo' || (processo.cotasProcesso && processo.cotasProcesso.length > 0)) {
      // NOVO: Processos com múltiplas cotas
      return await this.gerarCobrancasProcessoMultiplo(processo, mesReferencia, mesReferenciaDate);
    } else {
      // LEGADO: Processos de cota única
      return await this.gerarCobrancaProcessoUnico(processo, mesReferencia, mesReferenciaDate, formatarData);
    }
  }

  /**
   * Gerar cobranças para processo com múltiplas cotas (NOVO)
   */
  async gerarCobrancasProcessoMultiplo(processo, mesReferencia, mesReferenciaDate) {
    const cotasProcesso = processo.cotasProcesso || [];
    
    if (cotasProcesso.length === 0) {
      console.log(`[Cobrança] Processo ${processo.id}: Nenhuma cota ativa encontrada`);
      return { criada: false, motivo: 'sem_cotas_ativas', cobrancasCriadas: 0 };
    }

    let cobrancasCriadas = 0;
    let cobrancasIgnoradas = 0;
    const cobrancas = [];

    for (const cotaProcesso of cotasProcesso) {
      try {
        // Verificar data de início
        const dataInicio = new Date(cotaProcesso.dataInicioCobranca);
        const inicioMes = new Date(dataInicio.getFullYear(), dataInicio.getMonth(), 1);
        
        if (mesReferenciaDate < inicioMes) {
          console.log(`[Cobrança] CotaProcesso ${cotaProcesso.id}: Ainda não chegou na data de início`);
          cobrancasIgnoradas++;
          continue;
        }

        // Verificar limite de quantidade de meses
        if (cotaProcesso.quantidadeMeses) {
          const totalCobrancas = await CobrancaMensal.count({
            where: { cotaProcessoId: cotaProcesso.id }
          });

          if (totalCobrancas >= cotaProcesso.quantidadeMeses) {
            console.log(`[Cobrança] CotaProcesso ${cotaProcesso.id}: Já atingiu limite de ${cotaProcesso.quantidadeMeses} meses`);
            cobrancasIgnoradas++;
            continue;
          }
        }

        // Verificar se já existe cobrança para este mês
        const cobrancaExistente = await CobrancaMensal.findOne({
          where: {
            cotaProcessoId: cotaProcesso.id,
            mesReferencia
          }
        });

        if (cobrancaExistente) {
          console.log(`[Cobrança] CotaProcesso ${cotaProcesso.id}: Cobrança já existe para este mês`);
          cobrancasIgnoradas++;
          continue;
        }

        // Criar cobrança
        const dataVencimento = `${mesReferencia.substring(0, 8)}${String(cotaProcesso.diaVencimento).padStart(2, '0')}`;
        
        const cobranca = await CobrancaMensal.create({
          processoCobrancaId: processo.id,
          cotaProcessoId: cotaProcesso.id,
          mesReferencia,
          valor: cotaProcesso.valor,
          dataVencimento,
          status: 'pendente'
        });

        cobrancas.push(cobranca);
        cobrancasCriadas++;
        console.log(`[Cobrança] CotaProcesso ${cotaProcesso.id}: Cobrança criada`);
        
      } catch (erro) {
        console.error(`[Cobrança] Erro ao gerar cobrança para CotaProcesso ${cotaProcesso.id}:`, erro.message);
        cobrancasIgnoradas++;
      }
    }

    console.log(`[Cobrança] Processo ${processo.id}: ${cobrancasCriadas} criadas, ${cobrancasIgnoradas} ignoradas`);

    return {
      criada: cobrancasCriadas > 0,
      cobrancasCriadas,
      cobrancasIgnoradas,
      cobrancas
    };
  }

  /**
   * Gerar cobrança para processo de cota única (LEGADO)
   */
  async gerarCobrancaProcessoUnico(processo, mesReferencia, mesReferenciaDate, formatarData) {
    const dataInicio = new Date(processo.dataInicioCobranca);
    if (Number.isNaN(dataInicio.getTime())) {
      throw new Error('Data de início do processo inválida');
    }

    const inicioMes = new Date(dataInicio.getFullYear(), dataInicio.getMonth(), 1);
    if (mesReferenciaDate < inicioMes) {
      console.log(`[Cobrança] Processo ${processo.id}: Ainda não chegou na data de início`);
      return { criada: false, motivo: 'antes_data_inicio' };
    }

    const quantidadeMeses = Number.isFinite(processo.quantidadeMeses)
      ? processo.quantidadeMeses
      : null;
    if (quantidadeMeses) {
      const totalCobrancasGeradas = await CobrancaMensal.count({
        where: {
          processoCobrancaId: processo.id
        }
      });

      if (totalCobrancasGeradas >= quantidadeMeses) {
        console.log(`[Cobrança] Processo ${processo.id}: Já atingiu o limite de ${quantidadeMeses} cobranças`);
        return { criada: false, motivo: 'limite_quantidade_meses' };
      }
    }

    // Verificar se já existe cobrança para este mês
    const cobrancaExistente = await CobrancaMensal.findOne({
      where: {
        processoCobrancaId: processo.id,
        mesReferencia
      }
    });

    if (cobrancaExistente) {
      const hoje = new Date();
      console.log(`[Cobrança] Processo ${processo.id}: Cobrança do mês ${hoje.getMonth() + 1}/${hoje.getFullYear()} já existe`);
      return { criada: false, motivo: 'ja_existe' };
    }

    const valorCota = Number.parseFloat(processo.cota?.valor);
    const valorBase = !Number.isNaN(valorCota) ? valorCota : 0;

    // Data de vencimento
    const dataVencimento = formatarData(processo.diaVencimento);

    // Criar cobrança
    const cobranca = await CobrancaMensal.create({
      processoCobrancaId: processo.id,
      mesReferencia,
      valor: valorBase,
      dataVencimento,
      status: 'pendente'
    });

    const hoje = new Date();
    console.log(`[Cobrança] Processo ${processo.id}: Cobrança criada para ${hoje.getMonth() + 1}/${hoje.getFullYear()}`);

    return { criada: true, cobranca };
  }

  /**
   * Marcar cobrança como paga
   */
  async marcarComoPago(cobrancaId, dados) {
    const { dataPagamento, observacao } = dados;

    const cobranca = await CobrancaMensal.findByPk(cobrancaId);
    if (!cobranca) {
      throw new Error('Cobrança não encontrada');
    }

    if (cobranca.status === 'pago') {
      throw new Error('Cobrança já está marcada como paga');
    }

    // Atualizar cobrança
    await cobranca.update({
      status: 'pago',
      dataPagamento: dataPagamento || new Date(),
      observacao
    });

    // Registrar no histórico de notificações
    const { NotificacaoCobranca } = require('../models');
    await NotificacaoCobranca.create({
      cobrancaMensalId: cobrancaId,
      tipo: 'sistema',
      canal: 'sistema',
      status: 'pago',
      mensagem: `Marcado como pago em ${dataPagamento || new Date().toISOString().split('T')[0]}. ${observacao || ''}`
    });

    console.log(`[Cobrança] Cobrança ${cobrancaId} marcada como paga`);

    await this.tentarEncerrarProcesso(cobranca.processoCobrancaId);

    return cobranca;
  }

  /**
   * Listar cobranças com filtros
   */
  async listarCobrancas(filtros = {}) {
    const where = {};
    const consultorFiltro = filtros.consultorId || null;
    const periodo = this.montarRangeMesReferencia(filtros.mes, filtros.ano);
    const cotaFiltro = filtros.cotaId || null;
    const clienteFiltro = filtros.clienteId || null;
    const administradoraFiltro = filtros.administradora || null;

    // Filtro por status
    if (filtros.status) {
      where.status = filtros.status;
    }

    // Filtro por período
    if (filtros.dataInicio && filtros.dataFim) {
      where.dataVencimento = {
        [Op.between]: [filtros.dataInicio, filtros.dataFim]
      };
    }

    if (periodo) {
      where.mesReferencia = {
        [Op.gte]: periodo.inicio,
        [Op.lt]: periodo.fim
      };
    }

    // Filtro por processo
    if (filtros.processoCobrancaId) {
      where.processoCobrancaId = filtros.processoCobrancaId;
    }

    // IDs de cliente e cota são UUID (string) — não usar parseNumero
    const clienteInclude = { association: 'cliente' };
    if (clienteFiltro) {
      clienteInclude.where = { id: clienteFiltro };
      clienteInclude.required = true;
    }

    const consultorInclude = { association: 'consultor' };
    if (consultorFiltro) {
      consultorInclude.where = { id: consultorFiltro };
      consultorInclude.required = true;
    }

    const cotaFiltroAtivo = !!(clienteFiltro || consultorFiltro || cotaFiltro || administradoraFiltro);

    const cotaInclude = {
      association: 'cota',
      include: [clienteInclude, consultorInclude],
      required: cotaFiltroAtivo
    };

    if (cotaFiltro) {
      cotaInclude.where = { id: cotaFiltro };
    }

    if (administradoraFiltro) {
      cotaInclude.where = { ...(cotaInclude.where || {}), administradora: administradoraFiltro };
    }

    const limite = filtros.limite ? parseInt(filtros.limite, 10) : 50;
    const offset = filtros.offset ? parseInt(filtros.offset, 10) : 0;
    const pagina = Math.floor(offset / limite) + 1;

    // Opções de query
    const options = {
      where,
      include: [
        {
          association: 'processoCobranca',
          include: [cotaInclude],
          required: cotaFiltroAtivo  // INNER JOIN quando há filtro aninhado
        }
      ],
      order: [['dataVencimento', 'DESC']],
      limit: limite,
      offset,
      distinct: true,
      subQuery: false
    };

    // Buscar cobranças com total
    const { count: total, rows: cobrancas } = await CobrancaMensal.findAndCountAll(options);

    // Calcular dias de atraso para cada cobrança
    const hoje = new Date();
    const cobrancasComAtraso = cobrancas.map(cobranca => {
      const cobrancaJSON = cobranca.toJSON();

      if (cobrancaJSON.status === 'atrasado' && cobrancaJSON.dataVencimento) {
        const vencimento = new Date(cobrancaJSON.dataVencimento);
        const diasAtraso = Math.max(0, Math.floor((hoje - vencimento) / (1000 * 60 * 60 * 24)));
        cobrancaJSON.diasAtraso = diasAtraso;
      } else {
        cobrancaJSON.diasAtraso = 0;
      }

      return cobrancaJSON;
    });

    return {
      dados: cobrancasComAtraso,
      total,
      pagina,
      limite,
      totalPaginas: Math.ceil(total / limite)
    };
  }

  /**
   * Obter estatísticas de cobranças
   */
  async obterEstatisticas() {
    const hoje = new Date();

    // Total de cobranças por status
    const totalPendentes = await CobrancaMensal.count({
      where: { status: 'pendente' }
    });

    const totalAtrasadas = await CobrancaMensal.count({
      where: { status: 'atrasado' }
    });

    const totalPagas = await CobrancaMensal.count({
      where: { status: 'pago' }
    });

    // Valor total em atraso
    const cobrancasAtrasadas = await CobrancaMensal.findAll({
      where: { status: 'atrasado' },
      attributes: ['valor']
    });

    const valorTotalAtraso = cobrancasAtrasadas.reduce(
      (total, cobranca) => total + parseFloat(cobranca.valor),
      0
    );

    // Taxa de inadimplência
    const totalCobrancas = totalPendentes + totalAtrasadas + totalPagas;
    const taxaInadimplencia = totalCobrancas > 0
      ? ((totalAtrasadas / totalCobrancas) * 100).toFixed(2)
      : 0;

    // Tempo médio de atraso
    const cobrancasComAtraso = await CobrancaMensal.findAll({
      where: { status: 'atrasado' },
      attributes: ['dataVencimento']
    });

    let tempoMedioAtraso = 0;
    if (cobrancasComAtraso.length > 0) {
      const somaAtrasos = cobrancasComAtraso.reduce((total, cobranca) => {
        const vencimento = new Date(cobranca.dataVencimento);
        const diasAtraso = Math.floor((hoje - vencimento) / (1000 * 60 * 60 * 24));
        return total + diasAtraso;
      }, 0);
      tempoMedioAtraso = Math.round(somaAtrasos / cobrancasComAtraso.length);
    }

    return {
      totalPendentes,
      totalAtrasadas,
      totalPagas,
      totalCobrancas,
      valorTotalAtraso,
      taxaInadimplencia: parseFloat(taxaInadimplencia),
      tempoMedioAtraso
    };
  }

  /**
   * Pausar processo de cobrança
   */
  async pausarProcesso(processoId) {
    const processo = await ProcessoCobranca.findByPk(processoId);
    if (!processo) {
      throw new Error('Processo não encontrado');
    }

    await processo.update({ status: 'pausado' });
    console.log(`[Cobrança] Processo ${processoId} pausado`);

    return processo;
  }

  /**
   * Reativar processo de cobrança
   */
  async reativarProcesso(processoId) {
    const processo = await ProcessoCobranca.findByPk(processoId);
    if (!processo) {
      throw new Error('Processo não encontrado');
    }

    await processo.update({ status: 'ativo' });
    console.log(`[Cobrança] Processo ${processoId} reativado`);

    return processo;
  }

  /**
   * Encerrar processo de cobrança
   */
  async encerrarProcesso(processoId, opcoes = {}) {
    const processo = await ProcessoCobranca.findByPk(processoId);
    if (!processo) {
      throw new Error('Processo não encontrado');
    }

    const dataCancelamento = this.normalizarDataCancelamento(opcoes.dataCancelamento);
    if (opcoes.cancelarCotas !== false) {
      await this.cancelarCotasDoProcesso(processoId, dataCancelamento);
    }

    await processo.update({ status: 'encerrado' });
    console.log(`[Cobrança] Processo ${processoId} encerrado`);

    await this.criarAnotacaoCancelamento(processo, dataCancelamento);
    return processo;
  }

  async criarAnotacaoCancelamento(processo, dataCancelamento = null) {
    const cobrancaVigente = await this.obterCobrancaVigente(processo.id);
    if (!cobrancaVigente) {
      return;
    }

    const data = dataCancelamento
      ? new Date(dataCancelamento).toLocaleDateString('pt-BR')
      : new Date().toLocaleDateString('pt-BR');
    const mensagem = `Processo de cobrança cancelado em ${data}`;

    await inadimplenciaService.adicionarAnotacao(cobrancaVigente.id, {
      tipo: 'manual',
      canal: 'sistema',
      mensagem
    });
  }

  async obterCobrancaVigente(processoId) {
    const cobrancaAtiva = await CobrancaMensal.findOne({
      where: {
        processoCobrancaId: processoId,
        status: { [Op.notIn]: ['pago', 'cancelado'] }
      },
      order: [['dataVencimento', 'DESC']]
    });

    if (cobrancaAtiva) {
      return cobrancaAtiva;
    }

    return CobrancaMensal.findOne({
      where: { processoCobrancaId: processoId },
      order: [['dataVencimento', 'DESC']]
    });
  }

  montarRangeMesReferencia(mes, ano) {
    const possuiMes = mes !== undefined && mes !== null && mes !== '';
    const possuiAno = ano !== undefined && ano !== null && ano !== '';

    if (!possuiMes && !possuiAno) {
      return null;
    }

    const anoReferencia = this.parseNumero(ano, new Date().getFullYear());
    if (!Number.isFinite(anoReferencia)) {
      return null;
    }

    if (possuiMes) {
      const mesReferencia = this.parseNumero(mes);
      if (!Number.isFinite(mesReferencia) || mesReferencia < 1 || mesReferencia > 12) {
        return null;
      }
      const inicio = new Date(anoReferencia, mesReferencia - 1, 1);
      const fim = new Date(anoReferencia, mesReferencia, 1);
      return {
        inicio: this.formatarPrimeiroDia(inicio),
        fim: this.formatarPrimeiroDia(fim)
      };
    }

    const inicio = new Date(anoReferencia, 0, 1);
    const fim = new Date(anoReferencia + 1, 0, 1);
    return {
      inicio: this.formatarPrimeiroDia(inicio),
      fim: this.formatarPrimeiroDia(fim)
    };
  }

  formatarPrimeiroDia(data) {
    const mes = String(data.getMonth() + 1).padStart(2, '0');
    const ano = data.getFullYear();
    return `${ano}-${mes}-01`;
  }

  parseNumero(valor, fallback = null) {
    if (valor === undefined || valor === null || valor === '') {
      return fallback;
    }
    const inteiro = Number(valor);
    return Number.isFinite(inteiro) ? inteiro : fallback;
  }

  async tentarEncerrarProcesso(processoId) {
    const processo = await ProcessoCobranca.findByPk(processoId);
    if (!processo) {
      return;
    }

    const quantidadeMeses = Number.isFinite(processo.quantidadeMeses)
      ? processo.quantidadeMeses
      : null;
    if (!quantidadeMeses) {
      return;
    }

    const totalCobrancas = await CobrancaMensal.count({
      where: { processoCobrancaId: processoId }
    });

    if (totalCobrancas < quantidadeMeses) {
      return;
    }

    const totalPagas = await CobrancaMensal.count({
      where: {
        processoCobrancaId: processoId,
        status: 'pago'
      }
    });

    if (totalPagas >= quantidadeMeses && processo.status !== 'encerrado') {
      await processo.update({ status: 'encerrado' });
      console.log(`[Cobrança] Processo ${processoId} encerrado após ${quantidadeMeses} cobranças pagas`);
    }
  }

  normalizarQuantidadeMeses(valor) {
    if (valor === undefined || valor === null || valor === '') {
      return null;
    }
    const meses = Number(valor);
    if (!Number.isFinite(meses) || meses < 1) {
      throw new Error('Quantidade de meses do processo inválida');
    }
    return Math.floor(meses);
  }
}

module.exports = new CobrancaService();
