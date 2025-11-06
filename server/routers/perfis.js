const { Router } = require('express');
const router = Router();
const express = require('express');
const {
  getPerfilDetalhe,
  postPerfil,
  getPerfils,
  getPermissoes,
  updatePermissoes,
  getPermissoesCatalogo
} = require('../controllers/perfis');

// Configurar para aceitar JSON
router.use(express.json());
router.get('/', getPerfils);
router.get('/permissoes/disponiveis', getPermissoesCatalogo);
router.get('/:id/permissoes', getPermissoes);
router.put('/:id/permissoes', updatePermissoes);
router.get('/:id', getPerfilDetalhe);
router.post('/', postPerfil);

module.exports = router;
