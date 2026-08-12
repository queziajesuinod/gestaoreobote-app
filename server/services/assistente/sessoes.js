// server/services/assistente/sessoes.js
// Persistência do estado da conversa do assistente (tabela assistente_sessoes).

const { Op } = require('sequelize');
const { AssistenteSessao } = require('../../models');

// Estados possíveis da sessão.
const STATUS = {
  AGUARDANDO_NOME: 'aguardando_nome',            // pedimos o nome do cliente
  AGUARDANDO_CLIENTE: 'aguardando_cliente',      // nome ambíguo, escolher candidato
  AGUARDANDO_CRIAR_CLIENTE: 'aguardando_criar_cliente', // não achou, criar?
  AGUARDANDO_CONFIRMACAO: 'aguardando_confirmacao', // confirmar antes de gravar
  CONCLUIDO: 'concluido',
  CANCELADO: 'cancelado'
};

const STATUS_ABERTOS = [
  STATUS.AGUARDANDO_NOME,
  STATUS.AGUARDANDO_CLIENTE,
  STATUS.AGUARDANDO_CRIAR_CLIENTE,
  STATUS.AGUARDANDO_CONFIRMACAO
];

const HORAS_EXPIRACAO = Number(process.env.ASSISTENTE_SESSAO_HORAS || 6);

function calcExpiracao(agora = new Date()) {
  return new Date(agora.getTime() + HORAS_EXPIRACAO * 3600 * 1000);
}

// Busca a sessão ABERTA (não expirada) de um telefone, se houver.
async function buscarAberta(telefone, agora = new Date()) {
  return AssistenteSessao.findOne({
    where: {
      telefone,
      status: { [Op.in]: STATUS_ABERTOS },
      expiresAt: { [Op.gt]: agora }
    },
    order: [['createdAt', 'DESC']]
  });
}

async function criar({ telefone, consultorId, status, payload, candidatos, mensagemOriginal }, agora = new Date()) {
  return AssistenteSessao.create({
    telefone,
    consultorId: consultorId || null,
    status,
    payload: payload || null,
    candidatos: candidatos || null,
    mensagemOriginal: mensagemOriginal || null,
    expiresAt: calcExpiracao(agora)
  });
}

async function atualizar(sessao, campos, agora = new Date()) {
  const patch = { ...campos };
  // renova a expiração a cada interação
  if (!patch.expiresAt && STATUS_ABERTOS.includes(patch.status || sessao.status)) {
    patch.expiresAt = calcExpiracao(agora);
  }
  return sessao.update(patch);
}

async function encerrar(sessao, status = STATUS.CONCLUIDO) {
  return sessao.update({ status });
}

module.exports = {
  STATUS,
  STATUS_ABERTOS,
  buscarAberta,
  criar,
  atualizar,
  encerrar,
  calcExpiracao
};
