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
// Rotas de lote — ANTES de /:id para não conflitar
router.post('/lote/cancelar', cotaController.cancelarEmLote);

router.put('/:id', cotaController.atualizar);
router.post('/:id/mover', cotaController.mover);
router.post('/:id/cancelar', cotaController.cancelar);
router.post('/:id/reativar', cotaController.reativarCota);
router.delete('/cliente/:clienteId', cotaController.deletarPorCliente);
router.delete('/:id', cotaController.deletar);
router.post('/:id/contemplacao', cotaController.registrarContemplacao);
router.delete('/:id/contemplacao', cotaController.removerContemplacao);


module.exports = router;
