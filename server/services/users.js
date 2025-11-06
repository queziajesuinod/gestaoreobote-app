const crypto = require('crypto');
const uuid = require('uuid');
const {
  User,
  Perfil,
  Permissao,
  Consultor
} = require('../models'); // Importa a partir de models/index.js

function hashSHA256WithSalt(password, salt) {
  return crypto.createHmac('sha256', salt).update(password).digest('hex');
}

async function getTodosUsers() {
  return User.findAll({
    include: [{
      model: Perfil,
      required: true,
      include: [{
        model: Permissao,
        as: 'permissoes',
        attributes: ['id', 'nome', 'descricao']
      }]
    }, {
      model: Consultor,
      as: 'consultor',
      attributes: ['id', 'nome', 'id_agendor']
    }]
  });
}

async function updateUser(id, updateData) {
  const user = await User.findByPk(id);
  if (!user) {
    throw new Error('Usuário não encontrado');
  }

  // Apenas atualiza os campos permitidos
  const fields = ['name', 'email', 'image', 'username', 'perfilId', 'active', 'consultorId'];
  fields.forEach(field => {
    if (updateData[field] !== undefined) {
      if (field === 'active') {
        user[field] = Boolean(updateData[field]);
      } else if (field === 'consultorId') {
        user[field] = updateData[field] ? Number(updateData[field]) : null;
      } else {
        user[field] = updateData[field];
      }
    }
  });

  await user.save();
  return user;
}

async function getUserById(id) {
  return User.findByPk(id, {
    include: [{
      model: Perfil,
      required: true,
      include: [{
        model: Permissao,
        as: 'permissoes',
        attributes: ['id', 'nome', 'descricao']
      }]
    }, {
      model: Consultor,
      as: 'consultor',
      attributes: ['id', 'nome', 'id_agendor']
    }]
  });
}

async function createUser(body) {
  const {
    name,
    email,
    active = true,
    perfilId,
    password,
    image,
    username,
    consultorId = null
  } = body;

  if (!perfilId) {
    throw new Error('Perfil é obrigatório.');
  }

  if (!password || password.length < 6) {
    throw new Error('A senha deve conter ao menos 6 caracteres.');
  }

  const salt = crypto.randomBytes(16).toString('hex');
  const passwordHash = hashSHA256WithSalt(password, salt);

  const newUser = await User.create({
    id: uuid.v4(),
    name,
    email,
    active: Boolean(active),
    perfilId,
    passwordHash,
    salt,
    image,
    username,
    consultorId: consultorId ? Number(consultorId) : null
  });
  return newUser;
}

module.exports = {
  getTodosUsers,
  createUser,
  getUserById,
  updateUser
};
