const { Router } = require('express');
const router = Router();

const clienteController = require('../controllers/clientes');
const autenticado = require('../middlewares/autenticado'); // se quiser proteger com JWT

// router.use(autenticado); // descomente se quiser proteger todas as rotas

router.get('/', clienteController.listar);
router.get('/consultor/:consultorId', clienteController.listarPorConsultor);
router.get('/:id', clienteController.buscarPorId);
router.post('/', clienteController.criar);
router.put('/:id', clienteController.atualizar);
router.delete('/:id', clienteController.deletar);

module.exports = router;
