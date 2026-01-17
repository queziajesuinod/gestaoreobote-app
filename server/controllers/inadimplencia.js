const inadimplenciaService = require('../services/inadimplencia');

module.exports = {
  /**
   * GET /api/inadimplentes/inadimplentes
   * Listar inadimplentes
   */
  async listar(req, res) {
    try {
      const { diasAtrasoMin, diasAtrasoMax } = req.query;

      const filtros = {};
      if (diasAtrasoMin) filtros.diasAtrasoMin = parseInt(diasAtrasoMin);
      if (diasAtrasoMax) filtros.diasAtrasoMax = parseInt(diasAtrasoMax);

      const inadimplentes = await inadimplenciaService.listarInadimplentes(filtros);

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Inadimplentes listados com sucesso',
        dados: inadimplentes
      });

    } catch (erro) {
      console.error('[Inadimplencia] Erro ao listar:', erro);
      return res.status(500).json({
        sucesso: false,
        mensagem: 'Erro ao listar inadimplentes'
      });
    }
  },

  /**
   * GET /api/inadimplentes/inadimplentes/:id
   * Obter detalhes de inadimplente
   */
  async buscarPorId(req, res) {
    try {
      const { id } = req.params;

      const inadimplente = await inadimplenciaService.obterDetalhesInadimplente(id);

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Detalhes obtidos com sucesso',
        dados: inadimplente
      });

    } catch (erro) {
      console.error('[Inadimplencia] Erro ao buscar:', erro);
      return res.status(404).json({
        sucesso: false,
        mensagem: erro.message || 'Inadimplente não encontrado'
      });
    }
  },

  /**
   * GET /api/inadimplentes/dashboard
   * Dashboard de inadimplência
   */
  async dashboard(req, res) {
    try {
      const estatisticas = await inadimplenciaService.obterEstatisticasInadimplencia();

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Dashboard obtido com sucesso',
        dados: estatisticas
      });

    } catch (erro) {
      console.error('[Inadimplencia] Erro ao obter dashboard:', erro);
      return res.status(500).json({
        sucesso: false,
        mensagem: 'Erro ao obter dashboard'
      });
    }
  },

  /**
   * POST /api/inadimplentes/detectar
   * Executar detecção manual de inadimplência
   */
  async detectarManual(req, res) {
    try {
      const resultado = await inadimplenciaService.detectarInadimplenciaAutomatico();

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Detecção executada com sucesso',
        dados: resultado
      });

    } catch (erro) {
      console.error('[Inadimplencia] Erro ao detectar:', erro);
      return res.status(500).json({
        sucesso: false,
        mensagem: 'Erro ao executar detecção'
      });
    }
  }
};
