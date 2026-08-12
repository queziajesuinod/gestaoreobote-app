// server/services/assistente/orquestrador.js
// Máquina de estados do assistente "Alô Reobote".
// Recebe (telefone, texto) e devolve { resposta, encerrada, sessao }.
// A resposta é o texto a mandar de volta no WhatsApp (null = ignorar em silêncio).
//
// Tudo é injetável via `deps` para testar com dados simulados (sem Evolution/Agendor/Groq).

const iaReal = require('../assistenteIA');
const agendorReal = require('../agendor');
const sessoesReal = require('./sessoes');
const etapasReal = require('./etapas');
const auditoriaReal = require('./auditoria');
const { resolverConsultorPorTelefone } = require('./contexto');

function defaults() {
  return {
    ia: iaReal,
    agendor: agendorReal,
    sessoes: sessoesReal,
    etapas: etapasReal,
    resolverConsultor: resolverConsultorPorTelefone,
    registrarAcao: auditoriaReal.registrarAcao, // grava no menu de auditoria (best-effort)
    agora: () => new Date()
  };
}

// ---------- helpers de linguagem ----------
const SIM = /\b(sim|s|isso|confirmo|confirmar|pode|ok|blz|beleza|certo|correto|positivo|👍)\b/i;
const NAO = /\b(n[ãa]o|n|negativo|errado|incorreto)\b/i;
const CANCELAR = /\b(cancela(r)?|deixa( pra la| pra l[áa])?|esquece|para|aborta(r)?)\b/i;

const ehSim = (t) => SIM.test(t || '');
const ehNao = (t) => NAO.test(t || '');
const ehCancelar = (t) => CANCELAR.test(t || '');

function formatarData(iso) {
  if (!iso) return 'sem data';
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return String(iso);
  const dd = String(d.getDate()).padStart(2, '0');
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const hh = String(d.getHours()).padStart(2, '0');
  const mi = String(d.getMinutes()).padStart(2, '0');
  return `${dd}/${mm} ${hh}:${mi}`;
}

const rotuloTipo = {
  VISITA: 'visita', REUNIAO: 'reunião/vídeo chamada', LIGACAO: 'ligação',
  EMAIL: 'e-mail', WHATSAPP: 'WhatsApp', PROPOSTA: 'proposta'
};
const nomeTipo = (t) => rotuloTipo[t] || (t ? t.toLowerCase() : 'ação');

function montarPerguntaCandidatos(nome, candidatos) {
  const linhas = candidatos.map(c => `${c.idx}️⃣ ${c.nome}`).join('\n');
  return `Achei ${candidatos.length} clientes "${nome}":\n${linhas}\n\nQual é? Responde o número (ou "cancelar").`;
}

function montarConfirmacao(intent, cliente) {
  const partes = [`Cliente: *${cliente.nome}*`];
  if (intent.interacao_realizada?.tipo) {
    const it = intent.interacao_realizada;
    partes.push(`✅ ${nomeTipo(it.tipo)} realizada${it.resumo ? `: ${it.resumo}` : ''}`);
  }
  if (intent.proxima_acao?.tipo) {
    const pa = intent.proxima_acao;
    partes.push(`📅 ${nomeTipo(pa.tipo)} agendada p/ ${formatarData(pa.data)}${pa.descricao ? ` — ${pa.descricao}` : ''}`);
  }
  return `Entendi o seguinte:\n\n${partes.join('\n')}\n\nConfirma? (sim / não)`;
}

function interpretarEscolha(texto, candidatos) {
  const m = String(texto || '').match(/\d+/);
  if (m) {
    const n = Number(m[0]);
    const achado = candidatos.find(c => c.idx === n);
    if (achado) return achado;
  }
  // tenta por nome
  const t = String(texto || '').toLowerCase();
  return candidatos.find(c => t && c.nome.toLowerCase().includes(t)) || null;
}

