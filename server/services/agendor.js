// server/services/agendor.js
// 🔹 Versão otimizada e segura — busca direta de tarefas com filtros dinâmicos

const axios = require('axios');
const http = require('http');
const https = require('https');

const API_AGENDOR_URL = process.env.API_AGENDOR_URL || 'https://api.agendor.com.br/v3';
const API_AGENDOR_TOKEN = process.env.API_AGENDOR_TOKEN; // ⚠️ deve conter só o token (sem a palavra "Token")

const CONFIG = {
  TASKS_PER_PAGE: 100,
  DELAY_BETWEEN_REQUESTS: 0, // espera entre paginas; rate limit controla o pacing
  MAX_RETRIES: 3,
  RETRY_BASE_DELAY: 2000 // backoff base
};

const RATE_LIMIT = {
  PER_SECOND: 3,
  PER_MINUTE: 180
};

const MIN_INTERVAL_MS = 0;

const MAX_PAGES_SAFETY = 500; // evita loop infinito e garante busca ate o fim

const AGENDOR_MAX_SOCKETS = Number(process.env.AGENDOR_MAX_SOCKETS || 4);
const AGENDOR_KEEP_ALIVE_MS = Number(process.env.AGENDOR_KEEP_ALIVE_MS || 30000);

const AGENDOR_HTTP_AGENT = new http.Agent({
  keepAlive: true,
  maxSockets: AGENDOR_MAX_SOCKETS,
  maxFreeSockets: AGENDOR_MAX_SOCKETS,
  keepAliveMsecs: AGENDOR_KEEP_ALIVE_MS
});

const AGENDOR_HTTPS_AGENT = new https.Agent({
  keepAlive: true,
  maxSockets: AGENDOR_MAX_SOCKETS,
  maxFreeSockets: AGENDOR_MAX_SOCKETS,
  keepAliveMsecs: AGENDOR_KEEP_ALIVE_MS
});

const agendorHttp = axios.create({
  baseURL: API_AGENDOR_URL,
  timeout: 30000,
  httpAgent: AGENDOR_HTTP_AGENT,
  httpsAgent: AGENDOR_HTTPS_AGENT,
  headers: {
    'Content-Type': 'application/json'
  }
});

const inflightTarefas = new Map();
const limitadoresPorToken = new Map();

const obterTokenKey = (agendorToken) => (agendorToken ? `tk_${agendorToken.slice(-6)}` : 'default');

const obterLimiter = (tokenKey) => {
  if (!limitadoresPorToken.has(tokenKey)) {
    limitadoresPorToken.set(tokenKey, {
      fila: Promise.resolve(),
      ultimoCall: 0,
      bloqueadoAte: 0,
      historico: []
    });
  }
  return limitadoresPorToken.get(tokenKey);
};

const parseRetryAfterMs = (header) => {
  if (!header) return null;
  const numeric = Number(header);
  if (!Number.isNaN(numeric)) {
    return Math.max(0, numeric * 1000);
  }
  const dateVal = new Date(header);
  if (!Number.isNaN(dateVal.getTime())) {
    return Math.max(0, dateVal.getTime() - Date.now());
  }
  return null;
};

const calcularEsperaRateLimit = (historicoChamadas) => {
  const agora = Date.now();
  const limiteMinuto = agora - 60000;

  // Remove chamadas mais antigas que 1 minuto para manter a lista curta
  while (historicoChamadas.length && historicoChamadas[0] <= limiteMinuto) {
    historicoChamadas.shift();
  }

  let espera = 0;

  if (historicoChamadas.length >= RATE_LIMIT.PER_SECOND) {
    const idxLimiteSegundo = historicoChamadas.length - RATE_LIMIT.PER_SECOND;
    const proximaDisponivelSegundo = historicoChamadas[idxLimiteSegundo] + 1000 - agora;
    espera = Math.max(espera, proximaDisponivelSegundo);
  }

  if (historicoChamadas.length >= RATE_LIMIT.PER_MINUTE) {
    const idxLimiteMinuto = historicoChamadas.length - RATE_LIMIT.PER_MINUTE;
    const proximaDisponivelMinuto = historicoChamadas[idxLimiteMinuto] + 60000 - agora;
    espera = Math.max(espera, proximaDisponivelMinuto);
  }

  return Math.max(0, espera);
};

const registrarChamada = (historicoChamadas) => {
  historicoChamadas.push(Date.now());
};

