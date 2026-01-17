const express = require('express');
const router = express.Router();
const webhookController = require('../controllers/webhookEvolution');

// Webhook público (sem autenticação JWT)
router.post('/:instanceId', webhookController.processarWebhook);

module.exports = router;
