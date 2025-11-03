// server/controllers/agendorController.js
const { data } = require('autoprefixer');
const { buscarTarefasPorRange, buscarNegociosPorRangePorStatus } = require('../services/agendor');

let cacheTarefas = [];
let ultimoFiltro = {};
let cacheNegocios = {};
let ultimoFiltroNegocios = {};

exports.getTarefas = async (req, res) => {
  try {
    const { dataInicio, dataFim, consultores, tipo, force } = req.query;

    if (!dataInicio || !dataFim) {
      return res.status(400).json({ error: 'dataInicio e dataFim são obrigatórios' });
    }

    // Evita refetch se já existe cache válido
    if (
      cacheTarefas.length > 0 &&
      ultimoFiltro.dataInicio === dataInicio &&
      ultimoFiltro.dataFim === dataFim &&
      force !== 'true'
    ) {
      console.log('⚡ Servindo tarefas do cache local');
    } else {
      console.log('🌀 Atualizando tarefas no cache...');
      cacheTarefas = await buscarTarefasPorRange({ dataInicio, dataFim });
      ultimoFiltro = { dataInicio, dataFim };
    }

    // Filtros dinâmicos
    let filtradas = [...cacheTarefas];

    if (consultores) {
      const ids = consultores.split(',').map(String);
      filtradas = filtradas.filter(t => t.user?.id && ids.includes(String(t.user.id)));
    }

    if (tipo && tipo !== 'Todos') {
      filtradas = filtradas.filter(t => t.type?.toUpperCase() === tipo.toUpperCase());
    }

    // Map simplificado
    const map = filtradas.map(t => ({
      id: t.id,
      tipo: t.type,
      titulo: t.text || t.title || 'Sem título',
      data: t.dueDate,
      consultor: t.user?.name || 'Desconhecido',
      consultorId: t.user?.id,
      dealId: t.deal?.id,
      dealTitulo: t.deal?.title || 'Sem título',
      empresa: t.organization?.name || t.person?.name || '—',
      status: t.finishedAt ? 'Concluída' : 'Pendente'
    }));

    res.json({
      periodo: { dataInicio, dataFim },
      total: map.length,
      tarefas: map
    });
  } catch (error) {
    console.error('❌ Erro em getTarefas:', error.message);
    res.status(500).json({ error: 'Erro ao buscar tarefas' });
  }
};

exports.getNegocios = async (req, res) => {
  try {
    const { dataInicio, force, consultor, dealStatus } = req.query;

    if (!dataInicio) {
      return res.status(400).json({ error: 'dataInicio é obrigatório' });
    }

    const statusKey = dealStatus || 'ALL';
    const cacheEntrada = cacheNegocios[statusKey] || [];
    const ultimoFiltroEntrada = ultimoFiltroNegocios[statusKey];

    // 🔹 Atualiza cache apenas se data mudou ou se force=true
    if (
      cacheEntrada.length > 0 &&
      ultimoFiltroEntrada?.dataInicio === dataInicio &&
      force !== 'true'
    ) {
      console.log(`⚡ Servindo negócios do cache local para dealStatus=${statusKey}`);
    } else {
      console.log(`🌀 Atualizando negócios no cache para dealStatus=${statusKey}...`);
      const negociosAtualizados = await buscarNegociosPorRangePorStatus({ dataInicio, dealStatus });
      cacheNegocios[statusKey] = Array.isArray(negociosAtualizados) ? negociosAtualizados : [];
      ultimoFiltroNegocios[statusKey] = { dataInicio };
    }

    // 🔹 Filtra os consultores, se informado
    let negociosFiltrados = cacheNegocios[statusKey] || [];

    if (consultor) {
      // Aceita lista de IDs separados por vírgula
      const consultores = consultor.split(',').map(c => c.trim());
      negociosFiltrados = negociosFiltrados.filter(n =>
        consultores.includes(String(n.owner?.id))
      );
      console.log(`🎯 Filtrando ${negociosFiltrados.length} negócios  por consultores: ${consultores.join(', ')}`);
    }

    // 🔹 Mapeamento dos campos
    const map = negociosFiltrados.map(n => ({
      id: n.id,
      titulo: n.title || 'Sem título',
      valor: n.value || 0,
      dataGanho: n.wonAt || n.endTime || n.updatedAt || '—',
      dataCriacao: n.createdAt || '—',
      consultorId: n.owner?.id || null,
      consultorNome: n.owner?.name || 'Desconhecido',
      etapa: n.dealStage?.name || '—',
      status: n.dealStatus?.name || '—'
    }));

    // 🔹 Resumo por consultor
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
    console.error('❌ Erro em getNegocios:', error.message);
    res.status(500).json({ error: 'Erro ao buscar negócios' });
  }
};
