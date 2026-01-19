const { ProcessoCobranca, CobrancaMensal, Cota, Cliente } = require('../models');
const { Op } = require('sequelize');

class CobrancaService {
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
   */
  async criarProcessoCobranca(dados) {
    const {
      cotaId,
      diaVencimento,
      dataInicioCobranca,
      historicoRetroativo
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
    const processo = await ProcessoCobranca.create({
      cotaId,
      diaVencimento,
      dataInicioCobranca,
      status: 'ativo'
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

      // Primeiro dia do mês
      const primeiroDiaMes = new Date(Date.UTC(ano, mes, 1));

      // Data de vencimento
      const dataVencimento = new Date(Date.UTC(ano, mes, diaVencimento));

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
   */
  async gerarCobrancasProcesso(processoId) {
    const processo = await ProcessoCobranca.findByPk(processoId, {
      include: [
        {
          association: 'cota'
        }
      ]
    });
    if (!processo) {
      throw new Error('Processo de cobrança não encontrado');
    }

    const hoje = new Date();
    const anoAtual = hoje.getFullYear();
    const mesAtual = hoje.getMonth(); // 0-11

    // Primeiro dia do mês atual
    const mesReferencia = new Date(anoAtual, mesAtual, 1);

    // Verificar se já passou da data de início
    const dataInicio = new Date(processo.dataInicioCobranca);
    if (mesReferencia < dataInicio) {
      console.log(`[Cobrança] Processo ${processoId}: Ainda não chegou na data de início`);
      return { criada: false, motivo: 'antes_data_inicio' };
    }

    // Verificar se já existe cobrança para este mês
    const cobrancaExistente = await CobrancaMensal.findOne({
      where: {
        processoCobrancaId: processoId,
        mesReferencia
      }
    });

    if (cobrancaExistente) {
      console.log(`[Cobrança] Processo ${processoId}: Cobrança do mês ${mesAtual + 1}/${anoAtual} já existe`);
      return { criada: false, motivo: 'ja_existe' };
    }

    const valorCota = Number.parseFloat(processo.cota?.valor);
    const valorBase = !Number.isNaN(valorCota) ? valorCota : 0;

    // Data de vencimento
    const dataVencimento = new Date(anoAtual, mesAtual, processo.diaVencimento);

    // Criar cobrança
    const cobranca = await CobrancaMensal.create({
      processoCobrancaId: processoId,
      mesReferencia,
      valor: valorBase,
      dataVencimento,
      status: 'pendente'
    });

    console.log(`[Cobrança] Processo ${processoId}: Cobrança criada para ${mesAtual + 1}/${anoAtual}`);

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

    return cobranca;
  }

  /**
   * Listar cobranças com filtros
   */
  async listarCobrancas(filtros = {}) {
    const where = {};

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

    // Filtro por processo
    if (filtros.processoCobrancaId) {
      where.processoCobrancaId = filtros.processoCobrancaId;
    }

    // Opções de query
    const options = {
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
        }
      ],
      order: [['dataVencimento', 'DESC']]
    };

    // Limite de resultados
    if (filtros.limite) {
      options.limit = parseInt(filtros.limite, 10);
    }

    // Buscar cobranças
    const cobrancas = await CobrancaMensal.findAll(options);

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

    return cobrancasComAtraso;
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
  async encerrarProcesso(processoId) {
    const processo = await ProcessoCobranca.findByPk(processoId);
    if (!processo) {
      throw new Error('Processo não encontrado');
    }

    await processo.update({ status: 'encerrado' });
    console.log(`[Cobrança] Processo ${processoId} encerrado`);

    return processo;
  }
}

module.exports = new CobrancaService();
