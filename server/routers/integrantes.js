const {Router} = require("express")
const router = Router()
const express = require('express');
const {getIntegrantes,postIntegrante,getIntegranteDetalhe,delIntegrante,getIntegrantesByEquipe} = require("../controllers/integrantes")
const autenticado = require('../middlewares/autenticado')
//router.use(autenticado)


// Configurar para aceitar JSON
router.use(express.json());
router.get('/', getIntegrantes)
router.get('/:id', getIntegranteDetalhe)
router.post('/', postIntegrante)
router.delete('/:id', delIntegrante)
router.get('/equipe/:equipeId', getIntegrantesByEquipe);

module.exports= router
