// server/routers/whatsapp.js
// Rota PÚBLICA do webhook da Evolution (registrada sem authMiddleware no index.js).
const { Router } = require('express');
const router = Router();
const { webhook } = require('../controllers/whatsapp');

// A Evolution pode postar em /whatsapp/webhook ou em /whatsapp/webhook/<evento>.
router.post('/webhook', webhook);
router.post('/webhook/:evento', webhook);

module.exports = router;