// ---------- núcleo ----------
async function processarMensagem({ telefone, texto }, deps = {}) {
  const d = { ...defaults(), ...deps };
  const agora = d.agora();

  const ctx = await d.resolverConsultor(telefone);
  if (!ctx) return { resposta: null, motivo: 'nao_cadastrado' }; // número não cadastrado → ignora (segurança)

  const sessao = await d.sessoes.buscarAberta(telefone, agora);

  if (sessao && ehCancelar(texto) && sessao.status !== d.sessoes.STATUS.AGUARDANDO_NOME) {
    await d.sessoes.encerrar(sessao, d.sessoes.STATUS.CANCELADO);
    return { resposta: 'Ok, cancelei esse registro. 👍', encerrada: true };
  }

  if (sessao) return responderSessao({ sessao, texto, ctx, telefone, agora }, d);

  // --- sem sessão: precisa do gatilho ---
  if (!d.ia.detectarGatilho(texto)) return { resposta: null, motivo: 'sem_gatilho' };

  let intent;
  try {
    intent = await d.ia.extrairIntencao(texto, { agora });
  } catch (e) {
    return { resposta: 'Não consegui processar agora (IA indisponível). Tenta de novo daqui a pouco.' };
  }

  if (!intent.interacao_realizada && !intent.proxima_acao) {
    return { resposta: 'Recebi seu "alô", mas não identifiquei uma visita/ligação/tarefa. Me conta o que você fez e/ou o que agendou.' };
  }

  if (!intent.cliente_nome) {
    const s = await d.sessoes.criar({ telefone, consultorId: ctx.consultorId, status: d.sessoes.STATUS.AGUARDANDO_NOME, payload: { intent }, mensagemOriginal: texto }, agora);
    return { resposta: 'De qual cliente é esse relato? Me manda o nome.', sessao: s };
  }

  return resolverClienteEContinuar({ telefone, ctx, intent, texto, agora, sessaoExistente: null }, d);
}

async function responderSessao({ sessao, texto, ctx, telefone, agora }, d) {
  const S = d.sessoes.STATUS;
  const payload = sessao.payload || {};
  const intent = payload.intent;

  switch (sessao.status) {
    case S.AGUARDANDO_NOME: {
      const nome = String(texto || '').trim();
      if (!nome) return { resposta: 'Preciso do nome do cliente pra continuar. Qual é?' };
      intent.cliente_nome = nome;
      return resolverClienteEContinuar({ telefone, ctx, intent, texto, agora, sessaoExistente: sessao }, d);
    }

    case S.AGUARDANDO_CLIENTE: {
      const escolha = interpretarEscolha(texto, sessao.candidatos || []);
      if (!escolha) {
        return { resposta: `Não entendi. Responde só o número:\n${(sessao.candidatos || []).map(c => `${c.idx}️⃣ ${c.nome}`).join('\n')}` };
      }
      const cliente = { id: escolha.id, nome: escolha.nome };
      return irParaConfirmacao({ telefone, ctx, intent, cliente, agora, sessaoExistente: sessao }, d);
    }

    case S.AGUARDANDO_CRIAR_CLIENTE: {
      if (ehSim(texto)) {
        // cria a pessoa no Agendor
        let nova;
        try {
          nova = await criarPessoa(d, ctx.agendorToken, intent.cliente_nome);
        } catch (e) {
          return { resposta: 'Deu erro ao criar o cliente no Agendor. Tenta de novo ou crie manualmente.' };
        }
        const cliente = { id: nova.id, nome: nova.name || intent.cliente_nome };
        return irParaConfirmacao({ telefone, ctx, intent, cliente, agora, sessaoExistente: sessao }, d);
      }
      if (ehNao(texto)) {
        await d.sessoes.encerrar(sessao, S.CANCELADO);
        return { resposta: 'Beleza, não criei nada. Se quiser, faz manual no Agendor.', encerrada: true };
      }
      return { resposta: `Não achei "${intent.cliente_nome}". Quer que eu crie esse cliente? (sim / não)` };
    }

    case S.AGUARDANDO_CONFIRMACAO: {
      if (ehSim(texto)) {
        let resultado;
        try {
          resultado = await executarAcoes({ ctx, intent, cliente: payload.cliente, telefone: sessao.telefone, agora }, d);
        } catch (e) {
          return { resposta: `Ops, falhei ao gravar no Agendor: ${e.message}. Nada foi perdido — tenta confirmar de novo.` };
        }
        await d.sessoes.encerrar(sessao, S.CONCLUIDO);
        return { resposta: montarResumo(resultado, payload.cliente), encerrada: true };
      }
      if (ehNao(texto) || ehCancelar(texto)) {
        await d.sessoes.encerrar(sessao, S.CANCELADO);
        return { resposta: 'Ok, não gravei nada. Manda de novo corrigido quando quiser.', encerrada: true };
      }
      return { resposta: 'Só preciso de um "sim" pra gravar, ou "não" pra cancelar.' };
    }

    default:
      return { resposta: null };
  }
}

