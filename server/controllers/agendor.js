// server/controllers/agendorController.js
const { buscarTarefasPorRange } = require('../services/agendor');

let cacheTarefas = [];
let ultimoFiltro = {};

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
