'use strict';

const { ConfiguracaoCobranca } = require('../models');

const MODOS_VALIDOS = ['diaria', 'semanal', 'dia_sim_dia_nao'];
const DIAS_SEMANA_PADRAO = [1, 2, 3, 4, 5];
const MILIS_POR_DIA = 24 * 60 * 60 * 1000;

class ConfiguracaoCobrancaService {
  async obterOuCriar() {
    let configuracao = await ConfiguracaoCobranca.findOne({
      order: [['createdAt', 'ASC']]
    });

    if (!configuracao) {
      configuracao = await ConfiguracaoCobranca.create({
        modo: 'diaria',
        diasSemana: DIAS_SEMANA_PADRAO
      });
    }

    return configuracao;
  }

  obterDiasSemanaPadrao() {
    return [...DIAS_SEMANA_PADRAO];
  }

  async atualizar(dados = {}) {
    const configuracao = await this.obterOuCriar();
    const payload = {};

    if (dados.modo && MODOS_VALIDOS.includes(dados.modo)) {
      payload.modo = dados.modo;
    }

    if (Array.isArray(dados.diasSemana)) {
      payload.diasSemana = dados.diasSemana
        .map(Number)
        .filter((dia) => Number.isFinite(dia) && dia >= 0 && dia <= 6);
    }

    if (typeof dados.ativo === 'boolean') {
      payload.ativo = dados.ativo;
    }

    return configuracao.update(payload);
  }

  deveExecutarHoje(configuracao) {
    const modo = configuracao?.modo || 'diaria';
    const hoje = new Date();

    if (modo === 'diaria') {
      return true;
    }

    if (modo === 'semanal') {
      const dias = Array.isArray(configuracao.diasSemana) && configuracao.diasSemana.length
        ? configuracao.diasSemana
        : this.obterDiasSemanaPadrao();

      return dias.includes(hoje.getDay());
    }

    if (modo === 'dia_sim_dia_nao') {
      if (!configuracao.ultimaExecucao) {
        return true;
      }

      const ultima = new Date(configuracao.ultimaExecucao);
      const diferencaDias = Math.floor((hoje - ultima) / MILIS_POR_DIA);
      return diferencaDias >= 2;
    }

    return true;
  }

  async registrarExecucao(configuracao) {
    if (!configuracao) {
      return null;
    }

    return configuracao.update({ ultimaExecucao: new Date() });
  }
}

module.exports = new ConfiguracaoCobrancaService();
