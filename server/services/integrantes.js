const { Integrante, Consultor } = require('../models');  // Importa o modelo inicializado


async function getTodosIntegrantes() {
    const integrantes = await Integrante.findAll();
    return integrantes;
}

async function getIntegranteById(id) {
    const integrante = await Integrante.findByPk(id);
    return integrante;
}


async function getIntegrantesByEquipeId(equipeId) {
  if (!equipeId) {
    throw new Error('O campo equipeId é obrigatório');
  }

  const integrantes = await Integrante.findAll({
    where: { equipeId },
    include: [
      {
        model: Consultor,
        as: 'consultor', // o alias deve bater com o que está no associate()
        attributes: ['id', 'nome', 'id_agendor', 'ativo', 'imagem_base64'],
      }
    ],
    order: [['createdAt', 'ASC']],
  });

  return integrantes;
}



async function createIntegrante(body) {
  const { funcao, equipeId, consultorId } = body;

  if (!funcao || !equipeId || !consultorId) {
    throw new Error('Campos obrigatórios: funcao, equipeId e consultorId');
  }

  const integrante = await Integrante.create({
    funcao,
    equipeId,
    consultorId,
  });

  return integrante;
}

async function deletarIntegrante(id) {
  const integrante = await Integrante.findByPk(id);
  await integrante.destroy();
  return { mensagem: 'Integrante removido com sucesso' };
}

module.exports = {
    getTodosIntegrantes,
    createIntegrante,
    getIntegranteById,
    deletarIntegrante,
    getIntegrantesByEquipeId
};
