const { Op } = require('sequelize');
const { Consultor, User, Perfil } = require('../models');  // Importa os modelos inicializados
const { createUser } = require('./users');


async function getTodosConsultores() {
  const consultores = await Consultor.findAll();
  return consultores;
}

async function getConsultorById(id) {
  const consultor = await Consultor.findByPk(id);
  return consultor;
}

let perfilConsultorIdCache = null;

async function obterPerfilConsultorId() {
  if (perfilConsultorIdCache) return perfilConsultorIdCache;
  const perfil = await Perfil.findOne({
    where: {
      descricao: {
        [Op.iLike]: 'CONSULTOR'
      }
    }
  });
  if (!perfil) {
    throw new Error('Perfil "CONSULTOR" não encontrado. Cadastre o perfil antes de criar consultores.');
  }
  perfilConsultorIdCache = perfil.id;
  return perfil.id;
}

function removerAcentos(texto = '') {
  return texto.normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

function gerarUsernameBase(nome = '') {
  const partes = removerAcentos(nome)
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .map(parte => parte.toLowerCase());

  if (partes.length === 0) {
    return `consultor${Date.now()}`;
  }

  const primeiro = partes[0];
  const ultimo = partes.length > 1 ? partes[partes.length - 1] : '';
  const base = ultimo ? `${primeiro}.${ultimo}` : primeiro;
  return base.replace(/[^a-z0-9.]/g, '') || `consultor${Date.now()}`;
}

async function gerarUsernameDisponivel(base, transaction) {
  let username = base;
  let sufixo = 1;

  // eslint-disable-next-line no-await-in-loop
  while (await User.findOne({ where: { username }, transaction })) {
    username = `${base}${sufixo}`;
    sufixo += 1;
  }

  return username;
}

async function createConsultor(body) {
  const { nome, id_agendor, ativo = true, imagem_base64, email } = body;
  if (!nome) {
    throw new Error('Nome do consultor é obrigatório.');
  }
  if (!email) {
    throw new Error('Email do consultor é obrigatório.');
  }
  const emailNormalizado = email.trim().toLowerCase();

  const transaction = await Consultor.sequelize.transaction();
  try {
    const novoConsultor = await Consultor.create({
      id_agendor,
      nome,
      ativo,
      imagem_base64,
      email: emailNormalizado
    }, { transaction });

    await sincronizarUsuarioConsultor(novoConsultor, { transaction });

    await transaction.commit();
    return Consultor.findByPk(novoConsultor.id);
  } catch (error) {
    await transaction.rollback();
    throw error;
  }
}

function normalizarBoolean(valor) {
  if (typeof valor === 'boolean') return valor;
  if (typeof valor === 'number') return valor !== 0;
  if (typeof valor === 'string') {
    const normalizado = valor.trim().toLowerCase();
    if (['true', '1', 'sim', 'ativo'].includes(normalizado)) return true;
    if (['false', '0', 'não', 'nao', 'inativo'].includes(normalizado)) return false;
  }
  return Boolean(valor);
}

async function atualizarConsultor(id, dadosAtualizados) {
  const consultor = await Consultor.findByPk(id);
  const payload = { ...dadosAtualizados };
  if (Object.prototype.hasOwnProperty.call(payload, 'email') && payload.email) {
    payload.email = payload.email.trim().toLowerCase();
  }
  const atualizado = await consultor.update(payload);

  if (Object.prototype.hasOwnProperty.call(dadosAtualizados, 'ativo')) {
    const novoStatusAtivo = normalizarBoolean(dadosAtualizados.ativo);
    if (!novoStatusAtivo) {
      await User.update(
        { active: false },
        { where: { consultorId: consultor.id } }
      );
    }
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'email') && payload.email) {
    await User.update(
      { email: payload.email },
      { where: { consultorId: consultor.id } }
    );
  }

  await sincronizarUsuarioConsultor(await Consultor.findByPk(consultor.id));

  return atualizado;
}

async function deletarConsultor(id) {
  const consultor = await Consultor.findByPk(id);
  await consultor.destroy();
  await User.update(
    { active: false },
    { where: { consultorId: id } }
  );
  return { mensagem: 'Consultor removido com sucesso' };
}

async function sincronizarUsuarioConsultor(consultor, { transaction } = {}) {
  if (!consultor) return null;
  const ativo = normalizarBoolean(consultor.ativo);
  const emailNormalizado = (consultor.email || '').trim().toLowerCase();

  if (!emailNormalizado) {
    console.warn(`⚠️ Consultor ${consultor.id} sem email. Não é possível garantir usuário.`);
    return null;
  }

  const nome = consultor.nome || 'Consultor';

  let usuario = await User.findOne({
    where: { consultorId: consultor.id },
    transaction
  });

  if (usuario) {
    const updates = {};
    if (usuario.email !== emailNormalizado) updates.email = emailNormalizado;
    if (usuario.name !== nome) updates.name = nome;
    if (usuario.active !== ativo) updates.active = ativo;

    if (Object.keys(updates).length) {
      await usuario.update(updates, { transaction });
    }
    return usuario;
  }

  usuario = await User.findOne({
    where: { email: emailNormalizado },
    transaction
  });

  if (usuario) {
    await usuario.update({
      consultorId: consultor.id,
      name: nome,
      active: ativo
    }, { transaction });
    return usuario;
  }

  if (!ativo) {
    return null;
  }

  const perfilConsultorId = await obterPerfilConsultorId();
  const usernameBase = gerarUsernameBase(nome);
  const username = await gerarUsernameDisponivel(usernameBase, transaction);

  return createUser({
    name: nome,
    email: emailNormalizado,
    username,
    password: 'genesis26#',
    perfilId: perfilConsultorId,
    consultorId: consultor.id,
    active: true
  }, { transaction });
}

module.exports = {
  getTodosConsultores,
  createConsultor,
  getConsultorById,
  deletarConsultor,
  atualizarConsultor
};
