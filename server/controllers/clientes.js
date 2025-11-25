const clienteService = require('../services/clientes');

const usuarioPodeGerenciarClientes = (perfil) => {
  const perfilNormalizado = (perfil || '').toUpperCase();
  return perfilNormalizado === 'ADMIN' || perfilNormalizado === 'RH';
};

module.exports = {
  // 🔹 GET /clientes
  async listar(req, res) {
    try {
      const perfil = req.user?.perfil ? req.user.perfil.toUpperCase() : '';
      const consultorId = req.user?.consultorId ? Number(req.user.consultorId) : null;
      const isConsultor = consultorId && perfil !== 'ADMIN' && perfil !== 'GESTOR' && perfil !== 'RH';

      let clientes;
      if (isConsultor) {
        if (!consultorId) {
          return res.status(200).json({
            sucesso: true,
            mensagem: 'Nenhum cliente disponível para este consultor.',
            dados: []
          });
        }
        clientes = await clienteService.getClientesPorConsultor(consultorId);
      } else {
        clientes = await clienteService.getTodosClientes();
      }

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
      const perfil = req.user?.perfil ? req.user.perfil.toUpperCase() : '';
      const consultorId = req.user?.consultorId ? Number(req.user.consultorId) : null;
      const isConsultor = consultorId && perfil !== 'ADMIN' && perfil !== 'GESTOR' && perfil !== 'RH';

      const cliente = await clienteService.getClienteById(id);
      if (!cliente) {
        return res.status(404).json({ sucesso: false, mensagem: 'Cliente não encontrado.' });
      }

      if (isConsultor) {
        if (!consultorId) {
          return res.status(403).json({ sucesso: false, mensagem: 'Acesso negado para este cliente.' });
        }
        const possuiAcesso = await clienteService.consultorTemAcessoAoCliente(id, consultorId);
        if (!possuiAcesso) {
          return res.status(403).json({ sucesso: false, mensagem: 'Acesso negado para este cliente.' });
        }
      }

      return res.status(200).json({ sucesso: true, dados: cliente });
    } catch (error) {
      return res.status(500).json({ sucesso: false, erro: error.message });
    }
  },

  // 🔹 POST /clientes
  async criar(req, res) {
    try {
      const perfil = req.user?.perfil ? req.user.perfil.toUpperCase() : '';
      if (!usuarioPodeGerenciarClientes(perfil)) {
        return res.status(403).json({ sucesso: false, mensagem: 'Apenas administradores ou RH podem criar clientes.' });
      }

      const novo = await clienteService.createCliente(req.body);
      return res.status(201).json({
        sucesso: true,
        mensagem: 'Cliente criado com sucesso.',
        dados: novo
      });
    } catch (error) {
      const status = error.status || 500;
      return res.status(status).json({ sucesso: false, erro: error.message });
    }
  },

  // 🔹 PUT /clientes/:id
  async atualizar(req, res) {
    try {
      const perfil = req.user?.perfil ? req.user.perfil.toUpperCase() : '';
      if (!usuarioPodeGerenciarClientes(perfil)) {
        return res.status(403).json({ sucesso: false, mensagem: 'Apenas administradores ou RH podem atualizar clientes.' });
      }

      const { id } = req.params;
      const atualizado = await clienteService.atualizarCliente(id, req.body);
      return res.status(200).json({
        sucesso: true,
        mensagem: 'Cliente atualizado com sucesso.',
        dados: atualizado
      });
    } catch (error) {
      const status = error.status || 500;
      return res.status(status).json({ sucesso: false, erro: error.message });
    }
  },

  // 🔹 DELETE /clientes/:id
  async deletar(req, res) {
    try {
      const perfil = req.user?.perfil ? req.user.perfil.toUpperCase() : '';
      if (!usuarioPodeGerenciarClientes(perfil)) {
        return res.status(403).json({ sucesso: false, mensagem: 'Apenas administradores ou RH podem remover clientes.' });
      }

      const { id } = req.params;
      const resultado = await clienteService.deletarCliente(id);
      return res.status(200).json({ sucesso: true, mensagem: resultado.mensagem });
    } catch (error) {
      const status = error.status || 500;
      return res.status(status).json({
        sucesso: false,
        erro: error.message,
        mensagem: error.message,
        codigo: error.codigo || null
      });
    }
  }
};
