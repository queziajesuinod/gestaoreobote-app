const { Router } = require('express');
const router = Router();
const autenticado = require('../middlewares/autenticado');
const cotaController = require('../controllers/cotas');

router.use(autenticado);

router.get('/', cotaController.listar);
router.get('/buscar', cotaController.buscarComFiltros);
router.get('/exportar', cotaController.exportar);
router.get('/cliente/:clienteId', cotaController.buscarPorCliente);
router.get('/consultor/:consultorId', cotaController.buscarPorConsultor);
router.get('/periodo', cotaController.buscarPorPeriodo);
router.post('/', cotaController.criar);
router.put('/:id', cotaController.atualizar);
router.delete('/:id', cotaController.deletar);
router.get('/exportar', cotaController.exportar);


module.exports = router;
