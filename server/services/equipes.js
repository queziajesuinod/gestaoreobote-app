const { Equipe } = require('../models');  // Importa o modelo inicializado


async function getTodosEquipes() {
  const equipes = await Equipe.findAll();
  return equipes;
}

async function getEquipeById(id) {
  const equipe = await Equipe.findByPk(id);
  return equipe;
}

async function createEquipe(dados) {
  console.log('Dados recebidos para criação:', dados);

  const equipe = await Equipe.create({ descricao: dados.descricao });
  console.log('Equipe criada no banco de dados:', equipe);

  return equipe;
}

async function atualizarEquipe(id, dados) {
  try {
    // Primeiro busca a equipe
    const equipe = await Equipe.findByPk(id);
    
    if (!equipe) {
      throw new Error('Equipe não encontrada');
    }

    // Atualiza usando o método de instância
    await equipe.update({
      descricao: dados.descricao
    });

    return equipe;
  } catch (error) {
    throw new Error(`Erro ao atualizar equipe: ${error.message}`);
  }
}

async function deletarEquipe(id) {
  const equipe = await Equipe.findByPk(id);
  await equipe.destroy();
  return { mensagem: 'Equipe removida com sucesso' };
}

module.exports = {
  getTodosEquipes,
  createEquipe,
  deletarEquipe,
  atualizarEquipe,
  getEquipeById
};
