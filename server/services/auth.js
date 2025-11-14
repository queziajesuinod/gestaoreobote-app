const { sign } = require('jsonwebtoken');
const { Op } = require('sequelize');
const crypto = require('crypto');
const {
  User,
  Perfil,
  Consultor,
  Permissao
} = require('../models');
require('dotenv').config();

function hashSHA256WithSalt(password, salt) {
  return crypto.createHmac('sha256', salt).update(password).digest('hex');
}

class AuthService {
  static async login(dto) {
    // Buscar usuário pelo e-mail
    const usuario = await User.findOne({
      attributes: ['id', 'name', 'email', 'username', 'passwordHash', 'salt', 'perfilId', 'consultorId', 'active', 'image'],
      where: { email: dto.email },
      include: [
        {
          model: Perfil,
          attributes: ['id', 'descricao'],
          required: false,
          include: [
            {
              model: Permissao,
              as: 'permissoes',
              attributes: ['nome']
            }
          ]
        },
        {
          model: Consultor,
          as: 'consultor',
          attributes: ['id', 'nome']
        }
      ]
    });

    if (!usuario) {
      throw new Error('Usuário não cadastrado');
    }

    if (usuario.active === false) {
      throw new Error('Usuário inativo. Entre em contato com o administrador.');
    }

    // Gerar hash da senha enviada com o salt
    const hash = hashSHA256WithSalt(dto.password, usuario.salt);

    // Comparar com o hash armazenado
    if (hash !== usuario.passwordHash) {
      throw new Error('Usuário ou senha inválido');
    }

    const perfilDescricao = usuario.Perfil?.descricao?.toUpperCase() || 'USUARIO';

    const permissoesPerfil = usuario.Perfil?.permissoes
      ?.map((permissao) => (permissao.nome || '').trim().toUpperCase())
      .filter(Boolean) || [];

    const permissoesSet = new Set(permissoesPerfil);
    permissoesSet.add('DASHBOARD');

    let consultorId = usuario.consultorId || null;
    let consultorNome = usuario.consultor?.nome || null;

    if (perfilDescricao === 'ADMIN') {
      ['GESTAO', 'CLIENTES_ALL', 'USERS_MANAGE'].forEach((permissao) => permissoesSet.add(permissao));
    }

    if (perfilDescricao === 'RH') {
      permissoesSet.add('CLIENTES_ALL');
    }

    if (perfilDescricao === 'GESTOR') {
      permissoesSet.add('CLIENTES_ALL');
    }

    if (perfilDescricao === 'CONSULTOR') {
      permissoesSet.add('CLIENTES_OWN');
    }

    if (consultorId) {
      permissoesSet.add('CLIENTES_OWN');
    }

    const permissoes = Array.from(permissoesSet);

    if (perfilDescricao === 'CONSULTOR' && !consultorId) {
      const whereClauses = [];
      if (usuario.username) {
        whereClauses.push({ id_agendor: usuario.username });
        const parsedId = parseInt(usuario.username, 10);
        if (!Number.isNaN(parsedId)) {
          whereClauses.push({ id: parsedId });
        }
      }
      if (usuario.email) {
        whereClauses.push({ id_agendor: usuario.email });
      }

      if (whereClauses.length > 0) {
        const consultor = await Consultor.findOne({
          attributes: ['id', 'nome'],
          where: {
            [Op.or]: whereClauses
          }
        });

        if (consultor) {
          consultorId = consultor.id;
          consultorNome = consultor.nome;
        }
      }
    }

    // Gerar token JWT
    const accessToken = sign(
      {
        userId: usuario.id,
        perfilId: usuario.perfilId,
        email: usuario.email,
        username: usuario.username,
        nome: usuario.name,
        perfil: perfilDescricao,
        permissoes,
        consultorId
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
      perfilDescricao,
      permissoes,
      consultorId,
      consultorNome,
      image: usuario.image,
      accessToken
    };
  }
}

module.exports = AuthService;
