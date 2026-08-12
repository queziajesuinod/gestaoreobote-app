// server/controllers/whatsapp.js
// Recebe o webhook da Evolution, roda o orquestrador e responde no WhatsApp.

const evolution = require('../services/evolution');
const orquestrador = require('../services/assistente/orquestrador');
const eventos = require('../services/assistente/eventos');

// Dedup simples em memória (Evolution pode reentregar o mesmo messageId).
const idsProcessados = new Set();
const MAX_IDS = 500;
function jaProcessado(id) {
  if (!id) return false;
  if (idsProcessados.has(id)) return true;
  idsProcessados.add(id);
  if (idsProcessados.size > MAX_IDS) {
    // limpa os mais antigos (o Set mantém ordem de inserção)
    const excedente = idsProcessados.size - MAX_IDS;
    let i = 0;
    for (const v of idsProcessados) { if (i++ >= excedente) break; idsProcessados.delete(v); }
  }
  return false;
}

// Processa a mensagem e envia a resposta (roda fora do ciclo de resposta do webhook).
async function processarEEnviar(body, deps = {}) {
  const evo = deps.evolution || evolution;
  const orq = deps.orquestrador || orquestrador;
  const log = deps.eventos || eventos;

  const msg = evo.extrairMensagem(body);
  if (!msg) return { ignorado: 'sem_mensagem' };

  const base = { telefone: msg.numero, pushName: msg.pushName, tipo: msg.tipo, texto: msg.texto };
  const registrar = (resultado, motivo, extra = {}) => {
    // best-effort: não deixa o log derrubar o fluxo
    log.registrarEvento({ ...base, resultado, motivo, ...extra }).catch(() => {});
  };

  if (msg.fromMe) { registrar('ignorado', 'from_me'); return { ignorado: 'from_me' }; }
  if (msg.isGroup) { registrar('ignorado', 'grupo'); return { ignorado: 'grupo' }; }
  if (jaProcessado(msg.messageId)) { registrar('ignorado', 'duplicado'); return { ignorado: 'duplicado' }; }

  // v1: só texto. Áudio entra na v2 (transcrição).
  if (msg.tipo === 'audio') {
    const resposta = 'Por enquanto eu só entendo *texto* 🙏. Em breve vou transcrever áudios!';
    await evo.enviarTexto({ numero: msg.numero, texto: resposta });
    registrar('ignorado', 'audio', { respondeu: true, resposta });
    return { ignorado: 'audio' };
  }
  if (!msg.texto || !msg.texto.trim()) { registrar('ignorado', 'vazio'); return { ignorado: 'vazio' }; }

  let resultado;
  try {
    resultado = await orq.processarMensagem({ telefone: msg.numero, texto: msg.texto });
  } catch (err) {
    registrar('erro', 'excecao', { resposta: err.message });
    throw err;
  }

  // resposta null = ignorar em silêncio (número não cadastrado, sem gatilho, etc.)
  if (resultado && resultado.resposta) {
    await evo.enviarTexto({ numero: msg.numero, texto: resultado.resposta });
    registrar('processado', resultado.motivo || 'respondido', { respondeu: true, resposta: resultado.resposta });
    return { ok: true, respondeu: true };
  }

  registrar('ignorado', resultado?.motivo || 'sem_resposta');
  return { ok: true, respondeu: false };
}

// Handler HTTP do webhook.
async function webhook(req, res) {
  // valida segredo (se configurado) antes de qualquer coisa
  if (!evolution.validarWebhook(req)) {
    return res.status(401).json({ error: 'webhook não autorizado' });
  }

  // responde 200 IMEDIATAMENTE (Evolution espera 200 rápido; processamos em background)
  res.sendStatus(200);

  processarEEnviar(req.body).catch((err) => {
    console.error('❌ Erro processando webhook WhatsApp:', err?.response?.data || err.message);
  });
}

module.exports = { webhook, processarEEnviar, _jaProcessado: jaProcessado };
