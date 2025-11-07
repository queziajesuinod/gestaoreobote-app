const { Router } = require('express');
const router = Router();
const cotaController = require('../controllers/cotas');

router.get('/', cotaController.listar);
router.get('/buscar', cotaController.buscarComFiltros);
router.get('/cliente/:clienteId', cotaController.buscarPorCliente);
router.get('/consultor/:consultorId', cotaController.buscarPorConsultor);
router.get('/periodo', cotaController.buscarPorPeriodo);
router.get('/total', cotaController.totalPorPeriodo);
router.get('/exportar', cotaController.exportar);
router.post('/', cotaController.criar);
router.put('/:id', cotaController.atualizar);
router.delete('/:id', cotaController.deletar);
router.post('/:id/contemplacao', cotaController.registrarContemplacao);
router.delete('/:id/contemplacao', cotaController.removerContemplacao);


module.exports = router;
