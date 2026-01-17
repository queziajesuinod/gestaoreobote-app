const express = require('express');
const router = express.Router();
const evolutionController = require('../controllers/evolution');

// Configurar instância
router.post('/configurar', evolutionController.configurarInstancia);

// Obter status
router.get('/status', evolutionController.obterStatus);

// Importar chats
router.post('/importar', evolutionController.importarChats);

// Atualizar mensagens de leads existentes
router.post('/sincronizar-mensagens', evolutionController.sincronizarMensagens);

// Consultar contatos disponíveis para importação
router.get('/contatos', evolutionController.listarContatos);

// Importar histórico de um contato específico
router.post('/importar-contato', evolutionController.importarContato);

// Carga inicial de contatos e conversas
router.post('/carga-inicial', evolutionController.cargaInicial);

// Enviar mensagem
router.post('/enviar-mensagem', evolutionController.enviarMensagem);

// Desconectar
router.delete('/desconectar', evolutionController.desconectar);

module.exports = router;
