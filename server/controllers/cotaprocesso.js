const cotaProcessoService = require('../services/cotaprocesso');

module.exports = {
  /**
   * POST /api/inadimplentes/processos/:id/cotas
   * Adicionar cota a um processo
   */
  async adicionarCota(req, res) {
    try {
      const { id: processoId } = req.params;
      const dados = req.body;

      const cotaProcesso = await cotaProcessoService.adicionarCotaAoProcesso(processoId, dados);

      return res.status(201).json({
        sucesso: true,
        mensagem: 'Cota adicionada ao processo com sucesso',
        dados: cotaProcesso
      });
    } catch (erro) {
      console.error('[CotaProcesso] Erro ao adicionar cota:', erro);
      return res.status(400).json({
        sucesso: false,
        mensagem: erro.message || 'Erro ao adicionar cota ao processo'
      });
    }
  },

  /**
   * DELETE /api/inadimplentes/processos/:id/cotas/:cotaId
   * Remover cota de um processo
   */
  async removerCota(req, res) {
    try {
      const { id: processoId, cotaId } = req.params;

      await cotaProcessoService.removerCotaDoProcesso(processoId, cotaId);

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Cota removida do processo com sucesso'
      });
    } catch (erro) {
      console.error('[CotaProcesso] Erro ao remover cota:', erro);
      return res.status(400).json({
        sucesso: false,
        mensagem: erro.message || 'Erro ao remover cota do processo'
      });
    }
  },

  /**
   * PUT /api/inadimplentes/cotas-processo/:id
   * Atualizar configuração de uma cota no processo
   */
  async atualizarConfiguracao(req, res) {
    try {
      const { id: cotaProcessoId } = req.params;
      const dados = req.body;

      const cotaProcesso = await cotaProcessoService.atualizarConfiguracaoCota(cotaProcessoId, dados);

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Configuração da cota atualizada com sucesso',
        dados: cotaProcesso
      });
    } catch (erro) {
      console.error('[CotaProcesso] Erro ao atualizar configuração:', erro);
      return res.status(400).json({
        sucesso: false,
        mensagem: erro.message || 'Erro ao atualizar configuração da cota'
      });
    }
  },

  /**
   * GET /api/inadimplentes/processos/:id/cotas
   * Listar cotas de um processo
   */
  async listarCotas(req, res) {
    try {
      const { id: processoId } = req.params;
      const { status } = req.query;

      const filtros = {};
      if (status) filtros.status = status;

      const cotas = await cotaProcessoService.listarCotasDoProcesso(processoId, filtros);

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Cotas listadas com sucesso',
        dados: cotas
      });
    } catch (erro) {
      console.error('[CotaProcesso] Erro ao listar cotas:', erro);
      return res.status(500).json({
        sucesso: false,
        mensagem: 'Erro ao listar cotas do processo'
      });
    }
  },

  /**
   * GET /api/inadimplentes/cotas-processo/:id
   * Obter detalhes de uma cota no processo
   */
  async obterDetalhes(req, res) {
    try {
      const { id: cotaProcessoId } = req.params;

      const cotaProcesso = await cotaProcessoService.obterDetalhesCotaProcesso(cotaProcessoId);

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Detalhes obtidos com sucesso',
        dados: cotaProcesso
      });
    } catch (erro) {
      console.error('[CotaProcesso] Erro ao obter detalhes:', erro);
      return res.status(404).json({
        sucesso: false,
        mensagem: erro.message || 'Cota não encontrada no processo'
      });
    }
  },

  /**
   * POST /api/inadimplentes/cotas-processo/:id/pausar
   * Pausar cota no processo
   */
  async pausar(req, res) {
    try {
      const { id: cotaProcessoId } = req.params;

      const cotaProcesso = await cotaProcessoService.pausarCota(cotaProcessoId);

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Cota pausada com sucesso',
        dados: cotaProcesso
      });
    } catch (erro) {
      console.error('[CotaProcesso] Erro ao pausar cota:', erro);
      return res.status(400).json({
        sucesso: false,
        mensagem: erro.message || 'Erro ao pausar cota'
      });
    }
  },

  /**
   * POST /api/inadimplentes/cotas-processo/:id/reativar
   * Reativar cota no processo
   */
  async reativar(req, res) {
    try {
      const { id: cotaProcessoId } = req.params;

      const cotaProcesso = await cotaProcessoService.reativarCota(cotaProcessoId);

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Cota reativada com sucesso',
        dados: cotaProcesso
      });
    } catch (erro) {
      console.error('[CotaProcesso] Erro ao reativar cota:', erro);
      return res.status(400).json({
        sucesso: false,
        mensagem: erro.message || 'Erro ao reativar cota'
      });
    }
  },

  /**
   * POST /api/inadimplentes/cotas-processo/:id/encerrar
   * Encerrar cota no processo
   */
  async encerrar(req, res) {
    try {
      const { id: cotaProcessoId } = req.params;
      const { dataCancelamento } = req.body || {};

      const cotaProcesso = await cotaProcessoService.encerrarCota(cotaProcessoId, dataCancelamento);

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Cota encerrada com sucesso',
        dados: cotaProcesso
      });
    } catch (erro) {
      console.error('[CotaProcesso] Erro ao encerrar cota:', erro);
      return res.status(400).json({
        sucesso: false,
        mensagem: erro.message || 'Erro ao encerrar cota'
      });
    }
  }
};
