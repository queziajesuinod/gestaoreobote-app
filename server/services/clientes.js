const { Cliente, Cota, Consultor, Sequelize } = require('../models'); // Importa os models inicializados

const { Op } = Sequelize;

const sanitizeDigits = (value) => {
  if (value === null || value === undefined) return '';
  return value.toString().replace(/\D/g, '');
};

const normalizeEmail = (value) => {
  if (!value) return '';
  return value.toString().trim();
};

const normalizeEmailLower = (value) => normalizeEmail(value).toLowerCase();

function buildDuplicateWhere({ cpf, emailLower }) {
  const conditions = [];

  if (cpf) {
    conditions.push({ cpf });
  }

  if (emailLower) {
    conditions.push(
      Sequelize.where(Sequelize.fn('LOWER', Sequelize.col('email')), emailLower)
    );
  }

  return conditions;
}

async function assertClienteNaoDuplicado({ cpf = '', emailLower = '' }, ignoreId = null) {
  const orConditions = buildDuplicateWhere({ cpf, emailLower });

  if (orConditions.length === 0) {
    return;
  }

  const where = {
    [Op.or]: orConditions
  };

  if (ignoreId) {
    where.id = { [Op.ne]: ignoreId };
  }

  const existente = await Cliente.findOne({ where });
  if (existente) {
    let mensagem = 'Já existe um cliente cadastrado com os mesmos dados informados.';
    if (cpf && emailLower) {
      mensagem = 'Já existe um cliente cadastrado com este CPF ou e-mail.';
    } else if (cpf) {
      mensagem = 'Já existe um cliente cadastrado com este CPF.';
    } else if (emailLower) {
      mensagem = 'Já existe um cliente cadastrado com este e-mail.';
    }

    const erro = new Error(mensagem);
    erro.status = 409;
    throw erro;
  }
}

// 🧩 Lista todos os clientes
async function getTodosClientes() {
  const atributosBase = [
    'id',
    'nome',
    'cpf',
    'cidade',
    'estado',
    'dtnascimento',
    'profissao',
    'celular',
    'email',
    'createdAt',
    'updatedAt'
  ];

  return Cliente.findAll({
    attributes: [
      ...atributosBase,
      [Sequelize.fn('COUNT', Sequelize.col('cotas.id')), 'totalCotas']
    ],
    include: [
      {
        model: Cota,
        as: 'cotas',
        attributes: [],
        required: false
      }
    ],
    group: atributosBase.map(campo => `Cliente.${campo}`),
    order: [['nome', 'ASC']]
  });
}

async function getClientesPorConsultor(consultorId) {
  if (!consultorId) {
    return [];
  }

  const atributosBase = [
    'id',
    'nome',
    'cpf',
    'cidade',
    'estado',
    'dtnascimento',
    'profissao',
    'celular',
    'email',
    'createdAt',
    'updatedAt'
  ];

  return Cliente.findAll({
    attributes: [
      ...atributosBase,
      [Sequelize.fn('COUNT', Sequelize.fn('DISTINCT', Sequelize.col('cotas.id'))), 'totalCotas']
    ],
    include: [
      {
        model: Cota,
        as: 'cotas',
        attributes: [],
        required: true,
        include: [
          {
            model: Consultor,
            as: 'consultores',
            attributes: [],
            through: { attributes: [] },
            required: true,
            where: { id: consultorId }
          }
        ]
      }
    ],
    group: atributosBase.map(campo => `Cliente.${campo}`),
    order: [['nome', 'ASC']]
  });
}

async function consultorTemAcessoAoCliente(clienteId, consultorId) {
  if (!clienteId || !consultorId) {
    return false;
  }

  const total = await Cota.count({
    where: { clienteId },
    include: [
      {
        model: Consultor,
        as: 'consultores',
        attributes: [],
        through: { attributes: [] },
        required: true,
        where: { id: consultorId }
      }
    ],
    distinct: true
  });

  return total > 0;
}

// 🧩 Busca cliente pelo ID
async function getClienteById(id) {
  const cliente = await Cliente.findByPk(id);
  if (!cliente) throw new Error('Cliente não encontrado');
  return cliente;
}

// 🧩 Cria novo cliente
async function createCliente(body) {
  const {
    nome,
    cpf,
    cidade,
    estado,
    dtnascimento,
    profissao,
    celular,
    email
  } = body;

  const cpfSanitizado = sanitizeDigits(cpf);
  const celularSanitizado = sanitizeDigits(celular);
  const emailNormalizado = normalizeEmail(email);
  const emailLower = normalizeEmailLower(email);

  await assertClienteNaoDuplicado({ cpf: cpfSanitizado, emailLower });

  const novoCliente = await Cliente.create({
    nome,
    cpf: cpfSanitizado || null,
    cidade,
    estado,
    dtnascimento,
    profissao,
    celular: celularSanitizado,
    email: emailNormalizado
  });
  return novoCliente;
}

// 🧩 Atualiza cliente existente
async function atualizarCliente(id, dadosAtualizados) {
  const cliente = await Cliente.findByPk(id);
  if (!cliente) throw new Error('Cliente não encontrado');
  const payload = { ...dadosAtualizados };

  if (Object.prototype.hasOwnProperty.call(payload, 'cpf')) {
    payload.cpf = sanitizeDigits(payload.cpf) || null;
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'celular')) {
    payload.celular = sanitizeDigits(payload.celular);
  }

  if (Object.prototype.hasOwnProperty.call(payload, 'email')) {
    payload.email = normalizeEmail(payload.email);
  }

  const possuiCpfNoPayload = Object.prototype.hasOwnProperty.call(payload, 'cpf');
  const cpfSanitizado = possuiCpfNoPayload
    ? (payload.cpf || '')
    : (cliente.cpf || '');

  const possuiEmailNoPayload = Object.prototype.hasOwnProperty.call(payload, 'email');
  const emailLower = possuiEmailNoPayload
    ? normalizeEmailLower(payload.email || '')
    : normalizeEmailLower(cliente.email || '');

  await assertClienteNaoDuplicado({ cpf: cpfSanitizado, emailLower }, cliente.id);

  await cliente.update(payload);
  return cliente;
}

// 🧩 Deleta cliente
async function deletarCliente(id) {
  const cliente = await Cliente.findByPk(id);
  if (!cliente) throw new Error('Cliente não encontrado');
  const totalCotasDoCliente = await Cota.count({ where: { clienteId: id } });
  if (totalCotasDoCliente > 0) {
    const erro = new Error('Este cliente possui cotas vinculadas. Remova ou mova as cotas antes de excluir o cliente.');
    erro.status = 409;
    erro.codigo = 'CLIENTE_POSSUI_COTAS';
    throw erro;
  }
  await cliente.destroy();
  return { mensagem: 'Cliente removido com sucesso' };
}

module.exports = {
  getTodosClientes,
  getClientesPorConsultor,
  consultorTemAcessoAoCliente,
  getClienteById,
  createCliente,
  atualizarCliente,
  deletarCliente
};
