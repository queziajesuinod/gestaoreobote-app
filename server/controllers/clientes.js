const clienteService = require('../services/clientes');

module.exports = {
  // 🔹 GET /clientes
  async listar(req, res) {
    try {
      const clientes = await clienteService.getTodosClientes();
      return res.status(200).json({
        sucesso: true,
        mensagem: 'Lista de clientes obtida com sucesso.',
        dados: clientes
      });
    } catch (error) {
      return res.status(500).json({ sucesso: false, erro: error.message });
    }
  },

  // 🔹 GET /clientes/:id
  async buscarPorId(req, res) {
    try {
      const { id } = req.params;
      const cliente = await clienteService.getClienteById(id);
      if (!cliente) {
        return res.status(404).json({ sucesso: false, mensagem: 'Cliente não encontrado.' });
      }
      return res.status(200).json({ sucesso: true, dados: cliente });
    } catch (error) {
      return res.status(500).json({ sucesso: false, erro: error.message });
    }
  },

  // 🔹 POST /clientes
  async criar(req, res) {
    try {
      const novo = await clienteService.createCliente(req.body);
      return res.status(201).json({
        sucesso: true,
        mensagem: 'Cliente criado com sucesso.',
        dados: novo
      });
    } catch (error) {
      return res.status(500).json({ sucesso: false, erro: error.message });
    }
  },

  // 🔹 PUT /clientes/:id
  async atualizar(req, res) {
    try {
      const { id } = req.params;
      const atualizado = await clienteService.atualizarCliente(id, req.body);
      return res.status(200).json({
        sucesso: true,
        mensagem: 'Cliente atualizado com sucesso.',
        dados: atualizado
      });
    } catch (error) {
      return res.status(500).json({ sucesso: false, erro: error.message });
    }
  },

  // 🔹 DELETE /clientes/:id
  async deletar(req, res) {
    try {
      const { id } = req.params;
      const resultado = await clienteService.deletarCliente(id);
      return res.status(200).json({ sucesso: true, mensagem: resultado.mensagem });
    } catch (error) {
      return res.status(500).json({ sucesso: false, erro: error.message });
    }
  }
};
