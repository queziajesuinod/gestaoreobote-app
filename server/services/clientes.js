const { Cliente } = require('../models'); // Importa o model inicializado

// 🧩 Lista todos os clientes
async function getTodosClientes() {
  return await Cliente.findAll();
}

// 🧩 Busca cliente pelo ID
async function getClienteById(id) {
  const cliente = await Cliente.findByPk(id);
  if (!cliente) throw new Error('Cliente não encontrado');
  return cliente;
}

// 🧩 Cria novo cliente
async function createCliente(body) {
  const { nome, cpf, cidade, estado, dtnascimento, profissao, celular, email } = body;
  const novoCliente = await Cliente.create({
    nome,
    cpf,
    cidade,
    estado,
    dtnascimento,
    profissao,
    celular,
    email
  });
  return novoCliente;
}

// 🧩 Atualiza cliente existente
async function atualizarCliente(id, dadosAtualizados) {
  const cliente = await Cliente.findByPk(id);
  if (!cliente) throw new Error('Cliente não encontrado');
  await cliente.update(dadosAtualizados);
  return cliente;
}

// 🧩 Deleta cliente
async function deletarCliente(id) {
  const cliente = await Cliente.findByPk(id);
  if (!cliente) throw new Error('Cliente não encontrado');
  await cliente.destroy();
  return { mensagem: 'Cliente removido com sucesso' };
}

module.exports = {
  getTodosClientes,
  getClienteById,
  createCliente,
  atualizarCliente,
  deletarCliente
};
