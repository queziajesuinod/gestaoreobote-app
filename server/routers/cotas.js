const { Router } = require('express');
const router = Router();
const autenticado = require('../middlewares/autenticado');
const cotaController = require('../controllers/cotas');

// router.use(autenticado); // habilite JWT se necessário

router.get('/', cotaController.listar);
router.get('/cliente/:clienteId', cotaController.buscarPorCliente);
router.get('/consultor/:consultorId', cotaController.buscarPorConsultor);
router.get('/periodo', cotaController.buscarPorPeriodo);
router.post('/', cotaController.criar);

module.exports = router;
