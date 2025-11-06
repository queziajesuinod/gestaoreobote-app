const uuid = require('uuid');
const { Perfil, Permissao } = require('../models');

async function getTodosPerfis() {
  return Perfil.findAll({
    include: [
      {
        model: Permissao,
        as: 'permissoes',
        attributes: ['id', 'nome', 'descricao']
      }
    ],
    order: [['descricao', 'ASC']]
  });
}

async function getPerfilById(id) {
  return Perfil.findByPk(id, {
    include: [
      {
        model: Permissao,
        as: 'permissoes',
        attributes: ['id', 'nome', 'descricao']
      }
    ]
  });
}

async function createPerfil(body) {
  const { descricao } = body;
  const newPerfil = await Perfil.create({
    id: uuid.v4(),
    descricao
  });
  return newPerfil;
}

async function getPermissoesPorPerfil(perfilId) {
  return Permissao.findAll({
    where: { perfilId },
    attributes: ['id', 'nome', 'descricao']
  });
}

async function atualizarPermissoesDoPerfil(perfilId, permissoes = []) {
  const perfil = await Perfil.findByPk(perfilId);
  if (!perfil) {
    throw new Error('Perfil não encontrado');
  }

  const transaction = await Perfil.sequelize.transaction();
  try {
    await Permissao.destroy({ where: { perfilId }, transaction });

    const registros = (permissoes || [])
      .map((permissao) => {
        const nomeNormalizado = (permissao?.nome || '').trim().toUpperCase();
        if (!nomeNormalizado) {
          return null;
        }
        return {
          id: uuid.v4(),
          nome: nomeNormalizado,
          descricao: permissao?.descricao || null,
          perfilId
        };
      })
      .filter(Boolean);

    if (registros.length > 0) {
      await Permissao.bulkCreate(registros, { transaction });
    }

    await transaction.commit();
    return getPermissoesPorPerfil(perfilId);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

async function getPermissoesDisponiveis() {
  const permissoes = await Permissao.findAll({
    attributes: ['nome', 'descricao'],
    group: ['nome', 'descricao']
  });
  return permissoes;
}

module.exports = {
  getTodosPerfis,
  createPerfil,
  getPerfilById,
  getPermissoesPorPerfil,
  atualizarPermissoesDoPerfil,
  getPermissoesDisponiveis
};
