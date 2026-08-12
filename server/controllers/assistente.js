// server/controllers/assistente.js
const auditoria = require('../services/assistente/auditoria');

// GET /assistente/auditoria?consultorId=&cliente=&tarefaTipo=&acao=&dataInicio=&dataFim=&limite=&offset=
async function getAuditoria(req, res) {
  try {
    const { consultorId, cliente, tarefaTipo, acao, dataInicio, dataFim, limite, offset } = req.query;
    const resultado = await auditoria.listarAcoes({
      consultorId: consultorId ? Number(consultorId) : undefined,
      cliente: cliente || undefined,
      tarefaTipo: tarefaTipo || undefined,
      acao: acao || undefined,
      dataInicio: dataInicio || undefined,
      dataFim: dataFim || undefined,
      limite: limite ? Number(limite) : undefined,
      offset: offset ? Number(offset) : undefined
    });
    res.json(resultado);
  } catch (error) {
    console.error('Erro em getAuditoria:', error.message);
    res.status(500).json({ error: 'Erro ao buscar auditoria do assistente' });
  }
}

module.exports = { getAuditoria };
