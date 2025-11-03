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

// 🔹 Atualizar cota
async function atualizar(req, res) {
  try {
    const { id } = req.params;
    const cotaAtualizada = await cotaService.atualizarCota(id, req.body);
    res.json({ mensagem: 'Cota atualizada com sucesso', dados: cotaAtualizada });
  } catch (error) {
    console.error('❌ Erro ao atualizar cota:', error);
    res.status(500).json({ message: 'Erro ao atualizar cota', error: error.message });
  }
}

// 🔹 Deletar cota
async function deletar(req, res) {
  try {
    const { id } = req.params;
    const resultado = await cotaService.deletarCota(id);
    res.json({ mensagem: resultado.mensagem });
  } catch (error) {
    console.error('❌ Erro ao deletar cota:', error);
    res.status(500).json({ message: 'Erro ao deletar cota', error: error.message });
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
  atualizar,
  deletar,
  buscarPorConsultor,
  buscarPorPeriodo
};
