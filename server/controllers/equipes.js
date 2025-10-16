const { getTodosEquipes, createEquipe, getEquipeslById, atualizarEquipe, deletarEquipe } = require("../services/equipes");

async function getEquipes(req, res) {
  try {
    const equipes = await getTodosEquipes();
    res.status(200).json(equipes);
  } catch (error) {
    console.error('Erro ao buscar Equipes:', error);
    res.status(500).send('Erro interno do servidor');
  }
}

async function getEquipeDetalhe(req, res) {
  try {
    const equipe = await getEquipeslById(req.params.id);
    res.status(200).json(equipe);
  } catch (error) {
    console.error('Erro ao buscar Equipe:', error);
    res.status(500).send('Erro interno do servidor');
  }
}

async function postEquipe(req, res) {
  try {
    const equipe = await createEquipe(req.body);
    res.status(201).json(equipe);
  } catch (error) {
    console.error('Erro ao criar Equipe:', error);
    res.status(500).send({ message: error.message });
  }
}

async function putEquipe(req, res) {
  try {
    if (!req.params.id) {
      return res.status(400).json({ erro: 'ID da Equipe é obrigatório' });
    }

    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({ erro: 'Dados para atualização são obrigatórios' });
    }

    const equipe = await atualizarEquipe(req.params.id, req.body);
    return res.status(200).json(equipe);
  } catch (error) {
    console.error('Erro ao atualizar Equipe:', error);
    return res.status(400).json({ erro: error.message });
  }
}

async function delEquipe(req, res) {
  try {
    if (!req.params.id) {
      return res.status(400).json({ erro: 'ID da Equipe é obrigatório' });
    }

    const resposta = await deletarEquipe(req.params.id);
    return res.status(200).json(resposta);
  } catch (error) {
    console.error('Erro ao deletar equipe:', error);
    return res.status(400).json({ erro: error.message });
  }
}

module.exports = {
  getEquipes,
  postEquipe,
  putEquipe,
  delEquipe,
  getEquipeDetalhe
};
