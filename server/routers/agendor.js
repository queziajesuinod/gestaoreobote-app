// server/routes/agendor.js

const express = require('express');
const router = express.Router();
const agendorController = require('../controllers/agendor');
const autenticado = require('../middlewares/autenticado')
//router.use(autenticado)

// Rota GET (manter compatibilidade)
router.get('/tarefas',  agendorController.getTarefas);
router.get('/negocios', agendorController.getNegocios);


module.exports = router;

