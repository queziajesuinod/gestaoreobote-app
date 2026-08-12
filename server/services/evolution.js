// server/services/evolution.js
// Integração com a Evolution API (WhatsApp): envio de mensagens + parsing do webhook.
// Config via .env:
//   EVOLUTION_API_URL       ex: https://sua-evolution.com
//   EVOLUTION_API_KEY       apikey global/da instância
//   EVOLUTION_INSTANCE      nome da instância da empresa
//   EVOLUTION_WEBHOOK_SECRET (opcional) segredo pra validar o webhook

const axios = require('axios');

const EVOLUTION_API_URL = (process.env.EVOLUTION_API_URL || '').replace(/\/$/, '');
const EVOLUTION_API_KEY = process.env.EVOLUTION_API_KEY || '';
const EVOLUTION_INSTANCE = process.env.EVOLUTION_INSTANCE || '';
const EVOLUTION_TIMEOUT_MS = Number(process.env.EVOLUTION_TIMEOUT_MS || 20000);

function configurada() {
  return Boolean(EVOLUTION_API_URL && EVOLUTION_API_KEY && EVOLUTION_INSTANCE);
}

// Remove sufixos do JID e deixa só os dígitos do número.
function normalizarNumero(jidOuNumero = '') {
  return String(jidOuNumero).split('@')[0].replace(/\D/g, '');
}

// Envia uma mensagem de texto. `numero` = telefone (dígitos) do destinatário.
async function enviarTexto({ numero, texto, instance = EVOLUTION_INSTANCE }) {
  if (!configurada()) {
    console.warn('⚠️ Evolution não configurada (.env) — mensagem não enviada:', texto);
    return { enviado: false, motivo: 'nao_configurada' };
  }
  const destino = normalizarNumero(numero);
  const url = `${EVOLUTION_API_URL}/message/sendText/${instance}`;
  const { data } = await axios.post(
    url,
    { number: destino, text: texto },
    { headers: { apikey: EVOLUTION_API_KEY, 'Content-Type': 'application/json' }, timeout: EVOLUTION_TIMEOUT_MS }
  );
  return { enviado: true, data };
}

// Consulta o estado da conexão da instância na Evolution (open/close/connecting).
async function estadoConexao(instance = EVOLUTION_INSTANCE) {
  if (!configurada()) return { ok: false, motivo: 'nao_configurada' };
  try {
    const { data } = await axios.get(`${EVOLUTION_API_URL}/instance/connectionState/${instance}`, {
      headers: { apikey: EVOLUTION_API_KEY }, timeout: EVOLUTION_TIMEOUT_MS
    });
    return { ok: true, state: data?.instance?.state || data?.state || 'desconhecido', instance };
  } catch (e) {
    return { ok: false, motivo: e.response?.status || e.message };
  }
}

// Resumo do que está configurado (booleans, sem expor segredos).
function resumoConfig() {
  return {
    evolutionUrl: Boolean(EVOLUTION_API_URL),
    evolutionApiKey: Boolean(EVOLUTION_API_KEY),
    evolutionInstance: EVOLUTION_INSTANCE || null,
    evolutionConfigurada: configurada(),
    webhookSecret: Boolean(process.env.EVOLUTION_WEBHOOK_SECRET),
    iaConfigurada: Boolean(process.env.IA_API_KEY || process.env.OPENAI_API_KEY),
    iaModelo: process.env.IA_MODEL || null
  };
}

// Valida o segredo do webhook, se configurado (via header apikey ou query ?secret=).
function validarWebhook(req) {
  const secret = process.env.EVOLUTION_WEBHOOK_SECRET;
  if (!secret) return true; // sem segredo configurado, aceita
  const recebido = req.headers['apikey'] || req.headers['x-webhook-secret'] || req.query.secret;
  return recebido === secret;
}

// Extrai a mensagem relevante do payload do evento messages.upsert.
// Retorna { numero, texto, tipo, fromMe, isGroup, messageId, pushName } ou null se não aplicável.
function extrairMensagem(body) {
  if (!body) return null;

  // Só nos interessa messages.upsert (nova mensagem recebida).
  const evento = body.event || body.type || '';
  if (evento && !/messages[._]upsert/i.test(evento)) return null;

  // `data` pode vir como objeto único ou array.
  let data = body.data || body.message || body;
  if (Array.isArray(data)) data = data[0];
  if (!data) return null;

  const key = data.key || {};
  const remoteJid = key.remoteJid || data.remoteJid || '';
  const fromMe = Boolean(key.fromMe);
  const isGroup = /@g\.us$/.test(remoteJid) || String(remoteJid).includes('-');
  const messageId = key.id || data.id || null;
  const pushName = data.pushName || data.notifyName || null;

  const msg = data.message || {};
  // texto pode estar em conversation ou extendedTextMessage.text
  const texto = msg.conversation
    || msg.extendedTextMessage?.text
    || msg.ephemeralMessage?.message?.extendedTextMessage?.text
    || null;

  // detecta áudio (para v2 — transcrição); por ora só sinalizamos.
  const temAudio = Boolean(msg.audioMessage || msg.ephemeralMessage?.message?.audioMessage);

  const numero = normalizarNumero(remoteJid);

  return { numero, texto, tipo: temAudio ? 'audio' : 'texto', fromMe, isGroup, messageId, pushName };
}

module.exports = {
  configurada,
  normalizarNumero,
  enviarTexto,
  validarWebhook,
  extrairMensagem,
  estadoConexao,
  resumoConfig,
  EVOLUTION_INSTANCE
};
