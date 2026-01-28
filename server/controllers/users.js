const {
  getTodosUsers, createUser, getUserById, updateUser, changeUserPassword
} = require('../services/users');

const ehAdminOuMaster = (perfilToken = '') => {
  const perfilNormalizado = String(perfilToken || '').toUpperCase();
  return perfilNormalizado === 'ADMIN' || perfilNormalizado === 'MASTER';
};

async function getUsers(req, res) {
  try {
    const perfilToken = req.user?.perfil ? req.user.perfil.toUpperCase() : '';
    if (!ehAdminOuMaster(perfilToken)) {
      return res.status(403).json({ message: 'Apenas administradores podem visualizar usuários.' });
    }

    const users = await getTodosUsers(); // Busca todos os usuários
    return res.status(200).json(users);
  } catch (error) {
    console.error('Erro ao buscar usuários:', error);
    return res.status(500).send('Erro interno do servidor');
  }
}

async function getUserDetalhe(req, res) {
  try {
    const perfilToken = req.user?.perfil ? req.user.perfil.toUpperCase() : '';
    const requesterId = req.user?.userId;
    const { id } = req.params;

    if (!ehAdminOuMaster(perfilToken) && requesterId !== id) {
      return res.status(403).json({ message: 'Acesso negado.' });
    }

    const user = await getUserById(id);
    if (!user) {
      return res.status(404).json({ message: 'Usuário não encontrado.' });
    }

    return res.status(200).json(user);
  } catch (error) {
    console.error('Erro ao buscar usuário:', error);
    return res.status(500).send('Erro interno do servidor');
  }
}

async function putUser(req, res) {
  try {
    const perfilToken = req.user?.perfil ? req.user.perfil.toUpperCase() : '';
    const requesterId = req.user?.userId;
    const { id } = req.params;
    const isAdmin = ehAdminOuMaster(perfilToken);
    const isSelf = requesterId === id;

    if (!isAdmin && !isSelf) {
      return res.status(403).json({ message: 'Acesso negado.' });
    }

    const { newPassword, currentPassword } = req.body || {};

    let payload = { ...req.body };
    delete payload.newPassword;
    delete payload.currentPassword;

    if (!isAdmin) {
      const allowedFields = ['name', 'email', 'username', 'image', 'agendorToken'];
      payload = allowedFields.reduce((acc, field) => {
        if (payload[field] !== undefined) {
          acc[field] = payload[field];
        }
        return acc;
      }, {});
    }

    if (newPassword) {
      await changeUserPassword(
        id,
        currentPassword,
        newPassword,
        { skipCurrentPasswordCheck: isAdmin && !isSelf && !currentPassword }
      );
    }

    const user = await updateUser(id, payload);
    return res.status(200).json(user);
  } catch (error) {
    console.error('Erro ao atualizar usuário:', error);
    return res.status(400).json({ message: error.message });
  }
}

async function postUsers(req, res) {
  try {
    const { perfil: perfilToken } = req.user || {};
    if (!perfilToken || !ehAdminOuMaster(perfilToken)) {
      return res.status(403).json({ message: 'Apenas administradores podem cadastrar usuários.' });
    }

    const user = await createUser(req.body); // Função de criação de usuário
    return res.status(201).json(user);
  } catch (error) {
    console.error('Erro ao criar usuário:', error);
    return res.status(400).send({ message: error.message });
  }
}

module.exports = {
  getUsers,
  postUsers,
  getUserDetalhe,
  putUser
};
