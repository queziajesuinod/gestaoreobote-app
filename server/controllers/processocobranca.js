const cobrancaService = require('../services/cobranca');
const {
  ProcessoCobranca,
  Cota,
  Cliente,
  CobrancaMensal,
  NotificacaoCobranca
} = require('../models');

module.exports = {
  /**
   * POST /api/inadimplentes/processos
   * Criar novo processo de cobrança
   */
  async criar(req, res) {
    try {
      const {
        cotaId,
        diaVencimento,
        dataInicioCobranca,
        historicoRetroativo,
        observacao,
        quantidadeMeses,
        nome,
        cotas
      } = req.body;

      const temMultiplasCotas = Array.isArray(cotas) && cotas.length > 0;

      if (!temMultiplasCotas) {
        // Validações LEGADO (processo de cota única)
        if (!cotaId || !diaVencimento || !dataInicioCobranca) {
          return res.status(400).json({
            sucesso: false,
            mensagem: 'Campos obrigatórios: cotaId, diaVencimento e dataInicioCobranca'
          });
        }

        if (diaVencimento < 1 || diaVencimento > 31) {
          return res.status(400).json({
            sucesso: false,
            mensagem: 'Dia de vencimento deve estar entre 1 e 31'
          });
        }

        let quantidadeMesesValidos = null;
        if (quantidadeMeses !== undefined && quantidadeMeses !== null && quantidadeMeses !== '') {
          const meses = Number(quantidadeMeses);
          if (!Number.isFinite(meses) || meses < 1) {
            return res.status(400).json({
              sucesso: false,
              mensagem: 'Quantidade de meses inválida'
            });
          }
          quantidadeMesesValidos = Math.floor(meses);
        }

        // Criar processo
        const processo = await cobrancaService.criarProcessoCobranca({
          cotaId,
          diaVencimento,
          dataInicioCobranca,
          historicoRetroativo,
          quantidadeMeses: quantidadeMesesValidos
        });

        // Adicionar observação se fornecida
        if (observacao) {
          await processo.update({ observacao });
        }

        const processoCompleto = await ProcessoCobranca.findByPk(processo.id, {
          include: [
            {
              association: 'cota',
              include: [
                { association: 'cliente' },
                { association: 'consultor' }
              ]
            }
          ]
        });

        return res.status(201).json({
          sucesso: true,
          mensagem: 'Processo de cobrança criado com sucesso',
          dados: processoCompleto
        });
      }

      // Processo multiplas cotas
      const cotasValidadas = cotas.map((item, index) => {
        if (!item.cotaId || !item.diaVencimento || !item.dataInicioCobranca) {
          const campo = !item.cotaId ? 'cotaId' : !item.diaVencimento ? 'diaVencimento' : 'dataInicioCobranca';
          throw new Error(`Cota #${index + 1} está sem o campo obrigatório ${campo}`);
        }
        return {
          cotaId: item.cotaId,
          valor: item.valor,
          diaVencimento: item.diaVencimento,
          quantidadeMeses: item.quantidadeMeses === '' ? null : item.quantidadeMeses,
          mesesPagosRetroativo: Number(item.mesesPagosRetroativo) || 0,
          dataInicioCobranca: item.dataInicioCobranca,
          observacao: item.observacao || ''
        };
      });

      const processo = await cobrancaService.criarProcessoCobranca({
        nome,
        cotas: cotasValidadas
      });

      const processoCompleto = await ProcessoCobranca.findByPk(processo.id, {
        include: [
          {
            association: 'cotasProcesso',
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

      return res.status(201).json({
        sucesso: true,
        mensagem: 'Processo de cobrança criado com sucesso',
        dados: processoCompleto
      });


    } catch (erro) {
      console.error('[ProcessoCobranca] Erro ao criar:', erro);
      return res.status(500).json({
        sucesso: false,
        mensagem: erro.message || 'Erro ao criar processo de cobrança'
      });
    }
  },

  /**
   * GET /api/inadimplentes/processos
   * Listar processos de cobrança
   */
  async listar(req, res) {
    try {
      const { status, cotaId, clienteId, consultorId, diaVencimento } = req.query;

  const perfilUsuario = (req.user?.perfil || '').toUpperCase();
      const ehAdminOuMaster = ['ADMIN', 'MASTER'].includes(perfilUsuario);
      const isConsultorPerfil = perfilUsuario === 'CONSULTOR';
      const podeSelecionarConsultor = ehAdminOuMaster || perfilUsuario === 'GESTOR';
      const consultorLogadoId = req.user?.consultorId || null;
      let filtroConsultor = null;
      if (isConsultorPerfil && consultorLogadoId) {
        filtroConsultor = consultorLogadoId;
      } else if (podeSelecionarConsultor && consultorId) {
        filtroConsultor = consultorId;
      }

      const where = {};
      if (status) where.status = status;
      if (cotaId) where.cotaId = cotaId;
      if (diaVencimento) {
        const dia = Number(diaVencimento);
        if (!Number.isNaN(dia)) {
          where.diaVencimento = dia;
        }
      }

      const includeCliente = { association: 'cliente' };
      if (clienteId) {
        includeCliente.where = { id: clienteId };
        includeCliente.required = true;
      }

      const includeConsultor = { association: 'consultor' };
      if (filtroConsultor) {
        includeConsultor.where = { id: filtroConsultor };
        includeConsultor.required = true;
      }

      const processos = await ProcessoCobranca.findAll({
        where,
        include: [
          {
            association: 'cota',
            include: [
              includeCliente,
              includeConsultor
            ]
          }
        ],
        order: [['createdAt', 'DESC']]
      });

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Processos listados com sucesso',
        dados: processos
      });

    } catch (erro) {
      console.error('[ProcessoCobranca] Erro ao listar:', erro);
      return res.status(500).json({
        sucesso: false,
        mensagem: 'Erro ao listar processos de cobrança'
      });
    }
  },

  /**
   * GET /api/inadimplentes/processos/:id
   * Buscar processo específico
   */
  async buscarPorId(req, res) {
    try {
      const { id } = req.params;

      const processo = await ProcessoCobranca.findByPk(id, {
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
            order: [['mesReferencia', 'DESC']],
            limit: 12 // Últimos 12 meses
          }
        ]
      });

      if (!processo) {
        return res.status(404).json({
          sucesso: false,
          mensagem: 'Processo não encontrado'
        });
      }

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Processo encontrado',
        dados: processo
      });

    } catch (erro) {
      console.error('[ProcessoCobranca] Erro ao buscar:', erro);
      return res.status(500).json({
        sucesso: false,
        mensagem: 'Erro ao buscar processo'
      });
    }
  },

  /**
   * PUT /api/inadimplentes/processos/:id
   * Atualizar processo de cobrança
   */
  async atualizar(req, res) {
    try {
      const { id } = req.params;
      const { diaVencimento, observacao, quantidadeMeses } = req.body;

      const processo = await ProcessoCobranca.findByPk(id);
      if (!processo) {
        return res.status(404).json({
          sucesso: false,
          mensagem: 'Processo não encontrado'
        });
      }

      // Validar dia de vencimento
      if (diaVencimento && (diaVencimento < 1 || diaVencimento > 31)) {
        return res.status(400).json({
          sucesso: false,
          mensagem: 'Dia de vencimento deve estar entre 1 e 31'
        });
      }

      // Atualizar campos
      const dadosAtualizacao = {};
      if (diaVencimento !== undefined) dadosAtualizacao.diaVencimento = diaVencimento;
      if (observacao !== undefined) dadosAtualizacao.observacao = observacao;
      if (quantidadeMeses !== undefined) {
        if (quantidadeMeses === null || quantidadeMeses === '') {
          dadosAtualizacao.quantidadeMeses = null;
        } else {
          const meses = Number(quantidadeMeses);
          if (!Number.isFinite(meses) || meses < 1) {
            return res.status(400).json({
              sucesso: false,
              mensagem: 'Quantidade de meses inválida'
            });
          }
          dadosAtualizacao.quantidadeMeses = Math.floor(meses);
        }
      }

      await processo.update(dadosAtualizacao);

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Processo atualizado com sucesso',
        dados: processo
      });

    } catch (erro) {
      console.error('[ProcessoCobranca] Erro ao atualizar:', erro);
      return res.status(500).json({
        sucesso: false,
        mensagem: 'Erro ao atualizar processo'
      });
    }
  },

  /**
   * DELETE /api/inadimplentes/processos/:id
   * Excluir processo de cobrança
   */
  async excluir(req, res) {
    try {
      const { id } = req.params;

      const processo = await ProcessoCobranca.findByPk(id);
      if (!processo) {
        return res.status(404).json({
          sucesso: false,
          mensagem: 'Processo não encontrado'
        });
      }

      const transaction = await ProcessoCobranca.sequelize.transaction();

      try {
        const cobrancas = await CobrancaMensal.findAll({
          where: { processoCobrancaId: id },
          transaction
        });

        if (cobrancas.length > 0) {
          const cobrancaIds = cobrancas.map((c) => c.id);
          await NotificacaoCobranca.destroy({
            where: { cobrancaMensalId: cobrancaIds },
            transaction
          });
          await CobrancaMensal.destroy({
            where: { id: cobrancaIds },
            transaction
          });
        }

        await processo.destroy({ transaction });
        await transaction.commit();
      } catch (erroInterno) {
        await transaction.rollback();
        throw erroInterno;
      }

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Processo excluído com sucesso'
      });

    } catch (erro) {
      console.error('[ProcessoCobranca] Erro ao excluir:', erro);
      return res.status(500).json({
        sucesso: false,
        mensagem: 'Erro ao excluir processo'
      });
    }
  },

  /**
   * POST /api/inadimplentes/processos/:id/pausar
   * Pausar processo de cobrança
   */
  async pausar(req, res) {
    try {
      const { id } = req.params;

      const processo = await cobrancaService.pausarProcesso(id);

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Processo pausado com sucesso',
        dados: processo
      });

    } catch (erro) {
      console.error('[ProcessoCobranca] Erro ao pausar:', erro);
      return res.status(500).json({
        sucesso: false,
        mensagem: erro.message || 'Erro ao pausar processo'
      });
    }
  },

  /**
   * POST /api/inadimplentes/processos/:id/reativar
   * Reativar processo de cobrança
   */
  async reativar(req, res) {
    try {
      const { id } = req.params;

      const processo = await cobrancaService.reativarProcesso(id);

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Processo reativado com sucesso',
        dados: processo
      });

    } catch (erro) {
      console.error('[ProcessoCobranca] Erro ao reativar:', erro);
      return res.status(500).json({
        sucesso: false,
        mensagem: erro.message || 'Erro ao reativar processo'
      });
    }
  },

  /**
   * POST /api/inadimplentes/processos/:id/encerrar
   * Encerrar processo de cobrança
   */
  async encerrar(req, res) {
    try {
      const { id } = req.params;

      const processo = await cobrancaService.encerrarProcesso(id);

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Processo encerrado com sucesso',
        dados: processo
      });

    } catch (erro) {
      console.error('[ProcessoCobranca] Erro ao encerrar:', erro);
      return res.status(500).json({
        sucesso: false,
        mensagem: erro.message || 'Erro ao encerrar processo'
      });
    }
  }
};