const haProximaPagina = (response, paginaAtual) => {
  const pag =
    response?.data?.pagination ||
    response?.data?.page ||
    response?.data?.meta?.pagination ||
    response?.data?.paging ||
    null;

  const hasMore = pag?.hasMore ?? pag?.has_more ?? pag?.hasNext ?? pag?.has_next ?? pag?.hasNextPage ?? pag?.has_next_page;
  if (typeof hasMore === 'boolean') return hasMore;

  const nextPage = pag?.nextPage ?? pag?.next_page ?? pag?.next;
  if (nextPage) return true;

  const links = response?.data?.links;
  if (links?.next) return true;
  if (links && !links.next && links.prev) return false;

  const totalPages = pag?.totalPages ?? pag?.total_pages ?? pag?.pages;
  if (totalPages && paginaAtual < totalPages) return true;

  const totalItems = pag?.total ?? pag?.totalItems ?? pag?.total_items;
  const perPage = pag?.perPage ?? pag?.per_page ?? pag?.pageSize ?? pag?.page_size;
  if (totalItems && perPage) {
    return paginaAtual * perPage < totalItems;
  }

  return null;
};

const obterLinkNext = (links) => {
  if (!links) return null;
  if (typeof links === 'string') return links;
  if (typeof links.next === 'string') return links.next;
  if (typeof links.next?.href === 'string') return links.next.href;
  return null;
};

const agendarChamadaAgendor = async (fn, tokenKey) => {
  const limiter = obterLimiter(tokenKey);
  // Garante que a fila não fique rejeitada em caso de erro
  limiter.fila = limiter.fila.catch(() => null).then(async () => {
    const agora = Date.now();

    if (agora < limiter.bloqueadoAte) {
      await esperar(limiter.bloqueadoAte - agora);
    }

    const esperaLimite = calcularEsperaRateLimit(limiter.historico);
    const desdeUltima = agora - limiter.ultimoCall;
    const esperaEntreChamadas = Math.max(MIN_INTERVAL_MS - desdeUltima, 0);
    const esperaNecessaria = Math.max(esperaLimite, esperaEntreChamadas);

    if (esperaNecessaria > 0) {
      await esperar(esperaNecessaria);
    }

    const resultado = await fn();
    limiter.ultimoCall = Date.now();
    registrarChamada(limiter.historico);
    return resultado;
  });

  return limiter.fila;
};

