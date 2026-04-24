const { ProcessoCobranca, CotaProcessoCobranca, Cota, CobrancaMensal } = require('../models');
const { Op } = require('sequelize');
const cobrancaService = require('./cobranca');

class CotaProcessoService {
  /**
   * Adicionar cota a um processo de cobrança
   */
  async adicionarCotaAoProcesso(processoId, dados) {
    const {
      cotaId,
      valor,
      diaVencimento,
      quantidadeMeses,
      mesesPagosRetroativo = 0,
      dataInicioCobranca,
      observacao
    } = dados;

    // Validar processo
    const processo = await ProcessoCobranca.findByPk(processoId);
    if (!processo) {
      throw new Error('Processo de cobrança não encontrado');
    }

    // Validar cota
    const cota = await Cota.findByPk(cotaId);
    if (!cota) {
      throw new Error('Cota não encontrada');
    }

    // Verificar se a cota já está vinculada ao processo
    const vinculoExistente = await CotaProcessoCobranca.findOne({
      where: {
        processoCobrancaId: processoId,
        cotaId
      }
    });

    if (vinculoExistente) {
      throw new Error('Esta cota já está vinculada a este processo');
    }

    // Criar vínculo
    const cotaProcesso = await CotaProcessoCobranca.create({
      processoCobrancaId: processoId,
      cotaId,
      valor,
      diaVencimento,
      quantidadeMeses: quantidadeMeses || null,
      mesesPagosRetroativo: mesesPagosRetroativo || 0,
      dataInicioCobranca,
      status: 'ativo',
      observacao
    });

    // Atualizar tipo do processo para 'multiplo' se tiver mais de 1 cota
    const totalCotas = await CotaProcessoCobranca.count({
      where: { processoCobrancaId: processoId }
    });

    if (totalCotas > 1 && processo.tipo === 'unico') {
      await processo.update({ tipo: 'multiplo' });
    }

    // Gerar histórico retroativo se necessário
    if (mesesPagosRetroativo > 0) {
      await this.gerarHistoricoRetroativo(cotaProcesso.id, mesesPagosRetroativo);
    }

    return cotaProcesso;
  }

  /**
   * Remover cota de um processo
   */
  async removerCotaDoProcesso(processoId, cotaId) {
    const cotaProcesso = await CotaProcessoCobranca.findOne({
      where: {
        processoCobrancaId: processoId,
        cotaId
      }
    });

    if (!cotaProcesso) {
      throw new Error('Cota não encontrada neste processo');
    }

    // Verificar se existem cobranças pendentes ou atrasadas
    const cobrancasPendentes = await CobrancaMensal.count({
      where: {
        cotaProcessoId: cotaProcesso.id,
        status: {
          [Op.in]: ['pendente', 'atrasado']
        }
      }
    });

    if (cobrancasPendentes > 0) {
      throw new Error('Não é possível remover cota com cobranças pendentes ou atrasadas');
    }

    // Remover vínculo (as cobranças serão removidas em cascade)
    await cotaProcesso.destroy();

    // Atualizar tipo do processo se necessário
    const processo = await ProcessoCobranca.findByPk(processoId);
    const totalCotas = await CotaProcessoCobranca.count({
      where: { processoCobrancaId: processoId }
    });

    if (totalCotas === 1 && processo.tipo === 'multiplo') {
      await processo.update({ tipo: 'unico' });
    }

    return { sucesso: true };
  }

  /**
   * Atualizar configuração de uma cota no processo
   */
  async atualizarConfiguracaoCota(cotaProcessoId, dados) {
    const cotaProcesso = await CotaProcessoCobranca.findByPk(cotaProcessoId);

    if (!cotaProcesso) {
      throw new Error('Vínculo cota-processo não encontrado');
    }

    const camposPermitidos = [
      'valor',
      'diaVencimento',
      'quantidadeMeses',
      'dataInicioCobranca',
      'status',
      'observacao'
    ];

    const dadosAtualizacao = {};
    for (const campo of camposPermitidos) {
      if (dados[campo] !== undefined) {
        dadosAtualizacao[campo] = dados[campo];
      }
    }

    await cotaProcesso.update(dadosAtualizacao);

    return cotaProcesso;
  }

  /**
   * Listar cotas de um processo
   */
  async listarCotasDoProcesso(processoId, filtros = {}) {
    const where = { processoCobrancaId: processoId };

    if (filtros.status) {
      where.status = filtros.status;
    }

    const cotasProcesso = await CotaProcessoCobranca.findAll({
      where,
      include: [
        {
          association: 'cota',
          include: [
            { association: 'cliente' },
            { association: 'consultor' }
          ]
        },
        {
          association: 'cobrancas',
          required: false,
          separate: true,
          order: [['mesReferencia', 'DESC']],
          limit: 5
        }
      ],
      order: [['createdAt', 'ASC']]
    });

    // Adicionar estatísticas para cada cota
    const cotasComEstatisticas = await Promise.all(
      cotasProcesso.map(async (cotaProcesso) => {
        const totalCobrancas = await CobrancaMensal.count({
          where: { cotaProcessoId: cotaProcesso.id }
        });

        const cobrancasPagas = await CobrancaMensal.count({
          where: {
            cotaProcessoId: cotaProcesso.id,
            status: 'pago'
          }
        });

        const cobrancasAtrasadas = await CobrancaMensal.count({
          where: {
            cotaProcessoId: cotaProcesso.id,
            status: 'atrasado'
          }
        });

        const valorTotalPendente = await CobrancaMensal.sum('valor', {
          where: {
            cotaProcessoId: cotaProcesso.id,
            status: {
              [Op.in]: ['pendente', 'atrasado']
            }
          }
        });

        return {
          ...cotaProcesso.toJSON(),
          estatisticas: {
            totalCobrancas,
            cobrancasPagas,
            cobrancasAtrasadas,
            valorTotalPendente: valorTotalPendente || 0
          }
        };
      })
    );

    return cotasComEstatisticas;
  }

