const { Consultor } = require('../models');  // Importa o modelo inicializado


async function getTodosConsultores() {
  const consultores = await Consultor.findAll();
  return consultores;
}

async function getConsultorById(id) {
  const consultor = await Consultor.findByPk(id);
  return consultor;
}

async function createConsultor(body) {
  const { nome, id_agendor, ativo, imagem_base64 } = body;
  const newConsultor = await Consultor.create({
    id_agendor,
    nome,
    ativo,
    imagem_base64
  });
  return newConsultor;
}

   async function atualizarConsultor(id, dadosAtualizados) {
    const consultor = await Consultor.findByPk(id);
    return await consultor.update(dadosAtualizados);
  }

   async function deletarConsultor(id) {
    const consultor = await Consultor.findByPk(id);
    await consultor.destroy();
    return { mensagem: 'Consultor removido com sucesso' };
  }

module.exports = {
  getTodosConsultores,
  createConsultor,
  getConsultorById,
  deletarConsultor,
  atualizarConsultor
};
