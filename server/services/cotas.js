const { Cota } = require('../models');
const { Op } = require('sequelize');

// 🔹 Criar nova cota
async function criarCota(data) {
  return await Cota.create(data);
}

// 🔹 Listar todas as cotas
async function listarCotas() {
  return await Cota.findAll();
}

// 🔹 Buscar por clienteId
async function buscarPorCliente(clienteId) {
  return await Cota.findAll({ where: { clienteId } });
}

// 🔹 Buscar por consultorId
async function buscarPorConsultor(consultorId) {
  return await Cota.findAll({ where: { consultorId } });
}

// 🔹 Buscar por range de data e (opcionalmente) idagendor
async function buscarPorPeriodo(inicio, fim, idagendor = null) {
  const where = {
    dtaquisicao: {
      [Op.between]: [new Date(inicio), new Date(fim)]
    }
  };
  if (idagendor) where.idagendor = idagendor;

  const cotas = await Cota.findAll({ where });
  return cotas;
}

module.exports = {
  criarCota,
  listarCotas,
  buscarPorCliente,
  buscarPorConsultor,
  buscarPorPeriodo
};
