// server/services/assistente/auditoria.js
// Registra e consulta as ações do assistente no Agendor (menu de auditoria).

const { Op } = require('sequelize');
const { AssistenteAcao } = require('../../models');

// Grava uma ação. Chamado pelo orquestrador (best-effort: nunca derruba o fluxo).
async function registrarAcao(info = {}) {
  const a = info.acao || {};
  return AssistenteAcao.create({
    consultorId: info.consultorId || null,
    consultorNome: info.consultorNome || null,
    telefone: info.telefone || null,
    clienteNome: info.clienteNome || null,
    dealId: info.dealId || null,
    taskId: a.taskId || null,
    acao: a.tipo || 'desconhecida',
    tarefaTipo: a.tarefaTipo || null,
    detalhe: a
  });
}

// Lista com filtros opcionais: consultorId, cliente (like), tarefaTipo, acao, dataInicio, dataFim.
async function listarAcoes({ consultorId, cliente, tarefaTipo, acao, dataInicio, dataFim, limite = 200, offset = 0 } = {}) {
  const where = {};
  if (consultorId) where.consultorId = consultorId;
  if (tarefaTipo) where.tarefaTipo = tarefaTipo;
  if (acao) where.acao = acao;
  if (cliente) where.clienteNome = { [Op.iLike]: `%${cliente}%` };
  if (dataInicio || dataFim) {
    where.createdAt = {};
    if (dataInicio) where.createdAt[Op.gte] = new Date(dataInicio);
    if (dataFim) where.createdAt[Op.lte] = new Date(dataFim);
  }

  const { rows, count } = await AssistenteAcao.findAndCountAll({
    where,
    order: [['createdAt', 'DESC']],
    limit: Math.min(Number(limite) || 200, 500),
    offset: Number(offset) || 0
  });
  return { total: count, acoes: rows };
}

module.exports = { registrarAcao, listarAcoes };
