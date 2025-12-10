// server/services/agendor.js
// 🔹 Versão otimizada e segura — busca direta de tarefas com filtros dinâmicos

const axios = require('axios');

const API_AGENDOR_URL = process.env.API_AGENDOR_URL || 'https://api.agendor.com.br/v3';
const API_AGENDOR_TOKEN = process.env.API_AGENDOR_TOKEN; // ⚠️ deve conter só o token (sem a palavra "Token")

const CONFIG = {
  TASKS_PER_PAGE: 100,
  DELAY_BETWEEN_REQUESTS: 2000, // ms entre paginas de busca
  MAX_RETRIES: 3,
  RETRY_BASE_DELAY: 1500
};

const RATE_LIMIT = {
  PER_SECOND: 4,
  PER_MINUTE: 35
};

const MAX_PAGES_SAFETY = 500; // evita loop infinito e garante busca ate o fim

const inflightTarefas = new Map();
let filaReq = Promise.resolve();
let ultimoCallAgendor = 0;
let bloqueadoAte = 0;
const historicoChamadas = [];

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

const calcularEsperaRateLimit = () => {
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

const registrarChamada = () => {
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

const agendarChamadaAgendor = async (fn) => {
  filaReq = filaReq.then(async () => {
    if (Date.now() < bloqueadoAte) {
      const espera = bloqueadoAte - Date.now();
      await esperar(espera);
    }
    const agora = Date.now();
    const esperaLimite = calcularEsperaRateLimit();
    const esperaEntreChamadas = Math.max(0, 250 - (agora - ultimoCallAgendor)); // evita burst inicial
    const esperaNecessaria = Math.max(esperaLimite, esperaEntreChamadas);
    if (esperaNecessaria > 0) {
      await esperar(esperaNecessaria);
    }
    const resultado = await fn();
    ultimoCallAgendor = Date.now();
    registrarChamada();
    return resultado;
  });

  return filaReq;
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
  const tokenKey = agendorToken ? `tk_${agendorToken.slice(-6)}` : 'default';
  const chave = `${dataInicio || 'sem-inicio'}_${dataFim || 'sem-fim'}_${tokenKey}`;
  if (inflightTarefas.has(chave)) {
    console.log(`🔄 Usando chamada em andamento para tarefas (${chave})`);
    return inflightTarefas.get(chave);
  }

  const promessa = (async () => {
    let todas = [];
    let page = 1;
    let hasMoreData = true;
    let contadorPaginas = 0;
    const dataInicioIso = dataInicio ? normalizarDataIso(dataInicio) : null;
    const dataFimIso = dataFim ? normalizarDataIso(dataFim) : null;

    while (hasMoreData && contadorPaginas < MAX_PAGES_SAFETY) {
      const params = {
        page,
        perPage: CONFIG.TASKS_PER_PAGE,
        per_page: CONFIG.TASKS_PER_PAGE
      };

      if (dataInicioIso) params.finishedDateGt = dataInicioIso;
      if (dataFimIso) params.finishedDateLt = dataFimIso;

      const url = `${API_AGENDOR_URL}/tasks`;

      try {
        const response = await fetchComRetry(url, agendorToken, { params });

        const data = response.data.data || [];
        todas = [...todas, ...data];

       
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
        params.perPage ||
        params.per_page ||
        CONFIG.TASKS_PER_PAGE;

        const proxima = haProximaPagina(response, page);
        const podeTerMais = proxima === true || (proxima === null && data.length >= perPageEsperado);
        if (podeTerMais) {
          page++;
          contadorPaginas++;
          await esperar(CONFIG.DELAY_BETWEEN_REQUESTS);
          continue;
        }

        if (proxima === false || data.length < perPageEsperado) {
          hasMoreData = false;
        }
      } catch (error) {
        const status = error?.response?.status;
        if (status === 429 || status === 503) {
          const retryAfterMs = parseRetryAfterMs(error?.response?.headers?.['retry-after']);
          const espera = retryAfterMs ?? 60000;
          console.warn(`Limite ou instabilidade na pagina ${page}; aguardando ${espera}ms e tentando novamente.`);
          bloqueadoAte = Math.max(bloqueadoAte, Date.now() + espera);
          await esperar(espera);
          continue;
        }
        throw error;
      }
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
  try {
    return await agendarChamadaAgendor(() => axios.get(url, {
      headers: {
        Authorization: `Token ${agendorToken}`, // inclui a palavra "Token"
        'Content-Type': 'application/json'
      },
      params
    }));
  } catch (error) {
    const status = error?.response?.status;
    const retryAfterHeader = error?.response?.headers?.['retry-after'];
    const retryAfterMs = parseRetryAfterMs(retryAfterHeader);

    const podeTentarNovamente =
      tentativa < CONFIG.MAX_RETRIES &&
      (status === 429 || status === 503);

    if (podeTentarNovamente) {
      const base = retryAfterMs ?? (CONFIG.RETRY_BASE_DELAY * tentativa);
      const jitter = Math.floor(Math.random() * 200);
      const espera = base + jitter;
      console.warn(`Retry (${tentativa}/${CONFIG.MAX_RETRIES}) para ${url} apos ${espera}ms - status ${status}`);
      await esperar(espera);
      return fetchComRetry(url, agendorToken, { params, tentativa: tentativa + 1 });
    }

    if (status === 429) {
      bloqueadoAte = Date.now() + 60000; // cooldown de 60s
    }

    throw error;
  }
}

async function buscarNegociosPorRangePorStatus({ dataInicio, dataFim, dealStatus, agendorToken }) {
  const tokenParaUso = agendorToken || API_AGENDOR_TOKEN;
  if (!tokenParaUso) {
    throw new Error('Token do Agendor não configurado para o usuário nem como padrão.');
  }
  let todasNegocios = [];
  let page = 1;
  let hasMoreData = true;
  let contadorPaginas = 0;
  const dataInicioIso = dataInicio ? normalizarDataIso(dataInicio) : null;
  const dataFimIso = dataFim ? normalizarDataIso(dataFim) : null;

  while (hasMoreData && contadorPaginas < MAX_PAGES_SAFETY) {
    const params = {
      page,
      perPage: CONFIG.TASKS_PER_PAGE,
      per_page: CONFIG.TASKS_PER_PAGE
    };

    if (dataInicioIso) {
      params.updatedAtGt = dataInicioIso;
      params.createdAtGt = dataInicioIso;
    }
    if (dataFimIso) {
      params.updatedAtLt = dataFimIso;
      params.createdAtLt = dataFimIso;
    }
    if (dealStatus) params.dealStatus = dealStatus;

    const url = `${API_AGENDOR_URL}/deals`;

    try {
      console.log('Agendor GET /deals', {
        page,
        perPage: params.perPage || params.per_page,
        updatedAtGt: params.updatedAtGt,
        updatedAtLt: params.updatedAtLt,
        createdAtGt: params.createdAtGt,
        createdAtLt: params.createdAtLt,
        dealStatus
      });
      const response = await fetchComRetry(url, tokenParaUso, { params });

      const data = response.data.data || [];
      todasNegocios = [...todasNegocios, ...data];

      console.log(`📄 Página ${page}: ${data.length} negócios`);

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
        params.perPage ||
        params.per_page ||
        CONFIG.TASKS_PER_PAGE;

      const proxima = haProximaPagina(response, page);
      const podeTerMais = proxima === true || (proxima === null && data.length >= perPageEsperado);
      if (podeTerMais) {
        page++;
        contadorPaginas++;
        await esperar(CONFIG.DELAY_BETWEEN_REQUESTS);
        continue;
      }

      if (proxima === false || data.length < perPageEsperado) {
        hasMoreData = false;
      }
    } catch (error) {
      const status = error?.response?.status;
      if (status === 429 || status === 503) {
        const retryAfterMs = parseRetryAfterMs(error?.response?.headers?.['retry-after']);
        const espera = retryAfterMs ?? 60000;
        console.warn(`Limite ou instabilidade na pagina ${page}; aguardando ${espera}ms e tentando novamente.`);
        bloqueadoAte = Math.max(bloqueadoAte, Date.now() + espera);
        await esperar(espera);
        continue;
      }
      throw error;
    }
  }

  if (contadorPaginas >= MAX_PAGES_SAFETY) {
    console.warn('Atingiu limite de paginas em negÇücios; possivel paginacao interminavel.');
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
    console.error(`URL: ${error.response.config.url}`);
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
