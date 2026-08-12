// Testa a máquina de estados do assistente com dados SIMULADOS (sem Agendor/Groq/banco).
// Uso: node server/scripts/testar-orquestrador.js
require('dotenv').config({ path: require('path').resolve(__dirname, '..', '..', '.env') });
const orq = require('../services/assistente/orquestrador');
const etapas = require('../services/assistente/etapas');

// ---- fakes injetáveis ----
function fakeSessoes() {
  const STATUS = {
    AGUARDANDO_NOME: 'aguardando_nome', AGUARDANDO_CLIENTE: 'aguardando_cliente',
    AGUARDANDO_CRIAR_CLIENTE: 'aguardando_criar_cliente', AGUARDANDO_CONFIRMACAO: 'aguardando_confirmacao',
    CONCLUIDO: 'concluido', CANCELADO: 'cancelado'
  };
  const ABERTOS = [STATUS.AGUARDANDO_NOME, STATUS.AGUARDANDO_CLIENTE, STATUS.AGUARDANDO_CRIAR_CLIENTE, STATUS.AGUARDANDO_CONFIRMACAO];
  const store = new Map(); // telefone -> sessao
  const mk = (o) => ({ ...o, update(patch) { Object.assign(this, patch); if (!ABERTOS.includes(this.status)) store.delete(this.telefone); return this; } });
  return {
    STATUS,
    async buscarAberta(tel) { const s = store.get(tel); return s && ABERTOS.includes(s.status) ? s : null; },
    async criar(o) { const s = mk({ ...o, id: 'sess1' }); store.set(o.telefone, s); return s; },
    async atualizar(sessao, campos) { return sessao.update(campos); },
    async encerrar(sessao, status) { return sessao.update({ status }); }
  };
}

// Agendor fake com "banco" em memória.
function fakeAgendor({ pessoas, negocios = [], tarefas = [] }) {
  const log = [];
  let seqTask = 900;
  return {
    log,
    normalizarTipoTarefa: (t) => t ? String(t).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase() : null,
    async buscarPessoaPorNome({ nome }) {
      return pessoas.filter(p => p.name.toLowerCase().includes(nome.toLowerCase()));
    },
    async buscarNegociosDaPessoa({ personId }) { return negocios.filter(n => n.personId === personId); },
    async criarNegocio(a) { log.push(['criarNegocio', a.dealStage]); const d = { id: 5000, dealStatus: { id: 1 }, dealStage: { sequence: a.dealStage } }; negocios.push({ ...d, personId: a.personId }); return d; },
    async listarTarefasDoDeal({ dealId }) { return tarefas.filter(t => t.dealId === dealId); },
    async criarTarefa(a) { const id = ++seqTask; log.push(['criarTarefa', a.tipo, a.concluida ? 'CONCLUIDA' : 'pendente']); return { id, type: a.tipo }; },
    async concluirTarefa(a) { log.push(['concluirTarefa', a.taskId, a.tipo]); return { id: a.taskId, finishedAt: a.finishedDate }; },
    async moverEtapaNegocio(a) { log.push(['moverEtapa', a.dealStage, etapas.nomeEtapa(a.dealStage)]); return { id: a.dealId }; }
  };
}

const ctxConsultor = { consultor: {}, consultorId: 1, nome: 'Consultor Teste', agendorUserId: 640301, agendorToken: 'tok' };
const AGORA = new Date('2026-08-12T12:00:00-04:00');

async function cenario(nome, { pessoas, negocios, tarefas, roteiro }) {
  console.log('\n' + '#'.repeat(72) + `\n# ${nome}\n` + '#'.repeat(72));
  const sessoes = fakeSessoes();
  const agendor = fakeAgendor({ pessoas, negocios: negocios || [], tarefas: tarefas || [] });
  const deps = { ia: require('../services/assistenteIA'), agendor, sessoes, etapas, resolverConsultor: async () => ctxConsultor, agora: () => AGORA, registrarAcao: async () => {} };

  for (const msg of roteiro) {
    const r = await orq.processarMensagem({ telefone: '5567999998888', texto: msg }, deps);
    console.log(`\n👤 ${msg}`);
    console.log(`🤖 ${r.resposta === null ? '(silêncio)' : r.resposta}`);
  }
  if (agendor.log.length) console.log('\n📋 Ações no Agendor:', JSON.stringify(agendor.log));
}

(async () => {
  const usarIA = !!process.env.IA_API_KEY;
  if (!usarIA) { console.log('IA_API_KEY vazio — este teste usa a IA real p/ extrair. Cole a chave do Groq.'); return; }

  // 1) Duas Marias -> pergunta -> escolhe -> confirma -> grava
  await cenario('DUAS MARIAS (ambíguo) → escolher → confirmar', {
    pessoas: [{ id: 11, name: 'Maria Oliveira' }, { id: 12, name: 'Maria Santos' }],
    negocios: [], tarefas: [],
    roteiro: [
      'Alô Reobote, hoje fiz uma visita pra Maria e agendei uma vídeo chamada quinta às 15h',
      '1',
      'sim'
    ]
  });

  // 2) Cliente único, já tem negócio em Prospecção -> visita move p/ Visita Marcada
  await cenario('CLIENTE ÚNICO com negócio em Prospecção → visita move etapa', {
    pessoas: [{ id: 20, name: 'João Pedro' }],
    negocios: [{ id: 7000, personId: 20, dealStatus: { id: 1 }, dealStage: { sequence: 1 } }],
    tarefas: [],
    roteiro: [
      'alo reobote fiz uma visita no João Pedro hoje, foi ótima',
      'sim'
    ]
  });

  // 3) Cliente não encontrado -> pergunta se cria -> não
  await cenario('CLIENTE NÃO ENCONTRADO → oferecer criar → não', {
    pessoas: [],
    roteiro: [
      'Alô Reobote liguei pra Fernanda Lima agora',
      'não'
    ]
  });

  // 4) Agendamento pendente do mesmo tipo -> finaliza o existente
  await cenario('AGENDAMENTO PENDENTE de reunião → finaliza o existente', {
    pessoas: [{ id: 30, name: 'Carlos Souza' }],
    negocios: [{ id: 8000, personId: 30, dealStatus: { id: 1 }, dealStage: { sequence: 2 } }],
    tarefas: [{ id: 111, dealId: 8000, type: 'Reunião', finishedAt: null }],
    roteiro: [
      'alo reobote fiz a reuniao com o Carlos Souza, apresentei o consorcio e ele vai pensar',
      'sim'
    ]
  });
})();
