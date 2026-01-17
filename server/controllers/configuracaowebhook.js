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
