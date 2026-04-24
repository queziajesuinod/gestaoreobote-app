const { Router } = require('express');
const router = Router();

// Controllers
const processoCobrancaController = require('../controllers/processocobranca');
const cobrancaMensalController = require('../controllers/cobrancamensal');
const inadimplenciaController = require('../controllers/inadimplencia');
const webhookController = require('../controllers/webhook');
const configuracaoWebhookController = require('../controllers/configuracaowebhook');
const configuracaoCobrancaController = require('../controllers/configuracaocobranca');
const cotaProcessoController = require('../controllers/cotaprocesso');

// Middleware de autenticação
const autenticado = require('../middlewares/autenticado');

// ============================================================================
// ROTAS PÚBLICAS (sem autenticação)
// ============================================================================

/**
 * POST /api/inadimplentes/webhook/callback
 * Receber callback do sistema externo
 * PÚBLICO - Sistema externo envia callback após notificar cliente
 */
router.post('/webhook/callback', webhookController.receberCallback);

// ============================================================================
// ROTAS PROTEGIDAS (requerem autenticação)
// ============================================================================

// Aplicar middleware de autenticação para todas as rotas abaixo
router.use(autenticado);

// ----------------------------------------------------------------------------
// PROCESSOS DE COBRANÇA
// ----------------------------------------------------------------------------

/**
 * GET /api/inadimplentes/administradoras
 * Listar valores distintos de administradora das cotas
 */
router.get('/administradoras', processoCobrancaController.listarAdministradoras);

/**
 * GET /api/inadimplentes/processos
 * Listar processos de cobrança
 * Query params: status, cotaId
 */
router.get('/processos', processoCobrancaController.listar);

/**
 * POST /api/inadimplentes/processos
 * Criar novo processo de cobrança
 * Body: { cotaId, diaVencimento, dataInicioCobranca, historicoRetroativo, observacao }
 */
router.post('/processos', processoCobrancaController.criar);

/**
 * POST /api/inadimplentes/processos/lote/pausar
 * Pausar vários processos — ANTES de /:id
 */
router.post('/processos/lote/pausar', processoCobrancaController.pausarEmLote);

/**
 * POST /api/inadimplentes/processos/lote/encerrar
 * Encerrar vários processos — ANTES de /:id
 */
router.post('/processos/lote/encerrar', processoCobrancaController.encerrarEmLote);

/**
 * POST /api/inadimplentes/processos/lote/meses
 * Atualizar quantidade de meses de vários processos — ANTES de /:id
 */
router.post('/processos/lote/meses', processoCobrancaController.atualizarMesesEmLote);

/**
 * GET /api/inadimplentes/processos/:id
 * Buscar processo específico
 */
router.get('/processos/:id', processoCobrancaController.buscarPorId);

/**
 * PUT /api/inadimplentes/processos/:id
 * Atualizar processo de cobrança
 * Body: { diaVencimento, observacao }
 */
router.put('/processos/:id', processoCobrancaController.atualizar);

/**
 * DELETE /api/inadimplentes/processos/:id
 * Excluir processo de cobrança
 */
router.delete('/processos/:id', processoCobrancaController.excluir);

/**
 * POST /api/inadimplentes/processos/:id/pausar
 * Pausar processo de cobrança
 */
router.post('/processos/:id/pausar', processoCobrancaController.pausar);

/**
 * POST /api/inadimplentes/processos/:id/reativar
 * Reativar processo de cobrança
 */
router.post('/processos/:id/reativar', processoCobrancaController.reativar);

/**
 * POST /api/inadimplentes/processos/:id/encerrar
 * Encerrar processo de cobrança
 */
router.post('/processos/:id/encerrar', processoCobrancaController.encerrar);

// ----------------------------------------------------------------------------
// COTAS EM PROCESSOS (NOVO)
// ----------------------------------------------------------------------------

/**
 * GET /api/inadimplentes/processos/:id/cotas
 * Listar cotas de um processo
 * Query params: status
 */
router.get('/processos/:id/cotas', cotaProcessoController.listarCotas);

/**
 * POST /api/inadimplentes/processos/:id/cotas
 * Adicionar cota a um processo
 * Body: { cotaId, valor, diaVencimento, quantidadeMeses, mesesPagosRetroativo, dataInicioCobranca, observacao }
 */
router.post('/processos/:id/cotas', cotaProcessoController.adicionarCota);

/**
 * DELETE /api/inadimplentes/processos/:id/cotas/:cotaId
 * Remover cota de um processo
 */
router.delete('/processos/:id/cotas/:cotaId', cotaProcessoController.removerCota);

/**
 * GET /api/inadimplentes/cotas-processo/:id
 * Obter detalhes de uma cota no processo
 */
router.get('/cotas-processo/:id', cotaProcessoController.obterDetalhes);

