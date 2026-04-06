const inadimplenciaService = require('../services/inadimplencia');

function obterConsultorFiltro(req, consultorIdParam) {
  const perfilUsuario = (req.user?.perfil || '').toUpperCase();
  const isConsultorPerfil = perfilUsuario === 'CONSULTOR';
  const isMasterPerfil = perfilUsuario === 'MASTER';
  const isAdminPerfil = perfilUsuario === 'ADMIN';
  const podeSelecionarConsultor = isAdminPerfil || isMasterPerfil || perfilUsuario === 'GESTOR';
  const consultorLogadoId = req.user?.consultorId || null;

  if (isConsultorPerfil && consultorLogadoId) {
    return consultorLogadoId;
  }

  if (podeSelecionarConsultor && consultorIdParam) {
    return consultorIdParam;
  }

  return null;
}

module.exports = {
  /**
   * GET /api/inadimplentes/inadimplentes
   * Listar inadimplentes
   */
  async listar(req, res) {
    try {
      const { diasAtrasoMin, diasAtrasoMax, consultorId, pagina, limite } = req.query;
      const consultorFiltro = obterConsultorFiltro(req, consultorId);

      const filtros = {};
      if (diasAtrasoMin) filtros.diasAtrasoMin = parseInt(diasAtrasoMin, 10);
      if (diasAtrasoMax) filtros.diasAtrasoMax = parseInt(diasAtrasoMax, 10);
      if (consultorFiltro !== null) {
        filtros.consultorId = consultorFiltro;
      }
      if (pagina) filtros.pagina = pagina;
      if (limite) filtros.limite = limite;

      const resultado = await inadimplenciaService.listarInadimplentes(filtros);

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Inadimplentes listados com sucesso',
        dados: resultado.dados,
        total: resultado.total,
        pagina: resultado.pagina,
        limite: resultado.limite,
        totalPaginas: resultado.totalPaginas
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
      const { consultorId, mes, ano } = req.query;
      const consultorFiltro = obterConsultorFiltro(req, consultorId);

      const filtros = {
        consultorId: consultorFiltro,
        mes,
        ano
      };

      const estatisticas = await inadimplenciaService.obterEstatisticasInadimplencia(filtros);

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
      const resultado = await inadimplenciaService.notificarManualmente();

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
  },

  /**
   * GET /api/inadimplencia/relatorios/processo/:id/pdf
   * Gerar relatório PDF de um processo
   */
  async gerarRelatorioPDF(req, res) {
    try {
      const { id } = req.params;
      const relatoriosService = require('../services/relatorios');
      
      const pdfBuffer = await relatoriosService.gerarRelatorioPDF(id);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', `attachment; filename=processo-${id}.pdf`);
      
      return res.send(pdfBuffer);
    } catch (erro) {
      console.error('[Inadimplencia] Erro ao gerar PDF:', erro);
      return res.status(500).json({
        sucesso: false,
        mensagem: 'Erro ao gerar relatório PDF',
        erro: erro.message
      });
    }
  },

  /**
   * GET /api/inadimplencia/relatorios/inadimplencia/pdf
   * Gerar relatório consolidado de inadimplência em PDF
   */
  async gerarRelatorioInadimplenciaPDF(req, res) {
    try {
      const { dataInicio, dataFim } = req.query;
      const relatoriosService = require('../services/relatorios');
      
      const filtros = {};
      if (dataInicio) filtros.dataInicio = dataInicio;
      if (dataFim) filtros.dataFim = dataFim;
      
      const pdfBuffer = await relatoriosService.gerarRelatorioInadimplenciaPDF(filtros);
      
      res.setHeader('Content-Type', 'application/pdf');
      res.setHeader('Content-Disposition', 'attachment; filename=relatorio-inadimplencia.pdf');
      
      return res.send(pdfBuffer);
    } catch (erro) {
      console.error('[Inadimplencia] Erro ao gerar PDF inadimplência:', erro);
      return res.status(500).json({
        sucesso: false,
        mensagem: 'Erro ao gerar relatório de inadimplência',
        erro: erro.message
      });
    }
  },

  /**
   * GET /api/inadimplencia/exportar/processos/excel
   * Exportar processos para Excel
   */
  async exportarProcessosExcel(req, res) {
    try {
      const { status } = req.query;
      const relatoriosService = require('../services/relatorios');
      
      const filtros = {};
      if (status) filtros.status = status;
      
      const excelBuffer = await relatoriosService.exportarProcessosExcel(filtros);
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=processos-cobranca.xlsx');
      
      return res.send(excelBuffer);
    } catch (erro) {
      console.error('[Inadimplencia] Erro ao exportar Excel:', erro);
      return res.status(500).json({
        sucesso: false,
        mensagem: 'Erro ao exportar processos para Excel',
        erro: erro.message
      });
    }
  },

  /**
   * GET /api/inadimplencia/exportar/atrasadas/excel
   * Exportar cobranças atrasadas para Excel
   */
  async exportarCobrancasAtrasadasExcel(req, res) {
    try {
      const relatoriosService = require('../services/relatorios');
      
      const excelBuffer = await relatoriosService.exportarCobrancasAtrasadasExcel();
      
      res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
      res.setHeader('Content-Disposition', 'attachment; filename=cobrancas-atrasadas.xlsx');
      
      return res.send(excelBuffer);
    } catch (erro) {
      console.error('[Inadimplencia] Erro ao exportar atrasadas Excel:', erro);
      return res.status(500).json({
        sucesso: false,
        mensagem: 'Erro ao exportar cobranças atrasadas para Excel',
        erro: erro.message
      });
    }
  },

  /**
   * POST /api/inadimplentes/notificar-manual
   * Notificar manualmente todas as cobranças atrasadas
   */
  async notificarManual(req, res) {
    try {
      console.log('[Inadimplencia] Iniciando notificação manual...');
      
      const inadimplenciaService = require('../services/inadimplencia');
      const resultado = await inadimplenciaService.notificarManualmente();
      
      console.log('[Inadimplencia] Notificação manual concluída:', resultado);
      
      return res.status(200).json({
        sucesso: true,
        mensagem: `${resultado.cobrancasVerificadas} cobrança(s) verificada(s), ${resultado.webhooksEnviados} notificação(ões) enviada(s)`,
        dados: resultado
      });
    } catch (erro) {
      console.error('[Inadimplencia] Erro na notificação manual:', erro);
      return res.status(500).json({
        sucesso: false,
        mensagem: 'Erro ao enviar notificações',
        erro: erro.message
      });
    }
  },

  async verificarStatus(req, res) {
    try {
      console.log('[Inadimplencia] Iniciando verificação de status de inadimplência...');
      
      const resultado = await inadimplenciaService.verificarStatusInadimplencia();
      
      console.log('[Inadimplencia] Verificação de status concluída:', resultado);
      
      return res.status(200).json({
        sucesso: true,
        mensagem: `${resultado.cobrancasVerificadas} cobrança(s) verificada(s), ${resultado.webhooksEnviados} webhook(s) enviados`,
        dados: resultado
      });
    } catch (erro) {
      console.error('[Inadimplencia] Erro ao verificar status:', erro);
      return res.status(500).json({
        sucesso: false,
        mensagem: 'Erro ao verificar status de inadimplência',
        erro: erro.message
      });
    }
  },

  /**
   * GET /api/inadimplencia/estatisticas/graficos
   * Obter dados para gráficos
   */
  async obterDadosGraficos(req, res) {
    try {
      const { meses = 6, consultorId, mes, ano } = req.query;
      const mesesNumeros = Number.isFinite(Number(meses)) ? Number(meses) : 6;
      const consultorFiltro = obterConsultorFiltro(req, consultorId);
      
      const dados = await inadimplenciaService.obterDadosGraficos(mesesNumeros, {
        consultorId: consultorFiltro,
        mes,
        ano
      });
      
      return res.status(200).json({
        sucesso: true,
        mensagem: 'Dados para gráficos obtidos com sucesso',
        dados
      });
    } catch (erro) {
      console.error('[Inadimplencia] Erro ao obter dados gráficos:', erro);
      return res.status(500).json({
        sucesso: false,
        mensagem: 'Erro ao obter dados para gráficos',
        erro: erro.message
      });
    }
  }
};
