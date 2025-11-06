const { Op } = require('sequelize');
const { Meta } = require('../models');

function formatDateOnly(date) {
  return date.toISOString().slice(0, 10);
}

function obterPrimeiroDiaProximoMes(baseDate = new Date()) {
  const ano = baseDate.getUTCFullYear();
  const mes = baseDate.getUTCMonth();
  return new Date(Date.UTC(ano, mes + 1, 1));
}

function obterUltimoDiaMes(date) {
  const ano = date.getUTCFullYear();
  const mes = date.getUTCMonth();
  return new Date(Date.UTC(ano, mes + 1, 0));
}

async function garantirMetaProximoMes(baseDate = new Date()) {
  const inicioProximoMes = obterPrimeiroDiaProximoMes(baseDate);
  const fimProximoMes = obterUltimoDiaMes(inicioProximoMes);

  const inicioISO = formatDateOnly(inicioProximoMes);
  const fimISO = formatDateOnly(fimProximoMes);

  const metaExistente = await Meta.findOne({
    where: {
      dataInicio: {
        [Op.gte]: inicioISO,
        [Op.lte]: fimISO
      }
    },
    order: [['dataInicio', 'ASC'], ['createdAt', 'DESC']]
  });

  if (metaExistente) {
    return metaExistente;
  }

  const metaReferencia = await Meta.findOne({
    where: {
      dataInicio: { [Op.lt]: inicioISO }
    },
    order: [['dataInicio', 'DESC'], ['createdAt', 'DESC']]
  });

  if (!metaReferencia) {
    return null;
  }

  const novaMeta = await Meta.create({
    descricao: metaReferencia.descricao || null,
    valor: metaReferencia.valor,
    dataInicio: inicioISO,
    dataFim: fimISO
  });

  return novaMeta;
}

function toNumber(valor) {
  if (valor === null || valor === undefined || valor === '') return null;
  const numero = Number(valor);
  if (Number.isNaN(numero)) {
    throw new Error('Valor da meta inválido.');
  }
  return numero;
}

async function listarMetas() {
  await garantirMetaProximoMes();
  return Meta.findAll({
    order: [['dataInicio', 'DESC'], ['createdAt', 'DESC']]
  });
}

async function criarMeta(body) {
  const valor = toNumber(body.valor);
  if (valor === null) {
    throw new Error('Valor da meta é obrigatório.');
  }
  if (!body.dataInicio) {
    throw new Error('Data de início é obrigatória.');
  }

  const payload = {
    descricao: body.descricao || null,
    valor,
    dataInicio: body.dataInicio,
    dataFim: body.dataFim || null
  };

  return Meta.create(payload);
}

async function atualizarMeta(id, body) {
  const meta = await Meta.findByPk(id);
  if (!meta) {
    throw new Error('Meta não encontrada.');
  }

  const payload = {};

  if (Object.prototype.hasOwnProperty.call(body, 'descricao')) {
    payload.descricao = body.descricao || null;
  }

  if (Object.prototype.hasOwnProperty.call(body, 'valor')) {
    payload.valor = toNumber(body.valor);
    if (payload.valor === null) {
      throw new Error('Valor da meta é obrigatório.');
    }
  }

  if (Object.prototype.hasOwnProperty.call(body, 'dataInicio')) {
    if (!body.dataInicio) {
      throw new Error('Data de início é obrigatória.');
    }
    payload.dataInicio = body.dataInicio;
  }

  if (Object.prototype.hasOwnProperty.call(body, 'dataFim')) {
    payload.dataFim = body.dataFim || null;
  }

  await meta.update(payload);
  return meta;
}

async function deletarMeta(id) {
  const meta = await Meta.findByPk(id);
  if (!meta) {
    throw new Error('Meta não encontrada.');
  }

  await meta.destroy();
  return { mensagem: 'Meta removida com sucesso' };
}

async function buscarMetaPorReferencia(dataInicio, dataFim) {
  if (!dataInicio) {
    throw new Error('dataInicio é obrigatório');
  }

  await garantirMetaProximoMes();

  const fimReferencia = dataFim || dataInicio;

  const meta = await Meta.findOne({
    where: {
      dataInicio: { [Op.lte]: fimReferencia },
      [Op.or]: [
        { dataFim: null },
        { dataFim: { [Op.gte]: dataInicio } }
      ]
    },
    order: [['dataInicio', 'DESC'], ['createdAt', 'DESC']]
  });

  return meta;
}



module.exports = {
  listarMetas,
  criarMeta,
  atualizarMeta,
  deletarMeta,
  buscarMetaPorReferencia,
  garantirMetaProximoMes
};
