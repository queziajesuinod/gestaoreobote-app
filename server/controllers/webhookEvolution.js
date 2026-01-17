const { EvolutionInstance, Lead, Conversa, Mensagem, AnaliseIA } = require('../models');
const iaService = require('../services/ia');

const extractWebhookMessageTimestamp = (msg) => {
  if (!msg) return null;
  const candidate = msg.messageTimestamp
    ?? msg.timestamp
    ?? msg.message?.messageTimestamp
    ?? msg.message?.timestamp
    ?? msg.key?.messageTimestamp;
  const parsed = Number(candidate);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const extractWebhookMessageStatus = (msg) => {
  if (!msg) return null;
  return msg.status
    || msg.message?.status
    || msg.key?.status
    || msg.message?.conversationStatus
    || msg.message?.contextInfo?.status
    || null;
};

/**
 * Processa webhook do Evolution API
 */
async function processarWebhook(req, res) {
  try {
    const { instanceId } = req.params;
    const evento = req.body;
    
    // Responder imediatamente para não bloquear o Evolution
    res.status(200).json({ sucesso: true });
    
    // Processar em background
    processarEventoAsync(instanceId, evento).catch(error => {
      console.error('Erro ao processar evento Evolution:', error);
    });
    
  } catch (error) {
    console.error('Erro no webhook:', error);
    res.status(500).json({ sucesso: false, erro: error.message });
  }
}

async function processarEventoAsync(instanceId, evento) {
  try {
    const instancia = await EvolutionInstance.findByPk(instanceId);
    if (!instancia) {
      console.error('Instância não encontrada:', instanceId);
      return;
    }
    
    // Processar apenas mensagens novas
    if (evento.event === 'messages.upsert') {
      for (const msg of evento.data.messages || []) {
        await processarNovaMensagem(instancia, msg);
      }
    }
    
    // Atualizar status de conexão
    if (evento.event === 'connection.update') {
      const status = evento.data.state === 'open' ? 'conectada' : 'desconectada';
      await instancia.update({ status, ultimaConexao: new Date() });
    }
    
  } catch (error) {
    console.error('Erro ao processar evento async:', error);
  }
}

async function processarNovaMensagem(instancia, msg) {
  try {
    const messageKey = msg.key || {};
    // Ignorar mensagens do próprio consultor
    if (messageKey.fromMe) return;
    
    // Extrair telefone
    const chatId = messageKey.remoteJid;
    if (!chatId || !chatId.endsWith('@s.whatsapp.net')) return; // Ignorar grupos
    
    const telefone = chatId.replace('@s.whatsapp.net', '');
    
    // Buscar ou criar lead
    let lead = await Lead.findOne({
      where: { telefone, consultorId: instancia.consultorId }
    });
    
    if (!lead) {
      const nome = msg.pushName || telefone;
      lead = await Lead.create({
        consultorId: instancia.consultorId,
        nome,
        telefone,
        origem: 'whatsapp',
        status: 'novo',
        temperaturaLead: 50,
        evolutionInstanceId: instancia.id,
        evolutionSyncEnabled: true
      });
    }
    
    // Buscar ou criar conversa
    let conversa = await Conversa.findOne({
      where: { leadId: lead.id, chatId }
    });
    
    if (!conversa) {
      conversa = await Conversa.create({
        leadId: lead.id,
        consultorId: instancia.consultorId,
        plataforma: 'whatsapp',
        chatId,
        status: 'ativa'
      });
    }
    
    // Verificar se mensagem já existe
    const existe = await Mensagem.findOne({
      where: { evolutionMessageId: messageKey.id }
    });
    
    if (existe) return;
    
    // Extrair conteúdo
    let conteudo = '';
    let tipoMidia = 'texto';
    let urlMidia = null;
    
    if (msg.message?.conversation) {
      conteudo = msg.message.conversation;
    } else if (msg.message?.extendedTextMessage?.text) {
      conteudo = msg.message.extendedTextMessage.text;
    } else if (msg.message?.imageMessage) {
      conteudo = msg.message.imageMessage.caption || '[Imagem]';
      tipoMidia = 'imagem';
    } else if (msg.message?.audioMessage) {
      conteudo = '[Áudio]';
      tipoMidia = 'audio';
    } else {
      conteudo = '[Mensagem não suportada]';
    }
    
    // Criar mensagem
    const timestampUnix = extractWebhookMessageTimestamp(msg);
    const dataMensagem = timestampUnix ? new Date(timestampUnix * 1000) : new Date();
    const statusMensagem = extractWebhookMessageStatus(msg);

    const novaMensagem = await Mensagem.create({
      conversaId: conversa.id,
      remetente: 'lead',
      conteudo,
      tipoMidia,
      urlMidia,
      evolutionMessageId: messageKey.id,
      timestamp: dataMensagem,
      status: statusMensagem,
      analisadaPorIA: false
    });
    
    // Analisar com IA
    if (tipoMidia === 'texto') {
      const analise = await iaService.analisarMensagem(conteudo);
      
      await AnaliseIA.create({
        mensagemId: novaMensagem.id,
        topicos: analise.topicos,
        objecoes: analise.objecoes,
        sinaisCompra: analise.sinaisCompra,
        sentimento: analise.sentimento,
        scoreConfianca: analise.scoreConfianca,
        respostaJSON: analise.respostaCompleta
      });
      
      await novaMensagem.update({ analisadaPorIA: true });
    }
    
    // Atualizar última mensagem
    await conversa.update({ ultimaMensagem: new Date() });
    
    // Recalcular temperatura
    const temperatura = await iaService.calcularTemperaturaLead(conversa.id);
    await lead.update({
      temperaturaLead: temperatura,
      ultimaMensagem: new Date(),
      totalMensagens: await Mensagem.count({ where: { conversaId: conversa.id } })
    });
    
    // Log para monitoramento
    if (temperatura >= 70) {
      console.log(`🔥 LEAD QUENTE: ${lead.nome} - Temperatura: ${temperatura}`);
    }
    
  } catch (error) {
    console.error('Erro ao processar nova mensagem:', error);
  }
}

module.exports = {
  processarWebhook
};