/**
 * PUT /api/inadimplentes/cotas-processo/:id
 * Atualizar configuração de uma cota no processo
 * Body: { valor, diaVencimento, quantidadeMeses, dataInicioCobranca, status, observacao }
 */
router.put('/cotas-processo/:id', cotaProcessoController.atualizarConfiguracao);

/**
 * POST /api/inadimplentes/cotas-processo/:id/pausar
 * Pausar cota no processo
 */
router.post('/cotas-processo/:id/pausar', cotaProcessoController.pausar);

/**
 * POST /api/inadimplentes/cotas-processo/:id/reativar
 * Reativar cota no processo
 */
router.post('/cotas-processo/:id/reativar', cotaProcessoController.reativar);

/**
 * POST /api/inadimplentes/cotas-processo/:id/encerrar
 * Encerrar cota no processo
 */
router.post('/cotas-processo/:id/encerrar', cotaProcessoController.encerrar);

// ----------------------------------------------------------------------------
// COBRANÇAS MENSAIS
// ----------------------------------------------------------------------------

/**
 * GET /api/inadimplentes/cobrancas/estatisticas
 * Obter estatísticas de cobranças
 * IMPORTANTE: Esta rota deve vir ANTES de /cobrancas/:id
 */
router.get('/cobrancas/estatisticas', cobrancaMensalController.obterEstatisticas);

/**
 * POST /api/inadimplentes/cobrancas/lote/pagar
 * Marcar várias cobranças como pagas de uma vez
 * Body: { ids: string[], dataPagamento, observacao }
 */
router.post('/cobrancas/lote/pagar', cobrancaMensalController.marcarVariasComoPago);

/**
 * POST /api/inadimplentes/cobrancas/lote/anotar
 * Adicionar anotação em várias cobranças
 * Body: { ids: string[], tipo, canal, mensagem }
 */
router.post('/cobrancas/lote/anotar', cobrancaMensalController.adicionarAnotacaoEmLote);

/**
 * GET /api/inadimplentes/cobrancas
 * Listar cobranças
 * Query params: status, dataInicio, dataFim, processoCobrancaId
 */
router.get('/cobrancas', cobrancaMensalController.listar);

/**
 * GET /api/inadimplentes/cobrancas/:id
 * Buscar cobrança específica
 */
router.get('/cobrancas/:id', cobrancaMensalController.buscarPorId);

/**
 * GET /api/inadimplentes/cobrancas/:id/notificacoes
 * Listar notificações da cobrança
 */
router.get('/cobrancas/:id/notificacoes', cobrancaMensalController.listarNotificacoes);

/**
 * POST /api/inadimplentes/cobrancas/:id/pagar
 * Marcar cobrança como paga
 * Body: { dataPagamento, observacao }
 */
router.post('/cobrancas/:id/pagar', cobrancaMensalController.marcarComoPago);

/**
 * POST /api/inadimplentes/cobrancas/:id/notificacoes
 * Adicionar anotação manual
 * Body: { tipo, canal, mensagem }
 */
router.post('/cobrancas/:id/notificacoes', cobrancaMensalController.adicionarAnotacao);

/**
 * POST /api/inadimplentes/cobrancas/:id/notificar
 * Forçar notificação manual
 */
router.post('/cobrancas/:id/notificar', cobrancaMensalController.forcarNotificacao);

// ----------------------------------------------------------------------------
// INADIMPLÊNCIA
// ----------------------------------------------------------------------------

/**
 * GET /api/inadimplentes/dashboard
 * Dashboard de inadimplência
 * IMPORTANTE: Esta rota deve vir ANTES de /inadimplentes/:id
 */
router.get('/dashboard', inadimplenciaController.dashboard);

/**
 * POST /api/inadimplentes/detectar
 * Executar detecção manual de inadimplência
 */
router.post('/detectar', inadimplenciaController.detectarManual);

/**
 * POST /api/inadimplentes/notificar-manual
 * Notificar manualmente todas as cobranças atrasadas (envia webhooks)
 */
router.post('/notificar-manual', inadimplenciaController.notificarManual);

/**
 * POST /api/inadimplentes/verificar-status
 * Verificar status de inadimplente (envia webhook de validação)
 */
router.post('/verificar-status', inadimplenciaController.verificarStatus);

/**
 * GET /api/inadimplentes/configuracoes/cobranca
 * Retornar configuração de cobrança
 */
router.get('/configuracoes/cobranca', configuracaoCobrancaController.obter);

/**
 * PUT /api/inadimplentes/configuracoes/cobranca
 * Atualizar configuração de cobrança
 */
router.put('/configuracoes/cobranca', configuracaoCobrancaController.atualizar);

/**
 * GET /api/inadimplentes/inadimplentes
 * Listar inadimplentes
 * Query params: diasAtrasoMin, diasAtrasoMax
 */
