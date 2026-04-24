'use strict';

const configuracaoCobrancaService = require('../services/configuracaocobranca');

module.exports = {
  async obter(req, res) {
    try {
      const configuracao = await configuracaoCobrancaService.obterOuCriar();

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Configuração de cobrança carregada',
        dados: configuracao
      });
    } catch (erro) {
      console.error('[ConfiguracaoCobranca] Erro ao obter configuração:', erro);
      return res.status(500).json({
        sucesso: false,
        mensagem: 'Erro ao carregar configuração de cobrança'
      });
    }
  },

  async atualizar(req, res) {
    try {
      const { modo, diasSemana, ativo } = req.body;
      const configuracao = await configuracaoCobrancaService.atualizar({ modo, diasSemana, ativo });

      return res.status(200).json({
        sucesso: true,
        mensagem: 'Configuração de cobrança atualizada',
        dados: configuracao
      });
    } catch (erro) {
      console.error('[ConfiguracaoCobranca] Erro ao atualizar configuração:', erro);
      return res.status(500).json({
        sucesso: false,
        mensagem: 'Erro ao salvar configuração de cobrança'
      });
    }
  }
};