async function resolverClienteEContinuar({ telefone, ctx, intent, texto, agora, sessaoExistente }, d) {
  const S = d.sessoes.STATUS;
  const pessoas = await d.agendor.buscarPessoaPorNome({ nome: intent.cliente_nome, agendorToken: ctx.agendorToken });

  if (!pessoas || pessoas.length === 0) {
    await persistir(d, { sessaoExistente, telefone, ctx, status: S.AGUARDANDO_CRIAR_CLIENTE, payload: { intent }, mensagemOriginal: texto, agora });
    return { resposta: `Não achei nenhum cliente "${intent.cliente_nome}" no Agendor. Quer que eu crie? (sim / não)` };
  }

  if (pessoas.length > 1) {
    const candidatos = pessoas.slice(0, 5).map((p, i) => ({ idx: i + 1, id: p.id, nome: p.name }));
    await persistir(d, { sessaoExistente, telefone, ctx, status: S.AGUARDANDO_CLIENTE, payload: { intent }, candidatos, mensagemOriginal: texto, agora });
    return { resposta: montarPerguntaCandidatos(intent.cliente_nome, candidatos) };
  }

  const cliente = { id: pessoas[0].id, nome: pessoas[0].name };
  return irParaConfirmacao({ telefone, ctx, intent, cliente, agora, sessaoExistente }, d);
}

async function irParaConfirmacao({ telefone, ctx, intent, cliente, agora, sessaoExistente }, d) {
  const S = d.sessoes.STATUS;
  await persistir(d, { sessaoExistente, telefone, ctx, status: S.AGUARDANDO_CONFIRMACAO, payload: { intent, cliente }, candidatos: null, agora });
  return { resposta: montarConfirmacao(intent, cliente) };
}

async function persistir(d, { sessaoExistente, telefone, ctx, status, payload, candidatos, mensagemOriginal, agora }) {
  if (sessaoExistente) {
    return d.sessoes.atualizar(sessaoExistente, { status, payload, candidatos: candidatos || null }, agora);
  }
  return d.sessoes.criar({ telefone, consultorId: ctx.consultorId, status, payload, candidatos, mensagemOriginal }, agora);
}

async function criarPessoa(d, agendorToken, nome) {
  // usa o helper genérico do serviço agendor se existir; senão, cria via request direto.
  if (typeof d.agendor.criarPessoa === 'function') {
    return d.agendor.criarPessoa({ nome, agendorToken });
  }
  // fallback: monta via a mesma infra (POST /people)
  const axios = require('axios');
  const base = (process.env.API_AGENDOR_URL || 'https://api.agendor.com.br/v3');
  const token = agendorToken || process.env.API_AGENDOR_TOKEN;
  const r = await axios.post(`${base}/people`, { name: nome }, { headers: { Authorization: `Token ${token}`, 'Content-Type': 'application/json' }, timeout: 30000 });
  return r.data.data || r.data;
}

