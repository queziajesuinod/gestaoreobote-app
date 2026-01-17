/**
 * API Service para Módulo de Inadimplentes
 * 
 * Centraliza todas as chamadas à API do módulo de inadimplentes
 */

const API_URL = process.env.REACT_APP_API_URL?.replace(/\/$/, '') || 'http://localhost:3003';

const getToken = () => localStorage.getItem('token');

const getHeaders = () => ({
  'Content-Type': 'application/json',
  Authorization: `Bearer ${getToken()}`
});

// ============================================================================
// PROCESSOS DE COBRANÇA
// ============================================================================

export const listarProcessos = async (filtros = {}) => {
  const params = new URLSearchParams();
  if (filtros.status) params.append('status', filtros.status);
  if (filtros.cotaId) params.append('cotaId', filtros.cotaId);
  
  const response = await fetch(`${API_URL}/api/inadimplentes/processos?${params}`, {
    headers: getHeaders()
  });
  
  if (!response.ok) throw new Error('Erro ao listar processos');
  return response.json();
};

export const buscarProcesso = async (id) => {
  const response = await fetch(`${API_URL}/api/inadimplentes/processos/${id}`, {
    headers: getHeaders()
  });
  
  if (!response.ok) throw new Error('Erro ao buscar processo');
  return response.json();
};

export const criarProcesso = async (dados) => {
  const response = await fetch(`${API_URL}/api/inadimplentes/processos`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(dados)
  });
  
  if (!response.ok) throw new Error('Erro ao criar processo');
  return response.json();
};

export const atualizarProcesso = async (id, dados) => {
  const response = await fetch(`${API_URL}/api/inadimplentes/processos/${id}`, {
    method: 'PUT',
    headers: getHeaders(),
    body: JSON.stringify(dados)
  });
  
  if (!response.ok) throw new Error('Erro ao atualizar processo');
  return response.json();
};

export const excluirProcesso = async (id) => {
  const response = await fetch(`${API_URL}/api/inadimplentes/processos/${id}`, {
    method: 'DELETE',
    headers: getHeaders()
  });
  
  if (!response.ok) throw new Error('Erro ao excluir processo');
  return response.json();
};

export const pausarProcesso = async (id) => {
  const response = await fetch(`${API_URL}/api/inadimplentes/processos/${id}/pausar`, {
    method: 'POST',
    headers: getHeaders()
  });
  
  if (!response.ok) throw new Error('Erro ao pausar processo');
  return response.json();
};

export const reativarProcesso = async (id) => {
  const response = await fetch(`${API_URL}/api/inadimplentes/processos/${id}/reativar`, {
    method: 'POST',
    headers: getHeaders()
  });
  
  if (!response.ok) throw new Error('Erro ao reativar processo');
  return response.json();
};

export const encerrarProcesso = async (id) => {
  const response = await fetch(`${API_URL}/api/inadimplentes/processos/${id}/encerrar`, {
    method: 'POST',
    headers: getHeaders()
  });
  
  if (!response.ok) throw new Error('Erro ao encerrar processo');
  return response.json();
};

// ============================================================================
// COBRANÇAS MENSAIS
// ============================================================================

export const listarCobrancas = async (filtros = {}) => {
  const params = new URLSearchParams();
  if (filtros.status) params.append('status', filtros.status);
  if (filtros.processoId) params.append('processoId', filtros.processoId);
  if (filtros.dataInicio) params.append('dataInicio', filtros.dataInicio);
  if (filtros.dataFim) params.append('dataFim', filtros.dataFim);
  
  const response = await fetch(`${API_URL}/api/inadimplentes/cobrancas?${params}`, {
    headers: getHeaders()
  });
  
  if (!response.ok) throw new Error('Erro ao listar cobranças');
  return response.json();
};

export const buscarCobranca = async (id) => {
  const response = await fetch(`${API_URL}/api/inadimplentes/cobrancas/${id}`, {
    headers: getHeaders()
  });
  
  if (!response.ok) throw new Error('Erro ao buscar cobrança');
  return response.json();
};

