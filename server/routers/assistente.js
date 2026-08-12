// server/routers/assistente.js
const { Router } = require('express');
const router = Router();
const { getAuditoria } = require('../controllers/assistente');

router.get('/auditoria', getAuditoria);

module.exports = router;
