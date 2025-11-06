const { Router } = require('express');
const router = Router();
const express = require('express');
const metasController = require('../controllers/metas');

router.use(express.json());

router.get('/', metasController.listar);
router.post('/', metasController.criar);
router.put('/:id', metasController.atualizar);
router.delete('/:id', metasController.deletar);
router.get('/referencia', metasController.buscarPorReferencia);

module.exports = router;
