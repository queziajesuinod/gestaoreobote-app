const { getTodosConsultores, createConsultor, getConsultorById,atualizarConsultor,deletarConsultor } = require("../services/consultores");

async function getConsultors(req, res) {
  try {
    const consultores = await getTodosConsultores();
    res.status(200).json(consultores);
  } catch (error) {
    console.error('Erro ao buscar Consultors:', error);
    res.status(500).send('Erro interno do servidor');
  }
}

async function getConsultorDetalhe(req, res) {
  try {
    const consultor = await getConsultorById(req.params.id);
    res.status(200).json(consultor);
  } catch (error) {
    console.error('Erro ao buscar Consultor:', error);
    res.status(500).send('Erro interno do servidor');
  }
}

async function postConsultor(req, res) {
  try {
    const consultor = await createConsultor(req.body);
    res.status(201).json(consultor);
  } catch (error) {
    console.error('Erro ao criar Consultor:', error);
    res.status(500).send({ message: error.message });
  }
}

async function putConsultor(req, res) {
  try {
    if (!req.params.id) {
      return res.status(400).json({ erro: 'ID do Consultor é obrigatório' });
    }

    if (!req.body || Object.keys(req.body).length === 0) {
      return res.status(400).json({ erro: 'Dados para atualização são obrigatórios' });
    }

    const consultor = await atualizarConsultor(req.params.id, req.body);
    return res.status(200).json(consultor);
  } catch (error) {
    console.error('Erro ao atualizar consultor:', error);
    return res.status(400).json({ erro: error.message });
  }
}

async function delConsultor(req, res) {
  try {
    if (!req.params.id) {
      return res.status(400).json({ erro: 'ID da célula é obrigatório' });
    }

    const resposta = await deletarConsultor(req.params.id);
    return res.status(200).json(resposta);
  } catch (error) {
    console.error('Erro ao deletar consultor:', error);
    return res.status(400).json({ erro: error.message });
  }
}

module.exports = {
  getConsultors,
  postConsultor,
  getConsultorDetalhe,
  putConsultor,
  delConsultor
};
