const { ConfiguracaoWebhook } = require('../models');

module.exports = {
  /**
   * POST /api/inadimplentes/configuracoes/webhook
   * Criar configuração de webhook
   */
  async criar(req, res) {
    try {
      const {
        nome,
        url,
        metodo,
        headers,
        secretKey,
        ativo,
        maxTentativas,
        timeout
      } = req.body;

      // Validações
      if (!nome || !url) {
        return res.status(400).json({
          sucesso: false,
          mensagem: 'Campos obrigatórios: nome, url'
        });
      }

      // Validar URL
      try {
        new URL(url);
      } catch (erro) {
        return res.status(400).json({
          sucesso: false,
          mensagem: 'URL inválida'
        });
      }

      // Criar configuração
      const configuracao = await ConfiguracaoWebhook.create({
        nome,
        url,
        metodo: metodo || 'POST',
        headers: headers || {},
        secretKey,
        ativo: ativo !== undefined ? ativo : true,
        maxTentativas: maxTentativas || 4,
        timeout: timeout || 30000
      });

      return res.status(201).json({
        sucesso: true,
        mensagem: 'Configuração criada com sucesso',
        dados: configuracao
      });

    } catch (erro) {
      console.error('[ConfiguracaoWebhook] Erro ao criar:', erro);
      return res.status(500).json({
        sucesso: false,
        mensagem: 'Erro ao criar configuração'
      });
    }
  },

  /**
   * GET /api/inadimplentes/configuracoes/webhook
   * Listar configurações de webhook
   */
  async listar(req, res) {
    try {
      const configuracoes = await ConfiguracaoWebhook.findAll({
        order: [['createdAt', 'DESC']]
      });

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Configurações listadas com sucesso',
        dados: configuracoes
      });

    } catch (erro) {
      console.error('[ConfiguracaoWebhook] Erro ao listar:', erro);
      return res.status(500).json({
        sucesso: false,
        mensagem: 'Erro ao listar configurações'
      });
    }
  },

  /**
   * GET /api/inadimplentes/configuracoes/webhook/ativa
   * Obter configuração ativa
   */
  async obterAtiva(req, res) {
    try {
      const configuracao = await ConfiguracaoWebhook.findOne({
        where: { ativo: true }
      });

      if (!configuracao) {
        return res.status(404).json({
          sucesso: false,
          mensagem: 'Nenhuma configuração ativa encontrada'
        });
      }

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Configuração ativa encontrada',
        dados: configuracao
      });

    } catch (erro) {
      console.error('[ConfiguracaoWebhook] Erro ao obter ativa:', erro);
      return res.status(500).json({
        sucesso: false,
        mensagem: 'Erro ao obter configuração ativa'
      });
    }
  },

  /**
   * GET /api/inadimplentes/configuracoes/webhook/:id
   * Buscar configuração específica
   */
  async buscarPorId(req, res) {
    try {
      const { id } = req.params;

      const configuracao = await ConfiguracaoWebhook.findByPk(id);

      if (!configuracao) {
        return res.status(404).json({
          sucesso: false,
          mensagem: 'Configuração não encontrada'
        });
      }

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Configuração encontrada',
        dados: configuracao
      });

    } catch (erro) {
      console.error('[ConfiguracaoWebhook] Erro ao buscar:', erro);
      return res.status(500).json({
        sucesso: false,
        mensagem: 'Erro ao buscar configuração'
      });
    }
  },

  /**
   * PUT /api/inadimplentes/configuracoes/webhook/:id
   * Atualizar configuração de webhook
   */
  async atualizar(req, res) {
    try {
      const { id } = req.params;
      const {
        nome,
        url,
        metodo,
        headers,
        secretKey,
        ativo,
        maxTentativas,
        timeout
      } = req.body;

      const configuracao = await ConfiguracaoWebhook.findByPk(id);
      if (!configuracao) {
        return res.status(404).json({
          sucesso: false,
          mensagem: 'Configuração não encontrada'
        });
      }

      // Validar URL se fornecida
      if (url) {
        try {
          new URL(url);
        } catch (erro) {
          return res.status(400).json({
            sucesso: false,
            mensagem: 'URL inválida'
          });
        }
      }

      // Atualizar campos
      const dadosAtualizacao = {};
      if (nome !== undefined) dadosAtualizacao.nome = nome;
      if (url !== undefined) dadosAtualizacao.url = url;
      if (metodo !== undefined) dadosAtualizacao.metodo = metodo;
      if (headers !== undefined) dadosAtualizacao.headers = headers;
      if (secretKey !== undefined) dadosAtualizacao.secretKey = secretKey;
      if (ativo !== undefined) dadosAtualizacao.ativo = ativo;
      if (maxTentativas !== undefined) dadosAtualizacao.maxTentativas = maxTentativas;
      if (timeout !== undefined) dadosAtualizacao.timeout = timeout;

      await configuracao.update(dadosAtualizacao);

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Configuração atualizada com sucesso',
        dados: configuracao
      });

    } catch (erro) {
      console.error('[ConfiguracaoWebhook] Erro ao atualizar:', erro);
      return res.status(500).json({
        sucesso: false,
        mensagem: 'Erro ao atualizar configuração'
      });
    }
  },

  /**
   * DELETE /api/inadimplentes/configuracoes/webhook/:id
   * Excluir configuração de webhook
   */
  async excluir(req, res) {
    try {
      const { id } = req.params;

      const configuracao = await ConfiguracaoWebhook.findByPk(id);
      if (!configuracao) {
        return res.status(404).json({
          sucesso: false,
          mensagem: 'Configuração não encontrada'
        });
      }

      await configuracao.destroy();

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Configuração excluída com sucesso'
      });

    } catch (erro) {
      console.error('[ConfiguracaoWebhook] Erro ao excluir:', erro);
      return res.status(500).json({
        sucesso: false,
        mensagem: 'Erro ao excluir configuração'
      });
    }
  },

  /**
   * POST /api/inadimplentes/configuracoes/webhook/:id/ativar
   * Ativar configuração (desativa outras)
   */
  async ativar(req, res) {
    try {
      const { id } = req.params;

      const configuracao = await ConfiguracaoWebhook.findByPk(id);
      if (!configuracao) {
        return res.status(404).json({
          sucesso: false,
          mensagem: 'Configuração não encontrada'
        });
      }

      // Desativar todas as outras configurações
      await ConfiguracaoWebhook.update(
        { ativo: false },
        { where: {} }
      );

      // Ativar esta configuração
      await configuracao.update({ ativo: true });

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Configuração ativada com sucesso',
        dados: configuracao
      });

    } catch (erro) {
      console.error('[ConfiguracaoWebhook] Erro ao ativar:', erro);
      return res.status(500).json({
        sucesso: false,
        mensagem: 'Erro ao ativar configuração'
      });
    }
  },

  /**
   * POST /api/inadimplentes/configuracoes/webhook/:id/desativar
   * Desativar configuração
   */
  async desativar(req, res) {
    try {
      const { id } = req.params;

      const configuracao = await ConfiguracaoWebhook.findByPk(id);
      if (!configuracao) {
        return res.status(404).json({
          sucesso: false,
          mensagem: 'Configuração não encontrada'
        });
      }

      await configuracao.update({ ativo: false });

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Configuração desativada com sucesso',
        dados: configuracao
      });

    } catch (erro) {
      console.error('[ConfiguracaoWebhook] Erro ao desativar:', erro);
      return res.status(500).json({
        sucesso: false,
        mensagem: 'Erro ao desativar configuração'
      });
    }
  }
};
,

  /**
   * POST /api/inadimplentes/configuracoes/webhook/testar
   * Testar webhook enviando payload de exemplo
   */
  async testar(req, res) {
    try {
      console.log('[Webhook Teste] Iniciando teste de webhook...');
      
      const configuracao = await ConfiguracaoWebhook.findOne({
        where: { ativo: true }
      });
      
      console.log('[Webhook Teste] Configuração encontrada:', {
        id: configuracao?.id,
        nome: configuracao?.nome,
        url: configuracao?.url,
        ativo: configuracao?.ativo
      });

      if (!configuracao) {
        return res.status(404).json({
          sucesso: false,
          mensagem: 'Nenhuma configuração ativa encontrada'
        });
      }

      // Payload de teste
      const payloadTeste = {
        evento: 'webhook_teste',
        timestamp: new Date().toISOString(),
        mensagem: 'Este é um webhook de teste do sistema Reobote',
        dados: {
          teste: true,
          configuracao: {
            nome: configuracao.nome,
            url: configuracao.url
          }
        }
      };

      // Gerar assinatura
      const crypto = require('crypto');
      const hmac = crypto.createHmac('sha256', configuracao.secretKey || '');
      hmac.update(JSON.stringify(payloadTeste));
      const assinatura = 'sha256=' + hmac.digest('hex');

      console.log('[Webhook Teste] Payload:', JSON.stringify(payloadTeste, null, 2));
      console.log('[Webhook Teste] Assinatura:', assinatura);
      console.log('[Webhook Teste] URL destino:', configuracao.url);
      
      // Enviar webhook
      const axios = require('axios');
      const inicio = Date.now();

      try {
        console.log('[Webhook Teste] Enviando requisição...');
        
        const response = await axios({
          method: configuracao.metodo || 'POST',
          url: configuracao.url,
          data: payloadTeste,
          headers: {
            'Content-Type': 'application/json',
            'X-Webhook-Signature': assinatura,
            'X-Webhook-Event': 'webhook_teste',
            'X-Webhook-ID': crypto.randomUUID(),
            'X-Webhook-Timestamp': new Date().toISOString()
          },
          timeout: configuracao.timeout || 30000
        });

        const tempoResposta = Date.now() - inicio;
        
        console.log('[Webhook Teste] Resposta recebida:', {
          status: response.status,
          tempoResposta,
          data: response.data
        });

        // Registrar log
        const { WebhookLog } = require('../models');
        await WebhookLog.create({
          cobrancaMensalId: null,
          tipo: 'teste',
          url: configuracao.url,
          payload: payloadTeste,
          statusCode: response.status,
          resposta: response.data,
          tentativa: 1,
          sucesso: true,
          tempoResposta
        });

        return res.status(200).json({
          sucesso: true,
          mensagem: 'Webhook de teste enviado com sucesso',
          dados: {
            statusCode: response.status,
            tempoResposta,
            resposta: response.data
          }
        });

      } catch (erroEnvio) {
        const tempoResposta = Date.now() - inicio;
        
        console.error('[Webhook Teste] Erro ao enviar:', {
          mensagem: erroEnvio.message,
          code: erroEnvio.code,
          status: erroEnvio.response?.status,
          data: erroEnvio.response?.data
        });

        // Registrar log de erro
        const { WebhookLog } = require('../models');
        await WebhookLog.create({
          cobrancaMensalId: null,
          tipo: 'teste',
          url: configuracao.url,
          payload: payloadTeste,
          statusCode: erroEnvio.response?.status,
          resposta: erroEnvio.response?.data,
          erro: erroEnvio.message,
          tentativa: 1,
          sucesso: false,
          tempoResposta
        });

        return res.status(200).json({
          sucesso: false,
          mensagem: 'Erro ao enviar webhook de teste',
          erro: erroEnvio.message,
          dados: {
            statusCode: erroEnvio.response?.status,
            tempoResposta,
            resposta: erroEnvio.response?.data
          }
        });
      }

    } catch (erro) {
      console.error('[ConfiguracaoWebhook] Erro ao testar:', erro);
      return res.status(500).json({
        sucesso: false,
        mensagem: 'Erro ao testar webhook',
        erro: erro.message
      });
    }
  }
};
