// server/controllers/agendorController.js
const { data } = require('autoprefixer');
const { buscarTarefasPorRange, buscarNegociosPorRangePorStatus } = require('../services/agendor');

const CACHE_TAREFAS_TTL_MS = 5 * 60 * 1000;
const CACHE_NEGOCIOS_TTL_MS = 5 * 60 * 1000;

const cacheTarefas = new Map();
const cacheNegocios = new Map();

const limparCacheExpirado = (mapa) => {
  const agora = Date.now();
  for (const [chave, entrada] of mapa.entries()) {
    if (entrada?.expiresAt && entrada.expiresAt <= agora) {
      mapa.delete(chave);
    }
  }
};

exports.getTarefas = async (req, res) => {
  try {
    const { dataInicio, dataFim, consultores, tipo, force } = req.query;

    if (!dataInicio || !dataFim) {
      return res.status(400).json({ error: 'dataInicio e dataFim sao obrigatorios' });
    }

    const chaveCache = [dataInicio, dataFim].join('_');
    limparCacheExpirado(cacheTarefas);
    const entradaCache = cacheTarefas.get(chaveCache);

    let baseTarefas;

    if (entradaCache && force !== 'true') {
      console.log('Servindo tarefas do cache local');
      baseTarefas = entradaCache.data;
    } else {
      console.log('Atualizando tarefas no cache...');
      baseTarefas = await buscarTarefasPorRange({ dataInicio, dataFim });
      cacheTarefas.set(chaveCache, { data: baseTarefas, expiresAt: Date.now() + CACHE_TAREFAS_TTL_MS });
    }

    let filtradas = [...baseTarefas];

    if (consultores) {
      const ids = consultores.split(',').map(String);
      filtradas = filtradas.filter(t => t.user?.id && ids.includes(String(t.user.id)));
    }

    if (tipo && tipo !== 'Todos') {
      filtradas = filtradas.filter(t => t.type?.toUpperCase() === tipo.toUpperCase());
    }

    const map = filtradas.map(t => ({
      id: t.id,
      tipo: t.type,
      titulo: t.text || t.title || 'Sem titulo',
      data: t.dueDate,
      consultor: t.user?.name || 'Desconhecido',
      consultorId: t.user?.id,
      dealId: t.deal?.id,
      dealTitulo: t.deal?.title || 'Sem titulo',
      empresa: t.organization?.name || t.person?.name || '-',
      status: t.finishedAt ? 'Concluida' : 'Pendente'
    }));

    res.json({
      periodo: { dataInicio, dataFim },
      total: map.length,
      tarefas: map
    });
  } catch (error) {
    console.error('Erro em getTarefas:', error.message);
    const detalhe = error?.response?.data || error?.message || 'Erro ao buscar tarefas';
    res.status(500).json({ error: 'Erro ao buscar tarefas', detalhe });
  }
};

exports.getNegocios = async (req, res) => {
  try {
    const { dataInicio, force, consultor, dealStatus } = req.query;

    if (!dataInicio) {
      return res.status(400).json({ error: 'dataInicio e obrigatorio' });
    }

    const statusKey = dealStatus || 'ALL';
    const chaveCache = [statusKey, dataInicio].join('_');
    limparCacheExpirado(cacheNegocios);
    const entradaCache = cacheNegocios.get(chaveCache);

    let baseNegocios;

    if (entradaCache && force !== 'true') {
      console.log(`Servindo negocios do cache local para dealStatus=${statusKey}`);
      baseNegocios = entradaCache.data;
    } else {
      console.log(`Atualizando negocios no cache para dealStatus=${statusKey}...`);
      const negociosAtualizados = await buscarNegociosPorRangePorStatus({ dataInicio, dealStatus });
      baseNegocios = Array.isArray(negociosAtualizados) ? negociosAtualizados : [];
      cacheNegocios.set(chaveCache, { data: baseNegocios, expiresAt: Date.now() + CACHE_NEGOCIOS_TTL_MS });
    }

    let negociosFiltrados = baseNegocios;

    if (consultor) {
      const consultores = consultor.split(',').map(c => c.trim());
      negociosFiltrados = negociosFiltrados.filter(n => consultores.includes(String(n.owner?.id)));
      console.log(`Filtrando ${negociosFiltrados.length} negocios por consultores: ${consultores.join(', ')}`);
    }

    const map = negociosFiltrados.map(n => ({
      id: n.id,
      titulo: n.title || 'Sem titulo',
      valor: n.value || 0,
      dataGanho: n.wonAt || n.endTime || n.updatedAt || '-',
      dataCriacao: n.createdAt || '-',
      consultorId: n.owner?.id || null,
      consultorNome: n.owner?.name || 'Desconhecido',
      etapa: n.dealStage?.name || '-',
      status: n.dealStatus?.name || '-'
    }));

    const resumoPorConsultor = {};
    let totalGeral = 0;

    map.forEach(n => {
      const nome = n.consultorNome || 'Desconhecido';
      resumoPorConsultor[nome] = (resumoPorConsultor[nome] || 0) + n.valor;
      totalGeral += n.valor;
    });

    res.json({
      periodo: { dataInicio },
      totalNegocios: map.length,
      totalValor: totalGeral,
      negocios: map
    });
  } catch (error) {
    console.error('Erro em getNegocios:', error.message);
    res.status(500).json({ error: 'Erro ao buscar negocios' });
  }
};
