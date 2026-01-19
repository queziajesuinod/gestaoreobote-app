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

export const forcarNotificacao = async (cobrancaId) => {
  const response = await fetch(`${API_URL}/api/inadimplentes/cobrancas/${cobrancaId}/notificar`, {
    method: 'POST',
    headers: getHeaders()
  });

  if (!response.ok) throw new Error('Erro ao forçar notificação');
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


// ============================================================================
// RELATÓRIOS E EXPORTAÇÕES
// ============================================================================

/**
 * Gerar relatório PDF de um processo
 */
export const gerarRelatorioPDF = async (processoId) => {
  const response = await fetch(`${API_URL}/api/inadimplentes/relatorios/processo/${processoId}/pdf`, {
    headers: {
      Authorization: `Bearer ${getToken()}`
    }
  });
  
  if (!response.ok) throw new Error('Erro ao gerar relatório PDF');
  
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `processo-${processoId}.pdf`;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
  
  return { sucesso: true, mensagem: 'Relatório PDF gerado com sucesso' };
};

/**
 * Gerar relatório consolidado de inadimplência em PDF
 */
export const gerarRelatorioInadimplenciaPDF = async (filtros = {}) => {
  const params = new URLSearchParams();
  if (filtros.dataInicio) params.append('dataInicio', filtros.dataInicio);
  if (filtros.dataFim) params.append('dataFim', filtros.dataFim);
  
  const response = await fetch(`${API_URL}/api/inadimplentes/relatorios/inadimplencia/pdf?${params}`, {
    headers: {
      Authorization: `Bearer ${getToken()}`
    }
  });
  
  if (!response.ok) throw new Error('Erro ao gerar relatório de inadimplência');
  
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'relatorio-inadimplencia.pdf';
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
  
  return { sucesso: true, mensagem: 'Relatório de inadimplência gerado com sucesso' };
};

/**
 * Exportar processos para Excel
 */
export const exportarProcessosExcel = async (filtros = {}) => {
  const params = new URLSearchParams();
  if (filtros.status) params.append('status', filtros.status);
  
  const response = await fetch(`${API_URL}/api/inadimplentes/exportar/processos/excel?${params}`, {
    headers: {
      Authorization: `Bearer ${getToken()}`
    }
  });
  
  if (!response.ok) throw new Error('Erro ao exportar processos');
  
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'processos-cobranca.xlsx';
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
  
  return { sucesso: true, mensagem: 'Processos exportados com sucesso' };
};

/**
 * Exportar cobranças atrasadas para Excel
 */
export const exportarCobrancasAtrasadasExcel = async () => {
  const response = await fetch(`${API_URL}/api/inadimplentes/exportar/atrasadas/excel`, {
    headers: {
      Authorization: `Bearer ${getToken()}`
    }
  });
  
  if (!response.ok) throw new Error('Erro ao exportar cobranças atrasadas');
  
  const blob = await response.blob();
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'cobrancas-atrasadas.xlsx';
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
  
  return { sucesso: true, mensagem: 'Cobranças atrasadas exportadas com sucesso' };
};

/**
 * Obter dados para gráficos
 */
export const obterDadosGraficos = async (meses = 6) => {
  const response = await fetch(`${API_URL}/api/inadimplentes/estatisticas/graficos?meses=${meses}`, {
    headers: getHeaders()
  });
  
  if (!response.ok) throw new Error('Erro ao obter dados para gráficos');
  return response.json();
};

export const detectarManual = async () => {
  const response = await fetch(`${API_URL}/api/inadimplentes/detectar`, {
    method: 'POST',
    headers: getHeaders()
  });

  if (!response.ok) throw new Error('Erro ao disparar detecção manual');
  return response.json();
};

export const obterEstatisticas = async () => {
  const response = await fetch(`${API_URL}/api/inadimplentes/cobrancas/estatisticas`, {
    headers: getHeaders()
  });

  if (!response.ok) throw new Error('Erro ao obter estatísticas das cobranças');
  return response.json();
};

export const obterEstatisticasWebhook = async () => {
  const response = await fetch(`${API_URL}/api/inadimplentes/webhooks/estatisticas`, {
    headers: getHeaders()
  });

  if (!response.ok) throw new Error('Erro ao obter estatísticas de webhooks');
  return response.json();
};

// Exportar todas as funções como default também
export default {
  // Processos
  listarProcessos,
  buscarProcesso,
  criarProcesso,
  atualizarProcesso,
  excluirProcesso,
  pausarProcesso,
  reativarProcesso,
  encerrarProcesso,
  
  // Cobranças
  listarCobrancas,
  buscarCobranca,
  marcarComoPago,
  adicionarAnotacao,
  forcarNotificacao,
  obterEstatisticas,
  
  // Inadimplência
  obterDashboard,
  detectarManual,
  listarInadimplentes,
  buscarInadimplente,
  
  // Webhooks
  listarLogsWebhook,
  buscarLogWebhook,
  obterEstatisticasWebhook,
  
  // Configurações Webhook
  listarConfiguracoesWebhook,
  buscarConfiguracaoWebhook,
  criarConfiguracaoWebhook,
  atualizarConfiguracaoWebhook,
  excluirConfiguracaoWebhook,
  ativarConfiguracaoWebhook,
  desativarConfiguracaoWebhook,
  obterConfiguracaoAtiva,
  
  // Relatórios e Exportações
  gerarRelatorioPDF,
  gerarRelatorioInadimplenciaPDF,
  exportarProcessosExcel,
  exportarCobrancasAtrasadasExcel,
  obterDadosGraficos
};
