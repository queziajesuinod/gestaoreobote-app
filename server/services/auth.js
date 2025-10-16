const { sign } = require('jsonwebtoken');
const { User } = require('../models');
const crypto = require('crypto');
require('dotenv').config();

class AuthService {
  async login(dto) {
    // Buscar usuário pelo e-mail
    const usuario = await User.findOne({
      attributes: ['id', 'name', 'email', 'username', 'passwordHash', 'salt', 'perfilId', 'active'],
      where: { email: dto.email }
    });

    if (!usuario) {
      throw new Error('Usuário não cadastrado');
    }

    // Gerar hash da senha enviada com o salt
    const hash = hashSHA256WithSalt(dto.password, usuario.salt);

    // Comparar com o hash armazenado
    if (hash !== usuario.passwordHash) {
      throw new Error('Usuário ou senha inválido');
    }

    // Gerar token JWT
    const accessToken = sign(
      {
        userId: usuario.id,
        perfilId: usuario.perfilId,
        email: usuario.email,
        username: usuario.username,
        nome: usuario.name
      },
      process.env.JWT_SECRET,
      { expiresIn: '8h' }
    );

    // Retornar token + dados do usuário
    return {
      id: usuario.id,
      name: usuario.name,
      email: usuario.email,
      username: usuario.username,
      perfilId: usuario.perfilId,
      active: usuario.active,
      accessToken
    };
  }
}

// Função auxiliar
function hashSHA256WithSalt(password, salt) {
  return crypto.createHmac('sha256', salt).update(password).digest('hex');
}

module.exports = AuthService;
