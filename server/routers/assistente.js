// server/routers/assistente.js
const { Router } = require('express');
const router = Router();
const { getAuditoria, getStatus, getEventos } = require('../controllers/assistente');

router.get('/auditoria', getAuditoria);
router.get('/status', getStatus);
router.get('/eventos', getEventos);

module.exports = router;