  /**
   * Obter detalhes de uma cota no processo
   */
  async obterDetalhesCotaProcesso(cotaProcessoId) {
    const cotaProcesso = await CotaProcessoCobranca.findByPk(cotaProcessoId, {
      include: [
        {
          association: 'cota',
          include: [
            { association: 'cliente' },
            { association: 'consultor' }
          ]
        },
        {
          association: 'processoCobranca'
        },
        {
          association: 'cobrancas',
          order: [['mesReferencia', 'DESC']]
        }
      ]
    });

    if (!cotaProcesso) {
      throw new Error('Vínculo cota-processo não encontrado');
    }

    return cotaProcesso;
  }

  /**
   * Gerar histórico retroativo para uma cota
   */
  async gerarHistoricoRetroativo(cotaProcessoId, quantidadeMeses) {
    const cotaProcesso = await CotaProcessoCobranca.findByPk(cotaProcessoId);

    if (!cotaProcesso) {
      throw new Error('Vínculo cota-processo não encontrado');
    }

    console.log(`[CotaProcesso] Gerando ${quantidadeMeses} meses de histórico retroativo...`);

    const cobrancas = [];
    const dataInicio = new Date(cotaProcesso.dataInicioCobranca);
    
    for (let i = 0; i < quantidadeMeses; i++) {
      const mesReferencia = new Date(dataInicio);
      mesReferencia.setMonth(dataInicio.getMonth() - quantidadeMeses + i);
      mesReferencia.setDate(1);

      const dataVencimento = new Date(mesReferencia);
      dataVencimento.setDate(cotaProcesso.diaVencimento);

      const mesReferenciaStr = mesReferencia.toISOString().split('T')[0].substring(0, 10);
      const dataVencimentoStr = dataVencimento.toISOString().split('T')[0].substring(0, 10);

      // Verificar se já existe cobrança para este mês
      const cobrancaExistente = await CobrancaMensal.findOne({
        where: {
          cotaProcessoId: cotaProcesso.id,
          mesReferencia: mesReferenciaStr
        }
      });

      if (!cobrancaExistente) {
        cobrancas.push({
          processoCobrancaId: cotaProcesso.processoCobrancaId,
          cotaProcessoId: cotaProcesso.id,
          mesReferencia: mesReferenciaStr,
          valor: cotaProcesso.valor,
          dataVencimento: dataVencimentoStr,
          status: 'pago',
          dataPagamento: dataVencimentoStr,
          historicoRetroativo: true
        });
      }
    }

    if (cobrancas.length > 0) {
      await CobrancaMensal.bulkCreate(cobrancas);
      console.log(`[CotaProcesso] ${cobrancas.length} cobranças retroativas criadas`);
    }

    return cobrancas;
  }

  /**
   * Pausar cota no processo
   */
  async pausarCota(cotaProcessoId) {
    const cotaProcesso = await CotaProcessoCobranca.findByPk(cotaProcessoId);

    if (!cotaProcesso) {
      throw new Error('Vínculo cota-processo não encontrado');
    }

    if (cotaProcesso.status === 'pausado') {
      throw new Error('Cota já está pausada');
    }

    await cotaProcesso.update({ status: 'pausado' });

    return cotaProcesso;
  }

  /**
   * Reativar cota no processo
   */
  async reativarCota(cotaProcessoId) {
    const cotaProcesso = await CotaProcessoCobranca.findByPk(cotaProcessoId);

    if (!cotaProcesso) {
      throw new Error('Vínculo cota-processo não encontrado');
    }

    if (cotaProcesso.status !== 'pausado') {
      throw new Error('Cota não está pausada');
    }

    await cotaProcesso.update({ status: 'ativo' });

    return cotaProcesso;
  }

  /**
   * Encerrar cota no processo
   */
  async encerrarCota(cotaProcessoId, dataCancelamento = null) {
    const cotaProcesso = await CotaProcessoCobranca.findByPk(cotaProcessoId);

    if (!cotaProcesso) {
      throw new Error('Vínculo cota-processo não encontrado');
    }

    if (cotaProcesso.status === 'encerrado') {
      throw new Error('Cota já está encerrada');
    }

    const data = cobrancaService.normalizarDataCancelamento(dataCancelamento);
    await cotaProcesso.update({ status: 'encerrado' });
    await Cota.update(
      { status: 'cancelado', dataCancelamento: data },
      { where: { id: cotaProcesso.cotaId } }
    );
    await cobrancaService.encerrarProcessosDaCota(cotaProcesso.cotaId, data);

    return cotaProcesso;
  }
}

module.exports = new CotaProcessoService();
