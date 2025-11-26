// server/services/agendor.js
// 🔹 Versão otimizada e segura — busca direta de tarefas com filtros dinâmicos

const axios = require('axios');

const API_AGENDOR_URL = process.env.API_AGENDOR_URL || 'https://api.agendor.com.br/v3';
const API_AGENDOR_TOKEN = process.env.API_AGENDOR_TOKEN; // ⚠️ deve conter só o token (sem a palavra "Token")

const CONFIG = {
  TASKS_PER_PAGE: 100,
  DELAY_BETWEEN_REQUESTS: 400 // ms entre páginas
};

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
  let todas = [];
  let page = 1;
  let hasMoreData = true;

  while (hasMoreData) {
    const params = {
      page,
      per_page: CONFIG.TASKS_PER_PAGE
    };

    if (dataInicio) params.dueDateGt = dataInicio;
    if (dataFim) params.dueDateLt = dataFim;

    const url = `${API_AGENDOR_URL}/tasks`;

    const response = await axios.get(url, {
      headers: {
        Authorization: `Token ${API_AGENDOR_TOKEN}`, // ✅ CORRIGIDO: inclui a palavra "Token"
        'Content-Type': 'application/json'
      },
      params
    });

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