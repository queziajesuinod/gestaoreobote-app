const webhookService = require('../services/webhook');
const { WebhookLog, ConfiguracaoWebhook } = require('../models');

module.exports = {
  /**
   * POST /api/inadimplentes/webhook/callback
   * Receber callback do sistema externo
   */
  async receberCallback(req, res) {
    try {
      const payload = req.body;
      const assinatura = req.headers['x-webhook-signature'];

      // Validar payload
      if (!payload || !payload.cobranca_id) {
        return res.status(400).json({
          sucesso: false,
          mensagem: 'Payload inválido. Campo obrigatório: cobranca_id'
        });
      }

      // Processar callback
      const resultado = await webhookService.processarCallback(payload, assinatura);

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Callback processado com sucesso',
        dados: resultado
      });

    } catch (erro) {
      console.error('[Webhook] Erro ao processar callback:', erro);
      return res.status(400).json({
        sucesso: false,
        mensagem: erro.message || 'Erro ao processar callback'
      });
    }
  },

  /**
   * GET /api/inadimplentes/webhooks/logs
   * Listar logs de webhooks
   */
  async listarLogs(req, res) {
    try {
      const { tipo, sucesso, cobrancaMensalId, limit = 100 } = req.query;

      const where = {};
      if (tipo) where.tipo = tipo;
      if (sucesso !== undefined) where.sucesso = sucesso === 'true';
      if (cobrancaMensalId) where.cobrancaMensalId = cobrancaMensalId;

      const logs = await WebhookLog.findAll({
        where,
        include: [
          {
            association: 'cobrancaMensal',
            include: [
              {
                association: 'processoCobranca',
                include: [
                  {
                    association: 'cota',
                    include: [
                      { association: 'cliente' }
                    ]
                  }
                ]
              }
            ]
          }
        ],
        order: [['createdAt', 'DESC']],
        limit: parseInt(limit)
      });

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Logs listados com sucesso',
        dados: logs
      });

    } catch (erro) {
      console.error('[Webhook] Erro ao listar logs:', erro);
      return res.status(500).json({
        sucesso: false,
        mensagem: 'Erro ao listar logs'
      });
    }
  },

  /**
   * GET /api/inadimplentes/webhooks/logs/:id
   * Buscar log específico
   */
  async buscarLogPorId(req, res) {
    try {
      const { id } = req.params;

      const log = await WebhookLog.findByPk(id, {
        include: [
          {
            association: 'cobrancaMensal',
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
          }
        ]
      });

      if (!log) {
        return res.status(404).json({
          sucesso: false,
          mensagem: 'Log não encontrado'
        });
      }

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Log encontrado',
        dados: log
      });

    } catch (erro) {
      console.error('[Webhook] Erro ao buscar log:', erro);
      return res.status(500).json({
        sucesso: false,
        mensagem: 'Erro ao buscar log'
      });
    }
  },

  /**
   * GET /api/inadimplentes/webhooks/estatisticas
   * Estatísticas de webhooks
   */
  async obterEstatisticas(req, res) {
    try {
      const { Op } = require('sequelize');
      const hoje = new Date();
      const inicioHoje = new Date(hoje.setHours(0, 0, 0, 0));
      const fimHoje = new Date(hoje.setHours(23, 59, 59, 999));

      // Total de webhooks enviados hoje
      const totalEnviadosHoje = await WebhookLog.count({
        where: {
          tipo: 'saida',
          createdAt: {
            [Op.between]: [inicioHoje, fimHoje]
          }
        }
      });

      // Total de webhooks com sucesso hoje
      const totalSucessoHoje = await WebhookLog.count({
        where: {
          tipo: 'saida',
          sucesso: true,
          createdAt: {
            [Op.between]: [inicioHoje, fimHoje]
          }
        }
      });

      // Total de webhooks com falha hoje
      const totalFalhaHoje = totalEnviadosHoje - totalSucessoHoje;

      // Taxa de sucesso
      const taxaSucesso = totalEnviadosHoje > 0
        ? ((totalSucessoHoje / totalEnviadosHoje) * 100).toFixed(2)
        : 0;

      // Tempo médio de resposta
      const logsComTempo = await WebhookLog.findAll({
        where: {
          tipo: 'saida',
          sucesso: true,
          tempoResposta: {
            [Op.not]: null
          },
          createdAt: {
            [Op.between]: [inicioHoje, fimHoje]
          }
        },
        attributes: ['tempoResposta']
      });

      let tempoMedioResposta = 0;
      if (logsComTempo.length > 0) {
        const somaTempo = logsComTempo.reduce((total, log) => total + log.tempoResposta, 0);
        tempoMedioResposta = Math.round(somaTempo / logsComTempo.length);
      }

      // Total de callbacks recebidos hoje
      const totalCallbacksHoje = await WebhookLog.count({
        where: {
          tipo: 'entrada',
          createdAt: {
            [Op.between]: [inicioHoje, fimHoje]
          }
        }
      });

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Estatísticas obtidas com sucesso',
        dados: {
          totalEnviadosHoje,
          totalSucessoHoje,
          totalFalhaHoje,
          taxaSucesso: parseFloat(taxaSucesso),
          tempoMedioResposta,
          totalCallbacksHoje
        }
      });

    } catch (erro) {
      console.error('[Webhook] Erro ao obter estatísticas:', erro);
      return res.status(500).json({
        sucesso: false,
        mensagem: 'Erro ao obter estatísticas'
      });
    }
  }
};
