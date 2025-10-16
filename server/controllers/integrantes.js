const { getTodosIntegrantes, createIntegrante, getIntegranteslById,deletarIntegrante ,getIntegrantesByEquipeId} = require("../services/integrantes");

async function getIntegrantes(req, res) {
  try {
    const integrantes = await getTodosIntegrantes();
    res.status(200).json(integrantes);
  } catch (error) {
    console.error('Erro ao buscar Integrantes:', error);
    res.status(500).send('Erro interno do servidor');
  }
}

async function getIntegranteDetalhe(req, res) {
  try {
    const integrante = await getIntegranteslById(req.params.id);
    res.status(200).json(integrante);
  } catch (error) {
    console.error('Erro ao buscar Integrante:', error);
    res.status(500).send('Erro interno do servidor');
  }
}

async function getIntegrantesByEquipe(req, res) {
   try {
    const { equipeId } = req.params;
    const integrantes = await getIntegrantesByEquipeId(equipeId);

    const resultado = integrantes.map(i => ({
      id: i.id,
      funcao: i.funcao,
      equipeId: i.equipeId,
      consultor: i.consultor ? {
        id: i.consultor.id,
        nome: i.consultor.nome,
        id_agendor: i.consultor.id_agendor,
        ativo: i.consultor.ativo,
        imagem_base64: i.consultor.imagem_base64
      } : null
    }));

    res.json(resultado);
  } catch (error) {
    console.error('❌ Erro ao buscar integrantes da equipe:', error);
    res.status(500).json({ message: 'Erro ao buscar integrantes da equipe', error: error.message });
  }
}


async function postIntegrante(req, res) {
  try {
    const integrante = await createIntegrante(req.body);
    res.status(201).json(integrante);
  } catch (error) {
    console.error('Erro ao criar Integrante:', error);
    res.status(500).send({ message: error.message });
  }
}

async function delIntegrante(req, res) {
  try {
    if (!req.params.id) {
      return res.status(400).json({ erro: 'ID do Integrante é obrigatório' });
    }

    const resposta = await deletarIntegrante(req.params.id);
    return res.status(200).json(resposta);
  } catch (error) {
    console.error('Erro ao deletar integrante:', error);
    return res.status(400).json({ erro: error.message });
  }
}

module.exports = {
  getIntegrantes,
  postIntegrante,
  getIntegranteDetalhe,
  delIntegrante,
  getIntegrantesByEquipe
};
