const cobrancaService = require('../services/cobranca');
const inadimplenciaService = require('../services/inadimplencia');
const { CobrancaMensal } = require('../models');

module.exports = {
  /**
   * GET /api/inadimplentes/cobrancas
   * Listar cobranças com filtros
   */
  async listar(req, res) {
    try {
      const { status, dataInicio, dataFim, processoCobrancaId, limite, pagina, offset, consultorId, mes, ano, cotaId, clienteId, administradora } = req.query;

      const perfilUsuario = (req.user?.perfil || '').toUpperCase();
      const isConsultorPerfil = perfilUsuario === 'CONSULTOR';
      const ehAdminOuMaster = ['ADMIN', 'MASTER'].includes(perfilUsuario);
      const podeSelecionarConsultor = ehAdminOuMaster || perfilUsuario === 'GESTOR';
      const consultorLogadoId = req.user?.consultorId || null;

      const filtros = {};
      if (status) filtros.status = status;
      if (dataInicio) filtros.dataInicio = dataInicio;
      if (dataFim) filtros.dataFim = dataFim;
      if (processoCobrancaId) filtros.processoCobrancaId = processoCobrancaId;
      if (limite) filtros.limite = limite;
      if (pagina) filtros.pagina = pagina;
      if (offset) filtros.offset = offset;
      if (isConsultorPerfil && consultorLogadoId) {
        filtros.consultorId = consultorLogadoId;
      } else if (podeSelecionarConsultor && consultorId) {
        filtros.consultorId = consultorId;
      }
      if (mes) filtros.mes = mes;
      if (ano) filtros.ano = ano;
      if (cotaId) filtros.cotaId = cotaId;
      if (clienteId) filtros.clienteId = clienteId;
      if (administradora) filtros.administradora = administradora;

      const resultado = await cobrancaService.listarCobrancas(filtros);

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Cobranças listadas com sucesso',
        dados: resultado.dados,
        total: resultado.total,
        pagina: resultado.pagina,
        limite: resultado.limite,
        totalPaginas: resultado.totalPaginas
      });

    } catch (erro) {
      console.error('[CobrancaMensal] Erro ao listar:', erro);
      return res.status(500).json({
        sucesso: false,
        mensagem: 'Erro ao listar cobranças'
      });
    }
  },

  /**
   * GET /api/inadimplentes/cobrancas/:id
   * Buscar cobrança específica
   */
  async buscarPorId(req, res) {
    try {
      const { id } = req.params;

      const cobranca = await CobrancaMensal.findByPk(id, {
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
        return res.status(404).json({
          sucesso: false,
          mensagem: 'Cobrança não encontrada'
        });
      }

      // Calcular dias de atraso
      const hoje = new Date();
      const vencimento = new Date(cobranca.dataVencimento);
      const diasAtraso = Math.max(0, Math.floor((hoje - vencimento) / (1000 * 60 * 60 * 24)));

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Cobrança encontrada',
        dados: {
          ...cobranca.toJSON(),
          diasAtraso
        }
      });

    } catch (erro) {
      console.error('[CobrancaMensal] Erro ao buscar:', erro);
      return res.status(500).json({
        sucesso: false,
        mensagem: 'Erro ao buscar cobrança'
      });
    }
  },

  /**
   * POST /api/inadimplentes/cobrancas/:id/pagar
   * Marcar cobrança como paga
   */
  async marcarComoPago(req, res) {
    try {
      const { id } = req.params;
      const { dataPagamento, observacao } = req.body;

      const cobranca = await cobrancaService.marcarComoPago(id, {
        dataPagamento,
        observacao
      });

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Cobrança marcada como paga',
        dados: cobranca
      });

    } catch (erro) {
      console.error('[CobrancaMensal] Erro ao marcar como pago:', erro);
      return res.status(400).json({
        sucesso: false,
        mensagem: erro.message || 'Erro ao marcar cobrança como paga'
      });
    }
  },

  /**
   * POST /api/inadimplentes/cobrancas/:id/notificacoes
   * Adicionar anotação manual
   */
  async adicionarAnotacao(req, res) {
    try {
      const { id } = req.params;
      const { tipo, canal, mensagem } = req.body;
      const usuarioId = req.user?.id;

      // Validações
      if (!tipo || !canal || !mensagem) {
        return res.status(400).json({
          sucesso: false,
          mensagem: 'Campos obrigatórios: tipo, canal, mensagem'
        });
      }

      const notificacao = await inadimplenciaService.adicionarAnotacao(id, {
        tipo,
        canal,
        mensagem,
        usuarioId
      });

      return res.status(201).json({
        sucesso: true,
        mensagem: 'Anotação adicionada com sucesso',
        dados: notificacao
      });

    } catch (erro) {
      console.error('[CobrancaMensal] Erro ao adicionar anotação:', erro);
      return res.status(400).json({
        sucesso: false,
        mensagem: erro.message || 'Erro ao adicionar anotação'
      });
    }
  },

  /**
   * POST /api/inadimplentes/cobrancas/:id/notificar
   * Forçar notificação manual
   */
  async forcarNotificacao(req, res) {
    try {
      const { id } = req.params;

      const resultado = await inadimplenciaService.forcarNotificacao(id);

      if (resultado.sucesso) {
        return res.status(200).json({
          sucesso: true,
          mensagem: 'Notificação enviada com sucesso',
          dados: resultado
        });
      } else {
        return res.status(500).json({
          sucesso: false,
          mensagem: 'Falha ao enviar notificação',
          dados: resultado
        });
      }

    } catch (erro) {
      console.error('[CobrancaMensal] Erro ao forçar notificação:', erro);
      return res.status(400).json({
        sucesso: false,
        mensagem: erro.message || 'Erro ao forçar notificação'
      });
    }
  },

  /**
   * GET /api/inadimplentes/cobrancas/:id/notificacoes
   * Listar notificações da cobrança
   */
  async listarNotificacoes(req, res) {
    try {
      const { id } = req.params;

      const notificacoes = await inadimplenciaService.listarNotificacoes(id);

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Notificações listadas com sucesso',
        dados: notificacoes
      });

    } catch (erro) {
      console.error('[CobrancaMensal] Erro ao listar notificações:', erro);
      return res.status(500).json({
        sucesso: false,
        mensagem: 'Erro ao listar notificações'
      });
    }
  },

  /**
   * POST /api/inadimplentes/cobrancas/lote/pagar
   * Marcar várias cobranças como pagas de uma vez
   */
  async marcarVariasComoPago(req, res) {
    try {
      const { ids, dataPagamento, observacao } = req.body;

      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          sucesso: false,
          mensagem: 'Informe ao menos uma cobrança (ids)'
        });
      }

      const resultados = { sucesso: [], falha: [] };

      for (const id of ids) {
        try {
          await cobrancaService.marcarComoPago(id, { dataPagamento, observacao });
          resultados.sucesso.push(id);
        } catch (err) {
          resultados.falha.push({ id, motivo: err.message });
        }
      }

      return res.status(200).json({
        sucesso: true,
        mensagem: `${resultados.sucesso.length} cobrança(s) marcada(s) como paga(s)`,
        dados: resultados
      });

    } catch (erro) {
      console.error('[CobrancaMensal] Erro ao marcar em lote como pago:', erro);
      return res.status(500).json({
        sucesso: false,
        mensagem: 'Erro ao processar pagamentos em lote'
      });
    }
  },

  /**
   * POST /api/inadimplentes/cobrancas/lote/anotar
   * Adicionar a mesma anotação em várias cobranças
   */
  async adicionarAnotacaoEmLote(req, res) {
    try {
      const { ids, tipo, canal, mensagem } = req.body;
      const usuarioId = req.user?.id;

      if (!Array.isArray(ids) || ids.length === 0) {
        return res.status(400).json({
          sucesso: false,
          mensagem: 'Informe ao menos uma cobrança (ids)'
        });
      }

      if (!tipo || !canal || !mensagem) {
        return res.status(400).json({
          sucesso: false,
          mensagem: 'Campos obrigatórios: tipo, canal, mensagem'
        });
      }

      const resultados = { sucesso: [], falha: [] };

      for (const id of ids) {
        try {
          await inadimplenciaService.adicionarAnotacao(id, { tipo, canal, mensagem, usuarioId });
          resultados.sucesso.push(id);
        } catch (err) {
          resultados.falha.push({ id, motivo: err.message });
        }
      }

      return res.status(200).json({
        sucesso: true,
        mensagem: `Anotação adicionada em ${resultados.sucesso.length} cobrança(s)`,
        dados: resultados
      });

    } catch (erro) {
      console.error('[CobrancaMensal] Erro ao anotar em lote:', erro);
      return res.status(500).json({
        sucesso: false,
        mensagem: 'Erro ao adicionar anotações em lote'
      });
    }
  },

  /**
   * GET /api/inadimplentes/cobrancas/estatisticas
   * Obter estatísticas de cobranças
   */
  async obterEstatisticas(req, res) {
    try {
      const estatisticas = await cobrancaService.obterEstatisticas();

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Estatísticas obtidas com sucesso',
        dados: estatisticas
      });

    } catch (erro) {
      console.error('[CobrancaMensal] Erro ao obter estatísticas:', erro);
      return res.status(500).json({
        sucesso: false,
        mensagem: 'Erro ao obter estatísticas'
      });
    }
  }
};
