// server/controllers/whatsapp.js
// Recebe o webhook da Evolution, roda o orquestrador e responde no WhatsApp.

const evolution = require('../services/evolution');
const orquestrador = require('../services/assistente/orquestrador');

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

  const msg = evo.extrairMensagem(body);
  if (!msg) return { ignorado: 'sem_mensagem' };
  if (msg.fromMe) return { ignorado: 'from_me' };
  if (msg.isGroup) return { ignorado: 'grupo' };
  if (jaProcessado(msg.messageId)) return { ignorado: 'duplicado' };

  // v1: só texto. Áudio entra na v2 (transcrição).
  if (msg.tipo === 'audio') {
    await evo.enviarTexto({ numero: msg.numero, texto: 'Por enquanto eu só entendo *texto* 🙏. Em breve vou transcrever áudios!' });
    return { ignorado: 'audio' };
  }
  if (!msg.texto || !msg.texto.trim()) return { ignorado: 'vazio' };

  const resultado = await orq.processarMensagem({ telefone: msg.numero, texto: msg.texto });

  // resposta null = ignorar em silêncio (número não cadastrado, sem gatilho, etc.)
  if (resultado && resultado.resposta) {
    await evo.enviarTexto({ numero: msg.numero, texto: resultado.resposta });
  }
  return { ok: true, respondeu: Boolean(resultado?.resposta) };
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