// Executa as ações no Agendor conforme a intenção. Retorna o resumo das ações.
async function executarAcoes({ ctx, intent, cliente, telefone, agora }, d) {
  const token = ctx.agendorToken;
  const userId = ctx.agendorUserId;
  const acoes = [];

  // 1) achar negócio aberto ou criar em Prospecção
  const negocios = await d.agendor.buscarNegociosDaPessoa({ personId: cliente.id, agendorToken: token });
  let deal = (negocios || []).find(n => n?.dealStatus?.id === 1 || /andamento/i.test(n?.dealStatus?.name || ''));
  let etapaSeq = deal?.dealStage?.sequence || null;

  if (!deal) {
    deal = await d.agendor.criarNegocio({
      personId: cliente.id, title: cliente.nome,
      funnel: d.etapas.FUNIL_PADRAO, dealStage: d.etapas.ETAPA_INICIAL, dealStatus: 1,
      agendorToken: token
    });
    etapaSeq = d.etapas.ETAPA_INICIAL;
    acoes.push({ tipo: 'negocio_criado', dealId: deal.id, etapa: d.etapas.nomeEtapa(etapaSeq) });
  }
  const dealId = deal.id;

  const moverSeNecessario = async (tipo) => {
    const alvo = d.etapas.etapaAlvoParaTipo(tipo);
    if (alvo && alvo !== etapaSeq) {
      await d.agendor.moverEtapaNegocio({ dealId, funnel: d.etapas.FUNIL_PADRAO, dealStage: alvo, agendorToken: token });
      acoes.push({ tipo: 'etapa_movida', de: etapaSeq, para: alvo, nome: d.etapas.nomeEtapa(alvo) });
      etapaSeq = alvo;
    }
  };

  // 2) interação realizada: concluir agendamento pendente do tipo, ou criar concluída
  if (intent.interacao_realizada?.tipo) {
    const it = intent.interacao_realizada;
    const pendentes = await d.agendor.listarTarefasDoDeal({ dealId, apenasPendentes: true, agendorToken: token });
    const match = (pendentes || []).find(t => d.agendor.normalizarTipoTarefa(t.type) === it.tipo);
    if (match) {
      await d.agendor.concluirTarefa({ dealId, taskId: match.id, text: it.resumo || 'Concluído via assistente', tipo: it.tipo, finishedDate: it.data, userId, agendorToken: token });
      acoes.push({ tipo: 'tarefa_concluida', taskId: match.id, tarefaTipo: it.tipo });
    } else {
      const nova = await d.agendor.criarTarefa({ dealId, text: it.resumo || 'Registrado via assistente', tipo: it.tipo, dueDate: it.data, concluida: true, finishedDate: it.data, userId, agendorToken: token });
      acoes.push({ tipo: 'tarefa_criada_concluida', taskId: nova.id, tarefaTipo: it.tipo });
    }
    await moverSeNecessario(it.tipo);
  }

  // 3) próxima ação: cria tarefa pendente futura (+ move etapa se aplicável)
  if (intent.proxima_acao?.tipo) {
    const pa = intent.proxima_acao;
    const nova = await d.agendor.criarTarefa({ dealId, text: pa.descricao || 'Agendado via assistente', tipo: pa.tipo, dueDate: pa.data, concluida: false, userId, agendorToken: token });
    acoes.push({ tipo: 'tarefa_agendada', taskId: nova.id, tarefaTipo: pa.tipo, quando: pa.data });
    await moverSeNecessario(pa.tipo);
  }

  // auditoria (best-effort — não derruba o fluxo se falhar)
  for (const a of acoes) {
    try {
      await d.registrarAcao({
        consultorId: ctx.consultorId, consultorNome: ctx.nome, telefone,
        clienteNome: cliente.nome, dealId, acao: a, criadoEm: agora
      });
    } catch (_) { /* noop */ }
  }

  return { dealId, acoes, etapaFinal: etapaSeq, cliente };
}

function montarResumo(resultado, cliente) {
  const linhas = [`✅ Pronto, *${cliente.nome}*:`];
  for (const a of resultado.acoes) {
    if (a.tipo === 'negocio_criado') linhas.push(`• Negócio criado (${a.etapa})`);
    if (a.tipo === 'tarefa_concluida') linhas.push(`• ${nomeTipo(a.tarefaTipo)} existente finalizada`);
    if (a.tipo === 'tarefa_criada_concluida') linhas.push(`• ${nomeTipo(a.tarefaTipo)} registrada como concluída`);
    if (a.tipo === 'tarefa_agendada') linhas.push(`• ${nomeTipo(a.tarefaTipo)} agendada p/ ${formatarData(a.quando)}`);
    if (a.tipo === 'etapa_movida') linhas.push(`• Movido para *${a.nome}*`);
  }
  return linhas.join('\n');
}

module.exports = {
  processarMensagem,
  // exports internos p/ teste
  _executarAcoes: executarAcoes,
  _montarConfirmacao: montarConfirmacao,
  _interpretarEscolha: interpretarEscolha
};