export const marcarComoPago = async (id, dados) => {
  const response = await fetch(`${API_URL}/api/inadimplentes/cobrancas/${id}/pagar`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(dados)
  });
  
  if (!response.ok) throw new Error('Erro ao marcar como pago');
  return response.json();
};

export const adicionarAnotacao = async (id, dados) => {
  const response = await fetch(`${API_URL}/api/inadimplentes/cobrancas/${id}/anotacao`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(dados)
  });
  
  if (!response.ok) throw new Error('Erro ao adicionar anotação');
  return response.json();
};

// ============================================================================
// DASHBOARD E ESTATÍSTICAS
// ============================================================================

export const obterDashboard = async () => {
  const response = await fetch(`${API_URL}/api/inadimplentes/dashboard`, {
    headers: getHeaders()
  });
  
  if (!response.ok) throw new Error('Erro ao obter dashboard');
  return response.json();
};

export const detectarInadimplencia = async () => {
  const response = await fetch(`${API_URL}/api/inadimplentes/detectar`, {
    method: 'POST',
    headers: getHeaders()
  });
  
  if (!response.ok) throw new Error('Erro ao detectar inadimplência');
  return response.json();
};

// ============================================================================
// NOTIFICAÇÕES
// ============================================================================

export const listarNotificacoes = async (cobrancaId) => {
  const response = await fetch(`${API_URL}/api/inadimplentes/cobrancas/${cobrancaId}/notificacoes`, {
    headers: getHeaders()
  });
  
  if (!response.ok) throw new Error('Erro ao listar notificações');
  return response.json();
};

// ============================================================================
// WEBHOOK
// ============================================================================

export const obterConfiguracaoWebhook = async () => {
  const response = await fetch(`${API_URL}/api/inadimplentes/webhook/configuracao`, {
    headers: getHeaders()
  });
  
  if (!response.ok) throw new Error('Erro ao obter configuração');
  return response.json();
};

export const salvarConfiguracaoWebhook = async (dados) => {
  const response = await fetch(`${API_URL}/api/inadimplentes/webhook/configuracao`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(dados)
  });
  
  if (!response.ok) throw new Error('Erro ao salvar configuração');
  return response.json();
};

export const listarLogsWebhook = async (filtros = {}) => {
  const params = new URLSearchParams();
  if (filtros.cobrancaId) params.append('cobrancaId', filtros.cobrancaId);
  if (filtros.sucesso !== undefined) params.append('sucesso', filtros.sucesso);
  
  const response = await fetch(`${API_URL}/api/inadimplentes/webhook/logs?${params}`, {
    headers: getHeaders()
  });
  
  if (!response.ok) throw new Error('Erro ao listar logs');
  return response.json();
};

export const reenviarWebhook = async (logId) => {
  const response = await fetch(`${API_URL}/api/inadimplentes/webhook/reenviar/${logId}`, {
    method: 'POST',
    headers: getHeaders()
  });
  
  if (!response.ok) throw new Error('Erro ao reenviar webhook');
  return response.json();
};

// ============================================================================
// UTILITÁRIOS
// ============================================================================

export const formatarMoeda = (valor) => {
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL'
  }).format(valor);
};

export const formatarData = (data) => {
  if (!data) return '-';
  return new Date(data).toLocaleDateString('pt-BR');
};

export const formatarDataHora = (data) => {
  if (!data) return '-';
  return new Date(data).toLocaleString('pt-BR');
};

export const getStatusColor = (status) => {
  const colors = {
    pendente: 'warning',
    atrasado: 'error',
    pago: 'success',
    ativo: 'success',
    pausado: 'warning',
    encerrado: 'default'
  };
  return colors[status] || 'default';
};

export const getStatusLabel = (status) => {
  const labels = {
    pendente: 'Pendente',
    atrasado: 'Atrasado',
    pago: 'Pago',
    ativo: 'Ativo',
    pausado: 'Pausado',
    encerrado: 'Encerrado'
  };
  return labels[status] || status;
};
