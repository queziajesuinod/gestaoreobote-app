const {Router} = require("express")
const router = Router()
const express = require('express');
const {getConsultorDetalhe,postConsultor,getConsultors,putConsultor,delConsultor} = require("../controllers/consultores")
const autenticado = require('../middlewares/autenticado')
//router.use(autenticado)


// Configurar para aceitar JSON
router.use(express.json());
router.get('/', getConsultors)
router.get('/:id', getConsultorDetalhe)
router.post('/', postConsultor)
router.put('/:id', putConsultor)
router.delete('/:id', delConsultor)

module.exports= router
