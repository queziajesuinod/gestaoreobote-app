const cotaService = require('../services/cotas');

// 🔹 Criar nova cota
async function criar(req, res) {
  try {
    const novaCota = await cotaService.criarCota(req.body);
    res.status(201).json(novaCota);
  } catch (error) {
    console.error('❌ Erro ao criar cota:', error);
    res.status(500).json({ message: 'Erro ao criar cota', error });
  }
}

// 🔹 Listar todas
async function listar(req, res) {
  try {
    const cotas = await cotaService.listarCotas();
    res.json(cotas);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao listar cotas', error });
  }
}

// 🔹 Buscar por cliente
async function buscarPorCliente(req, res) {
  try {
    const cotas = await cotaService.buscarPorCliente(req.params.clienteId);
    res.json(cotas);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar cotas por cliente', error });
  }
}

// 🔹 Buscar por consultor
async function buscarPorConsultor(req, res) {
  try {
    const cotas = await cotaService.buscarPorConsultor(req.params.consultorId);
    res.json(cotas);
  } catch (error) {
    res.status(500).json({ message: 'Erro ao buscar cotas por consultor', error });
  }
}

// 🔹 Buscar por período e idagendor
async function buscarPorPeriodo(req, res) {
  try {
    const { inicio, fim, idagendor } = req.query;
    if (!inicio || !fim) {
      return res.status(400).json({ message: 'Parâmetros "inicio" e "fim" são obrigatórios' });
    }

    const cotas = await cotaService.buscarPorPeriodo(inicio, fim, idagendor);
    res.json({ dados: cotas });
  } catch (error) {
    console.error('❌ Erro ao buscar cotas por período:', error);
    res.status(500).json({ message: 'Erro ao buscar cotas por período', error });
  }
}

module.exports = {
  criar,
  listar,
  buscarPorCliente,
  buscarPorConsultor,
  buscarPorPeriodo
};