router.get('/inadimplentes', inadimplenciaController.listar);

/**
 * GET /api/inadimplentes/inadimplentes/:id
 * Obter detalhes de inadimplente
 */
router.get('/inadimplentes/:id', inadimplenciaController.buscarPorId);

// ----------------------------------------------------------------------------
// WEBHOOKS
// ----------------------------------------------------------------------------

/**
 * GET /api/inadimplentes/webhooks/estatisticas
 * Estatísticas de webhooks
 * IMPORTANTE: Esta rota deve vir ANTES de /webhooks/logs/:id
 */
router.get('/webhooks/estatisticas', webhookController.obterEstatisticas);

/**
 * GET /api/inadimplentes/webhooks/logs
 * Listar logs de webhooks
 * Query params: tipo, sucesso, cobrancaMensalId, limit
 */
router.get('/webhooks/logs', webhookController.listarLogs);

/**
 * GET /api/inadimplentes/webhooks/logs/:id
 * Buscar log específico
 */
router.get('/webhooks/logs/:id', webhookController.buscarLogPorId);

// ----------------------------------------------------------------------------
// CONFIGURAÇÕES DE WEBHOOK
// ----------------------------------------------------------------------------

/**
 * GET /api/inadimplentes/configuracoes/webhook/ativa
 * Obter configuração ativa
 * IMPORTANTE: Esta rota deve vir ANTES de /configuracoes/webhook/:id
 */
router.get('/configuracoes/webhook/ativa', configuracaoWebhookController.obterAtiva);

/**
 * GET /api/inadimplentes/configuracoes/webhook
 * Listar configurações de webhook
 */
router.get('/configuracoes/webhook', configuracaoWebhookController.listar);

/**
 * POST /api/inadimplentes/configuracoes/webhook
 * Criar configuração de webhook
 * Body: { nome, url, metodo, headers, secretKey, ativo, maxTentativas, timeout }
 */
router.post('/configuracoes/webhook', configuracaoWebhookController.criar);

/**
 * GET /api/inadimplentes/configuracoes/webhook/:id
 * Buscar configuração específica
 */
router.get('/configuracoes/webhook/:id', configuracaoWebhookController.buscarPorId);

/**
 * PUT /api/inadimplentes/configuracoes/webhook/:id
 * Atualizar configuração de webhook
 * Body: { nome, url, metodo, headers, secretKey, ativo, maxTentativas, timeout }
 */
router.put('/configuracoes/webhook/:id', configuracaoWebhookController.atualizar);

/**
 * DELETE /api/inadimplentes/configuracoes/webhook/:id
 * Excluir configuração de webhook
 */
router.delete('/configuracoes/webhook/:id', configuracaoWebhookController.excluir);

/**
 * POST /api/inadimplentes/configuracoes/webhook/:id/ativar
 * Ativar configuração (desativa outras)
 */
router.post('/configuracoes/webhook/:id/ativar', configuracaoWebhookController.ativar);

/**
 * POST /api/inadimplentes/configuracoes/webhook/:id/desativar
 * Desativar configuração
 */
router.post('/configuracoes/webhook/:id/desativar', configuracaoWebhookController.desativar);

/**
 * POST /api/inadimplentes/configuracoes/webhook/testar
 * Testar webhook enviando payload de exemplo
 */
router.post('/configuracoes/webhook/testar', configuracaoWebhookController.testar);

// ----------------------------------------------------------------------------
// RELATÓRIOS E EXPORTAÇÕES
// ----------------------------------------------------------------------------

/**
 * GET /api/inadimplentes/relatorios/processo/:id/pdf
 * Gerar relatório PDF de um processo
 */
router.get('/relatorios/processo/:id/pdf', inadimplenciaController.gerarRelatorioPDF);

/**
 * GET /api/inadimplentes/relatorios/inadimplencia/pdf
 * Gerar relatório consolidado de inadimplência em PDF
 * Query params: dataInicio, dataFim
 */
router.get('/relatorios/inadimplencia/pdf', inadimplenciaController.gerarRelatorioInadimplenciaPDF);

/**
 * GET /api/inadimplentes/exportar/processos/excel
 * Exportar processos para Excel
 * Query params: status
 */
router.get('/exportar/processos/excel', inadimplenciaController.exportarProcessosExcel);

/**
 * GET /api/inadimplentes/exportar/atrasadas/excel
 * Exportar cobranças atrasadas para Excel
 */
router.get('/exportar/atrasadas/excel', inadimplenciaController.exportarCobrancasAtrasadasExcel);

/**
 * GET /api/inadimplentes/estatisticas/graficos
 * Obter dados para gráficos
 * Query params: meses (padrão: 6)
 */
router.get('/estatisticas/graficos', inadimplenciaController.obterDadosGraficos);

// ============================================================================
// EXPORTAR ROUTER
// ============================================================================

module.exports = router;
