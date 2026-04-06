const {
  getTodosPerfis,
  createPerfil,
  getPerfilById,
  getPermissoesPorPerfil,
  atualizarPermissoesDoPerfil,
  getPermissoesDisponiveis
} = require('../services/perfil');

const ehAdminOuMaster = (perfilToken = '') => {
  const perfilNormalizado = String(perfilToken || '').toUpperCase();
  return perfilNormalizado === 'ADMIN' || perfilNormalizado === 'MASTER';
};

async function getPerfils(req, res) {
  try {
    const perfilToken = req.user?.perfil ? req.user.perfil.toUpperCase() : '';
    if (!ehAdminOuMaster(perfilToken)) {
      return res.status(403).json({ message: 'Apenas administradores podem visualizar perfis.' });
    }

    const perfils = await getTodosPerfis();
    return res.status(200).json(perfils);
  } catch (error) {
    console.error('Erro ao buscar perfils:', error);
    return res.status(500).send('Erro interno do servidor');
  }
}

async function getPerfilDetalhe(req, res) {
  try {
    const perfilToken = req.user?.perfil ? req.user.perfil.toUpperCase() : '';
    if (!ehAdminOuMaster(perfilToken)) {
      return res.status(403).json({ message: 'Apenas administradores podem visualizar perfis.' });
    }

    const perfil = await getPerfilById(req.params.id);
    return res.status(200).json(perfil);
  } catch (error) {
    console.error('Erro ao buscar perfil:', error);
    return res.status(500).send('Erro interno do servidor');
  }
}

async function postPerfil(req, res) {
  try {
    const perfilToken = req.user?.perfil ? req.user.perfil.toUpperCase() : '';
    if (!ehAdminOuMaster(perfilToken)) {
      return res.status(403).json({ message: 'Apenas administradores podem criar perfis.' });
    }

    const perfil = await createPerfil(req.body);
    return res.status(201).json(perfil);
  } catch (error) {
    console.error('Erro ao criar perfil:', error);
    return res.status(500).send({ message: error.message });
  }
}

async function getPermissoes(req, res) {
  try {
    const perfilToken = req.user?.perfil ? req.user.perfil.toUpperCase() : '';
    if (!ehAdminOuMaster(perfilToken)) {
      return res.status(403).json({ message: 'Apenas administradores podem visualizar permissões.' });
    }

    const permissoes = await getPermissoesPorPerfil(req.params.id);
    return res.status(200).json({ dados: permissoes });
  } catch (error) {
    console.error('Erro ao buscar permissões:', error);
    return res.status(500).send({ message: error.message });
  }
}

async function updatePermissoes(req, res) {
  try {
    const perfilToken = req.user?.perfil ? req.user.perfil.toUpperCase() : '';
    if (!ehAdminOuMaster(perfilToken)) {
      return res.status(403).json({ message: 'Apenas administradores podem alterar permissões.' });
    }

    const permissoes = Array.isArray(req.body.permissoes) ? req.body.permissoes : [];
    const resultado = await atualizarPermissoesDoPerfil(req.params.id, permissoes);
    return res.status(200).json({ mensagem: 'Permissões atualizadas com sucesso.', dados: resultado });
  } catch (error) {
    console.error('Erro ao atualizar permissões:', error);
    return res.status(500).send({ message: error.message });
  }
}

async function getPermissoesCatalogo(req, res) {
  try {
    const perfilToken = req.user?.perfil ? req.user.perfil.toUpperCase() : '';
    if (!ehAdminOuMaster(perfilToken)) {
      return res.status(403).json({ message: 'Apenas administradores podem visualizar permissões.' });
    }

    const permissoes = await getPermissoesDisponiveis();
    return res.status(200).json({ dados: permissoes });
  } catch (error) {
    console.error('Erro ao listar permissões:', error);
    return res.status(500).send({ message: error.message });
  }
}

module.exports = {
  getPerfils,
  postPerfil,
  getPerfilDetalhe,
  getPermissoes,
  updatePermissoes,
  getPermissoesCatalogo
};
