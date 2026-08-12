// server/controllers/assistente.js
const auditoria = require('../services/assistente/auditoria');
const eventosService = require('../services/assistente/eventos');
const evolution = require('../services/evolution');

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

// GET /assistente/status → conexão da Evolution + o que está configurado
async function getStatus(req, res) {
  try {
    const [conexao, config] = await Promise.all([
      evolution.estadoConexao(),
      Promise.resolve(evolution.resumoConfig())
    ]);
    res.json({ conexao, config });
  } catch (error) {
    console.error('Erro em getStatus:', error.message);
    res.status(500).json({ error: 'Erro ao consultar status do assistente' });
  }
}

// GET /assistente/eventos?limite= → últimos eventos recebidos pelo webhook
async function getEventos(req, res) {
  try {
    const { limite } = req.query;
    const resultado = await eventosService.listarEventos({ limite: limite ? Number(limite) : undefined });
    res.json(resultado);
  } catch (error) {
    console.error('Erro em getEventos:', error.message);
    res.status(500).json({ error: 'Erro ao buscar eventos do assistente' });
  }
}

module.exports = { getAuditoria, getStatus, getEventos };
