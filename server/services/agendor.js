// server/services/agendor.js
// 🔹 Versão otimizada e segura — busca direta de tarefas com filtros dinâmicos

const axios = require('axios');

const API_AGENDOR_URL = process.env.API_AGENDOR_URL || 'https://api.agendor.com.br/v3';
const API_AGENDOR_TOKEN = process.env.API_AGENDOR_TOKEN; // ⚠️ deve conter só o token (sem a palavra "Token")

const CONFIG = {
  TASKS_PER_PAGE: 100,
  DELAY_BETWEEN_REQUESTS: 400, // ms entre poginas
  MAX_RETRIES: 3,
  RETRY_BASE_DELAY: 1000
};

const inflightTarefas = new Map();

// ===================== FUNÇÃO PRINCIPAL =====================
async function buscarTarefas({ consultores = [], tipo, dataInicio, dataFim }) {
  try {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`🔍 INICIANDO BUSCA DIRETA DE TAREFAS`);
    console.log(`${'='.repeat(60)}`);
    console.log(`📅 Período: ${dataInicio || 'Sem início'} → ${dataFim || 'Sem fim'}`);
    console.log(`👥 Consultores: ${consultores.length > 0 ? consultores.join(', ') : 'Todos'}`);
    console.log(`📋 Tipo: ${tipo || 'Todos'}`);
    console.log(`${'='.repeat(60)}\n`);

    const tarefas = await buscarTarefasPorRange({ dataInicio, dataFim });

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
async function buscarTarefasPorRange({ dataInicio, dataFim }) {
  const chave = `${dataInicio || 'sem-inicio'}_${dataFim || 'sem-fim'}`;
  if (inflightTarefas.has(chave)) {
    console.log(`🔄 Usando chamada em andamento para tarefas (${chave})`);
    return inflightTarefas.get(chave);
  }

  const promessa = (async () => {
    let todas = [];
    let page = 1;
    let hasMoreData = true;

    while (hasMoreData) {
      const params = {
        page,
        per_page: CONFIG.TASKS_PER_PAGE
      };

      if (dataInicio) params.finishedDateGt = dataInicio;
      if (dataFim) params.finishedDateLt = dataFim;

      const url = `${API_AGENDOR_URL}/tasks`;

      const response = await fetchComRetry(url, { params });

      const data = response.data.data || [];
      todas = [...todas, ...data];

      console.log(`📄 Página ${page}: ${data.length} tarefas`);

      if (data.length < CONFIG.TASKS_PER_PAGE) {
        hasMoreData = false;
      } else {
        page++;
        await esperar(CONFIG.DELAY_BETWEEN_REQUESTS);
      }
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

async function fetchComRetry(url, { params, tentativa = 1 }) {
  try {
    return await axios.get(url, {
      headers: {
        Authorization: `Token ${API_AGENDOR_TOKEN}`, // �o. CORRIGIDO: inclui a palavra "Token"
        'Content-Type': 'application/json'
      },
      params
    });
  } catch (error) {
    const status = error?.response?.status;
    const podeTentarNovamente =
      tentativa < CONFIG.MAX_RETRIES &&
      (status === 429 || status === 503);

    if (podeTentarNovamente) {
      const espera = CONFIG.RETRY_BASE_DELAY * tentativa;
      console.warn(`⏳ Retry (${tentativa}/${CONFIG.MAX_RETRIES}) para ${url} após ${espera}ms - status ${status}`);
      await esperar(espera);
      return fetchComRetry(url, { params, tentativa: tentativa + 1 });
    }

    throw error;
  }
}

async function buscarNegociosPorRangePorStatus({ dataInicio, dealStatus }) {
  let todasNegocios = [];
  let page = 1;
  let hasMoreData = true;

  while (hasMoreData) {
    const params = {
      page,
      per_page: CONFIG.TASKS_PER_PAGE
    };

    if (dataInicio) params.since = dataInicio;
    params.dealStatus = dealStatus;

    const url = `${API_AGENDOR_URL}/deals/stream`;

    const response = await axios.get(url, {
      headers: {
        Authorization: `Token ${API_AGENDOR_TOKEN}`, // ✅ CORRIGIDO: inclui a palavra "Token"
        'Content-Type': 'application/json'
      },
      params
    });

    const data = response.data.data || [];
    todasNegocios = [...todasNegocios, ...data];

    console.log(`📄 Página ${page}: ${data.length} negócios`);

    if (data.length < CONFIG.TASKS_PER_PAGE) {
      hasMoreData = false;
    } else {
      page++;
      await esperar(CONFIG.DELAY_BETWEEN_REQUESTS);
    }
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