// ===================== FUNÇÃO PRINCIPAL =====================
async function buscarTarefas({ consultores = [], tipo, dataInicio, dataFim, agendorToken }) {
  try {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🔍 INICIANDO BUSCA DIRETA DE TAREFAS`);
    console.log(`${'='.repeat(60)}`);
    console.log(`📅 Período: ${dataInicio || 'Sem início'} → ${dataFim || 'Sem fim'}`);
    console.log(`👥 Consultores: ${consultores.length > 0 ? consultores.join(', ') : 'Todos'}`);
    console.log(`📋 Tipo: ${tipo || 'Todos'}`);
    console.log(`${'='.repeat(60)}\n`);

    const tokenParaUso = agendorToken || API_AGENDOR_TOKEN;
    if (!tokenParaUso) {
      throw new Error('Token do Agendor não configurado para o usuário nem como padrão.');
    }

    const tarefas = await buscarTarefasPorRange({ dataInicio, dataFim, agendorToken: tokenParaUso });

    console.log(`📦 Total bruto retornado: ${tarefas.length}`);

    let filtradas = tarefas;

    // Filtrar por consultores (user.id)
    if (consultores.length > 0) {
      const ids = consultores.map(String);
      filtradas = filtradas.filter(t => t.user?.id && ids.includes(String(t.user.id)));
    }

    // Filtrar por tipo de tarefa
    if (tipo && tipo !== 'Todos') {
      filtradas = filtradas.filter(t => t.type?.toUpperCase() === tipo.toUpperCase());
    }

    console.log(`✨ Total final (após filtros): ${filtradas.length}`);

    const tarefasMapeadas = filtradas.map(task => ({
      id: task.id,
      tipo: mapearTipoTarefa(task.type),
      tipoOriginal: task.type,
      titulo: task.text || task.title || 'Sem título',
      data: task.dueDate || task.datetime || task.date || null,
      dataFinalizacao: task.finishedAt || null,
      status: task.finishedAt ? 'Concluída' : 'Pendente',
      dealId: task.deal?.id,
      dealTitulo: task.deal?.title || 'Sem título',
      empresaNome: task.organization?.name || task.person?.name || 'Sem empresa',
      consultorId: task.assignedUsers?.id,
      consultorNome: task.assignedUsers?.name || 'Desconhecido'
    }));

    const { resumoPorTipo, resumoPorConsultor } = processarTarefas(tarefasMapeadas);

    return {
      periodo: { dataInicio, dataFim },
      tipoTarefa: tipo || 'Todos',
      total: tarefasMapeadas.length,
      resumoPorTipo,
      resumoPorConsultor,
      detalhes: tarefasMapeadas
    };
  } catch (error) {
    logErroAxios(error, 'buscarTarefas' + error.message);
    throw error;
  }
}

// ===================== BUSCAR TAREFAS COM PAGINAÇÃO =====================
async function buscarTarefasPorRange({ dataInicio, dataFim, agendorToken }) {
  const tokenKey = obterTokenKey(agendorToken);
  const chave = `${dataInicio || 'sem-inicio'}_${dataFim || 'sem-fim'}_${tokenKey}`;
  if (inflightTarefas.has(chave)) {
    console.log(`?? Usando chamada em andamento para tarefas (${chave})`);
    return inflightTarefas.get(chave);
  }

  const promessa = (async () => {
    let todas = [];
    let page = 1;
    let hasMoreData = true;
    let contadorPaginas = 0;
    let nextUrl = null;
    const dataInicioIso = dataInicio ? normalizarDataIso(dataInicio) : null;
    const dataFimIso = dataFim ? normalizarDataIso(dataFim) : null;

    const paramsBase = {
      perPage: CONFIG.TASKS_PER_PAGE,
      per_page: CONFIG.TASKS_PER_PAGE
    };

    if (dataInicioIso) paramsBase.finishedDateGt = dataInicioIso;
    if (dataFimIso) paramsBase.finishedDateLt = dataFimIso;

    while (hasMoreData && contadorPaginas < MAX_PAGES_SAFETY) {
      const params = nextUrl ? undefined : { ...paramsBase, page };
      const url = nextUrl || '/tasks';

      const response = await fetchComRetry(url, agendorToken, { params });

      const data = response.data.data || [];
      todas.push(...data);

      const pagInfo =
        response?.data?.pagination ||
        response?.data?.page ||
        response?.data?.meta?.pagination ||
        response?.data?.paging ||
        null;
      const perPageEsperado =
        pagInfo?.perPage ||
        pagInfo?.per_page ||
        pagInfo?.pageSize ||
        pagInfo?.page_size ||
        params?.perPage ||
        params?.per_page ||
        paramsBase.perPage ||
        paramsBase.per_page ||
        CONFIG.TASKS_PER_PAGE;

      const linkNext = obterLinkNext(response?.data?.links);
      const proxima = haProximaPagina(response, page);
      const podeTerMais = Boolean(linkNext) || proxima === true || (proxima === null && data.length >= perPageEsperado);
      if (podeTerMais) {
        nextUrl = linkNext || null;
        page++;
        contadorPaginas++;
        if (CONFIG.DELAY_BETWEEN_REQUESTS > 0) {
          await esperar(CONFIG.DELAY_BETWEEN_REQUESTS);
        }
        continue;
      }

      hasMoreData = false;
    }

    if (contadorPaginas >= MAX_PAGES_SAFETY) {
      console.warn('Atingiu limite de paginas em tarefas; possivel paginacao interminavel.');
    }

    return todas;
  })();

  inflightTarefas.set(chave, promessa);
  try {
    return await promessa;
  } finally {
    inflightTarefas.delete(chave);
  }
}

async function fetchComRetry(url, agendorToken, { params, tentativa = 1 }) {
  const tokenKey = obterTokenKey(agendorToken);
  const limiter = obterLimiter(tokenKey);

  try {
    return await agendarChamadaAgendor(() => agendorHttp.get(url, {
      headers: {
        Authorization: `Token ${agendorToken}`
      },
      params
    }), tokenKey);
  } catch (error) {
    const status = error?.response?.status;
    const retryAfterHeader = error?.response?.headers?.['retry-after'];
    const retryAfterMs = parseRetryAfterMs(retryAfterHeader);
    const isRateLimit = status === 429;
    const isServerError = status >= 500 && status < 600;
    const isRetryable = isRateLimit || isServerError;

    if (isRetryable) {
      const backoffBase = retryAfterMs ?? Math.min(60000, CONFIG.RETRY_BASE_DELAY * Math.pow(2, tentativa - 1));
      const jitter = Math.floor(Math.random() * 400);
      const espera = backoffBase + jitter;
      limiter.bloqueadoAte = Math.max(limiter.bloqueadoAte, Date.now() + espera);
      console.warn(`Limite/erro ${status || 'rede'} (tentativa ${tentativa}/${CONFIG.MAX_RETRIES}); aguardando ${espera}ms e tentando novamente.`);
      await esperar(espera);

      if (tentativa < CONFIG.MAX_RETRIES) {
        return fetchComRetry(url, agendorToken, { params, tentativa: tentativa + 1 });
      }
    }

    throw error;
  }
}

async function buscarNegociosPorRangePorStatus({ dataInicio, dataFim, dealStatus, agendorToken }) {
  const tokenParaUso = agendorToken || API_AGENDOR_TOKEN;
  if (!tokenParaUso) {
    throw new Error('Token do Agendor nao configurado para o usuario nem como padrao.');
  }
  let todasNegocios = [];
  let page = 1;
  let hasMoreData = true;
  let contadorPaginas = 0;
  let nextUrl = null;
  const dataInicioIso = dataInicio ? normalizarDataIso(dataInicio) : null;
  const dataFimIso = dataFim ? normalizarDataIso(dataFim) : null;

  const paramsBase = {
    perPage: CONFIG.TASKS_PER_PAGE,
    per_page: CONFIG.TASKS_PER_PAGE
  };

  if (dataInicioIso) {
    paramsBase.updatedAtGt = dataInicioIso;
    paramsBase.createdAtGt = dataInicioIso;
  }
  if (dataFimIso) {
    paramsBase.updatedAtLt = dataFimIso;
    paramsBase.createdAtLt = dataFimIso;
  }
  if (dealStatus) paramsBase.dealStatus = dealStatus;

  while (hasMoreData && contadorPaginas < MAX_PAGES_SAFETY) {
    const params = nextUrl ? undefined : { ...paramsBase, page };
    const url = nextUrl || '/deals';

    console.log('Agendor GET /deals', {
      page,
      perPage: params?.perPage || params?.per_page || paramsBase.perPage || paramsBase.per_page,
      updatedAtGt: paramsBase.updatedAtGt,
      updatedAtLt: paramsBase.updatedAtLt,
      createdAtGt: paramsBase.createdAtGt,
      createdAtLt: paramsBase.createdAtLt,
      dealStatus
    });
    const response = await fetchComRetry(url, tokenParaUso, { params });

    const data = response.data.data || [];
    todasNegocios.push(...data);

    console.log(`?? P?gina ${page}: ${data.length} neg?cios`);

    const pagInfo =
      response?.data?.pagination ||
      response?.data?.page ||
      response?.data?.meta?.pagination ||
      response?.data?.paging ||
      null;
    const perPageEsperado =
      pagInfo?.perPage ||
      pagInfo?.per_page ||
      pagInfo?.pageSize ||
      pagInfo?.page_size ||
      params?.perPage ||
      params?.per_page ||
      paramsBase.perPage ||
      paramsBase.per_page ||
      CONFIG.TASKS_PER_PAGE;

    const linkNext = obterLinkNext(response?.data?.links);
    const proxima = haProximaPagina(response, page);
    const podeTerMais = Boolean(linkNext) || proxima === true || (proxima === null && data.length >= perPageEsperado);
    if (podeTerMais) {
      nextUrl = linkNext || null;
      page++;
      contadorPaginas++;
      if (CONFIG.DELAY_BETWEEN_REQUESTS > 0) {
        await esperar(CONFIG.DELAY_BETWEEN_REQUESTS);
      }
      continue;
    }

    hasMoreData = false;
  }

  if (contadorPaginas >= MAX_PAGES_SAFETY) {
    console.warn('Atingiu limite de paginas em negocios; possivel paginacao interminavel.');
  }

  return todasNegocios;
}


// ===================== AGRUPAMENTO =====================
function processarTarefas(tarefas) {
  const resumoPorTipo = {};
  const resumoPorConsultor = {};

  tarefas.forEach(t => {
    const tipo = t.tipo || 'Outros';
    const consultor = t.consultorNome || 'Desconhecido';
    resumoPorTipo[tipo] = (resumoPorTipo[tipo] || 0) + 1;
    resumoPorConsultor[consultor] = (resumoPorConsultor[consultor] || 0) + 1;
  });

  return { resumoPorTipo, resumoPorConsultor };
}

// ===================== UTILITÁRIOS =====================
function mapearTipoTarefa(tipoAgendor) {
  const mapa = {
    VISITA: 'Visita',
    REUNIAO: 'Reunião',
    LIGACAO: 'Ligação',
    EMAIL: 'Email',
    PROPOSTA: 'Proposta',
    WHATSAPP: 'WhatsApp'
  };
  return mapa[tipoAgendor?.toUpperCase()] || tipoAgendor || 'Outros';
}

function esperar(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

function normalizarDataIso(valor) {
  if (!valor) return null;
  const iso = valor.includes('T') ? valor : `${valor}T00:00:00Z`;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return valor;
  return d.toISOString();
}

function logErroAxios(error, contexto) {
  if (error.response) {
    console.error(`❌ Erro ao buscar ${contexto}: [${error.response.status}]`);
    const config = error.response.config || {};
    const url = config.url || '';
    const baseURL = config.baseURL || '';
    const fullUrl = url.startsWith('http') ? url : `${baseURL}${url}`;
    console.error(`URL: ${fullUrl || url || baseURL}`);
    if (error.response.data) console.error(error.response.data);
  } else {
    console.error(`❌ Erro de rede (${contexto}):`, error.message);
  }
}

// ===================== EXPORTS =====================
module.exports = {
  buscarTarefas,
  buscarTarefasPorRange,
  buscarNegociosPorRangePorStatus
};
