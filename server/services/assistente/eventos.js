// server/services/assistente/eventos.js
// Log de eventos recebidos pelo webhook do WhatsApp (para o console de status/debug).

const { AssistenteEvento } = require('../../models');

async function registrarEvento({ telefone, pushName, tipo, texto, resultado, motivo, respondeu, resposta } = {}) {
  return AssistenteEvento.create({
    telefone: telefone || null,
    pushName: pushName || null,
    tipo: tipo || null,
    texto: texto ? String(texto).slice(0, 500) : null,
    resultado: resultado || 'ignorado',
    motivo: motivo || null,
    respondeu: Boolean(respondeu),
    resposta: resposta ? String(resposta).slice(0, 1000) : null
  });
}

async function listarEventos({ limite = 50 } = {}) {
  const { rows, count } = await AssistenteEvento.findAndCountAll({
    order: [['createdAt', 'DESC']],
    limit: Math.min(Number(limite) || 50, 200)
  });
  return { total: count, eventos: rows };
}

module.exports = { registrarEvento, listarEventos };
