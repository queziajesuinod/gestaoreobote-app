import axios from 'axios';

export const API_URL = process.env.REACT_APP_API_URL?.replace(/\/$/, '') || 'http://localhost:3003';

export const getAuthHeader = () => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
};

export const leadsApi = {
  listar: async (consultorId, filtros = {}) => {
    const endpoint = consultorId ? `/leads/${consultorId}` : '/leads';
    const response = await axios.get(`${API_URL}${endpoint}`, {
      headers: getAuthHeader(),
      params: filtros
    });
    return response.data;
  },

  obter: async (leadId) => {
    const response = await axios.get(`${API_URL}/leads/detalhes/${leadId}`, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  criar: async (dados) => {
    const response = await axios.post(`${API_URL}/leads`, dados, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  atualizar: async (leadId, dados) => {
    const response = await axios.put(`${API_URL}/leads/${leadId}`, dados, {
      headers: getAuthHeader()
    });
    return response.data;
  },

  promover: async (leadId, dados) => {
    const response = await axios.post(
      `${API_URL}/leads/${leadId}/promover-cliente`,
      dados,
      { headers: getAuthHeader() }
    );
    return response.data;
  },

  vincularAgendor: async (leadId, negocioId) => {
    const response = await axios.post(
      `${API_URL}/leads/${leadId}/vincular-agendor`,
      { negocioId },
      { headers: getAuthHeader() }
    );
    return response.data;
  }
};

export const evolutionApi = {
  configurar: async (dados) => {
    const response = await axios.post(
      `${API_URL}/evolution/configurar`,
      dados,
      { headers: getAuthHeader() }
    );
    return response.data;
  },

  status: async (consultorId) => {
    const response = await axios.get(`${API_URL}/evolution/status`, {
      headers: getAuthHeader(),
      params: consultorId ? { consultorId } : undefined
    });
    return response.data;
  },

  importar: async (consultorId) => {
    const payload = consultorId ? { consultorId } : {};
    const response = await axios.post(
      `${API_URL}/evolution/importar`,
      payload,
      { headers: getAuthHeader() }
    );
    return response.data;
  },

  sincronizarMensagens: async (consultorId) => {
    const payload = consultorId ? { consultorId } : {};
    const response = await axios.post(
      `${API_URL}/evolution/sincronizar-mensagens`,
      payload,
      { headers: getAuthHeader() }
    );
    return response.data;
  },

  listarContatos: async ({ consultorId, search, limit } = {}) => {
    const response = await axios.get(`${API_URL}/evolution/contatos`, {
      headers: getAuthHeader(),
      params: {
        consultorId,
        search,
        limit
      }
    });
    return response.data;
  },

  importarContato: async ({ consultorId, chatId, nome, pushName }) => {
    const response = await axios.post(
      `${API_URL}/evolution/importar-contato`,
      { consultorId, chatId, nome, pushName },
      { headers: getAuthHeader() }
    );
    return response.data;
  },

  cargaInicial: async (consultorId) => {
    const payload = consultorId ? { consultorId } : {};
    const response = await axios.post(
      `${API_URL}/evolution/carga-inicial`,
      payload,
      { headers: getAuthHeader() }
    );
    return response.data;
  },

  enviarMensagem: async (leadId, mensagem) => {
    const response = await axios.post(
      `${API_URL}/evolution/enviar-mensagem`,
      { leadId, mensagem },
      { headers: getAuthHeader() }
    );
    return response.data;
  }
};
