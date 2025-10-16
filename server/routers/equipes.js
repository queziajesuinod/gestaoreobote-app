const {Router} = require("express")
const router = Router()
const express = require('express');
const {getEquipeDetalhe,postEquipe,getEquipes,putEquipe,delEquipe} = require("../controllers/equipes")
const autenticado = require('../middlewares/autenticado')
//router.use(autenticado)


// Configurar para aceitar JSON
router.use(express.json());
router.get('/', getEquipes)
router.get('/:id', getEquipeDetalhe)
router.post('/', postEquipe)
router.put('/:id', putEquipe);
router.delete('/:id', delEquipe);

module.exports= router
