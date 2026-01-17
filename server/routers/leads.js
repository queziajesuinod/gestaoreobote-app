const express = require('express');
const router = express.Router();
const leadsController = require('../controllers/leads');

// Listar leads
router.get('/:consultorId', leadsController.listarLeads);

// Detalhes de um lead
router.get('/detalhes/:leadId', leadsController.obterLead);

// Criar lead manual
router.post('/', leadsController.criarLead);

// Atualizar lead
router.put('/:leadId', leadsController.atualizarLead);

// Promover a cliente
router.post('/:leadId/promover-cliente', leadsController.promoverACliente);

// Vincular ao Agendor
router.post('/:leadId/vincular-agendor', leadsController.vincularAgendor);

// Sincronizar Agendor
router.post('/:leadId/sincronizar-agendor', leadsController.sincronizarAgendor);

// Sincronizar mensagens do Evolution
router.post('/:leadId/sincronizar', leadsController.sincronizarLead);

// Insights do lead
router.get('/:leadId/insights', leadsController.obterInsightsLead);

// Insights do consultor
router.get('/consultor/:consultorId/insights', leadsController.obterInsightsConsultor);

// Importar contatos em lote
router.post('/consultor/:consultorId/importar-lote', leadsController.importarContatosLote);

module.exports = router;
