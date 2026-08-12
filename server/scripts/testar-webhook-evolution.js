// Testa o parsing do webhook da Evolution + o glue com o orquestrador, SIMULADO.
// Uso: node server/scripts/testar-webhook-evolution.js
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '..', '.env') });
const evolution = require('../services/evolution');
const wpp = require('../controllers/whatsapp');

// payloads no formato messages.upsert da Evolution
const payloadTexto = (numero, texto, fromMe = false) => ({
  event: 'messages.upsert',
  instance: 'empresa',
  data: {
    key: { remoteJid: `${numero}@s.whatsapp.net`, fromMe, id: 'MSG' + Math.floor(Math.random() * 1e6) },
    pushName: 'Consultor',
    message: { conversation: texto },
    messageType: 'conversation'
  }
});
const payloadGrupo = (texto) => ({
  event: 'messages.upsert',
  data: { key: { remoteJid: '55670001-1234@g.us', fromMe: false, id: 'G1' }, message: { conversation: texto } }
});
const payloadAudio = (numero) => ({
  event: 'messages.upsert',
  data: { key: { remoteJid: `${numero}@s.whatsapp.net`, fromMe: false, id: 'A1' }, message: { audioMessage: { url: 'x' } } }
});

// ---- 1) só o parser ----
console.log('=== extrairMensagem ===');
console.log('texto :', JSON.stringify(evolution.extrairMensagem(payloadTexto('5567999998888', 'Alô Reobote, fiz visita pra Maria'))));
console.log('fromMe:', JSON.stringify(evolution.extrairMensagem(payloadTexto('5567999998888', 'oi', true))));
console.log('grupo :', JSON.stringify(evolution.extrairMensagem(payloadGrupo('oi'))));
console.log('áudio :', JSON.stringify(evolution.extrairMensagem(payloadAudio('5567999998888'))));

// ---- 2) glue completo com orquestrador+evolution FAKE ----
const enviados = [];
const evoFake = {
  extrairMensagem: evolution.extrairMensagem,
  enviarTexto: async ({ numero, texto }) => { enviados.push({ numero, texto }); return { enviado: true }; }
};
const orqFake = {
  async processarMensagem({ telefone, texto }) {
    if (!/reobote/i.test(texto)) return { resposta: null };
    return { resposta: `(fake) recebi de ${telefone}: "${texto.slice(0, 30)}..."` };
  }
};

(async () => {
  console.log('\n=== glue processarEEnviar (fakes) ===');
  const casos = [
    ['gatilho', payloadTexto('5567999998888', 'Alô Reobote, liguei pro cliente')],
    ['sem gatilho', payloadTexto('5567999998888', 'bom dia')],
    ['fromMe', payloadTexto('5567999998888', 'Alô Reobote x', true)],
    ['grupo', payloadGrupo('Alô Reobote x')],
    ['áudio', payloadAudio('5567111112222')]
  ];
  for (const [nome, body] of casos) {
    const r = await wpp.processarEEnviar(body, { evolution: evoFake, orquestrador: orqFake });
    console.log(`  ${nome.padEnd(12)} ->`, JSON.stringify(r));
  }
  console.log('\n📤 Mensagens que seriam enviadas:');
  enviados.forEach(e => console.log(`   → ${e.numero}: ${e.texto}`));
})();
