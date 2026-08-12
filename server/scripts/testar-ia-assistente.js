// Teste manual da extração de IA do assistente "Alô Reobote".
// Uso: colar IA_API_KEY no .env e rodar:  node server/scripts/testar-ia-assistente.js
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '..', '.env') });
const ia = require('../services/assistenteIA');

const EXEMPLOS = [
  'Alô Reobote, hoje eu fiz uma visita para a cliente Maria Oliveira e conversamos sobre o consórcio de imóvel. Ela gostou mas quer ver os valores. Agendei uma ligação de vídeo com ela na próxima terça às 15h para apresentar mais sobre o consórcio.',
  'alo reobote liguei pro João Pedro agora, ele pediu pra mandar a proposta por email amanhã de manhã',
  'Alô Reobote mandei zap pra Ana confirmando a reunião de sexta',
  'bom dia, tudo certo por aí?'
];

(async () => {
  console.log('Provedor:', process.env.IA_BASE_URL, '| modelo:', process.env.IA_MODEL);
  if (!process.env.IA_API_KEY) {
    console.log('\n⚠️  IA_API_KEY vazio no .env — cole a chave do Groq e rode de novo.');
    return;
  }
  for (const texto of EXEMPLOS) {
    console.log('\n' + '='.repeat(70));
    console.log('MSG:', texto);
    console.log('gatilho?', ia.detectarGatilho(texto));
    if (!ia.detectarGatilho(texto)) { console.log('(sem gatilho — ignorado)'); continue; }
    try {
      const t0 = Date.now();
      const r = await ia.extrairIntencao(texto);
      console.log(`extração (${Date.now() - t0}ms):`);
      console.log(JSON.stringify(r, null, 2));
    } catch (e) {
      console.log('ERRO:', e.response?.status, JSON.stringify(e.response?.data) || e.message);
    }
  }
})();
