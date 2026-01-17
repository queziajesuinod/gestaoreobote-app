const axios = require('axios');
const CryptoJS = require('crypto-js');
const { Op } = require('sequelize');

const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'gestaoreobote-default-encryption-key-32chars';

const maskApiKey = (value) => {
  const key = (value || '').toString();
  if (!key) return null;
  if (key.length <= 8) return '*'.repeat(key.length);
  return `${key.slice(0, 4)}...${key.slice(-4)}`;
};

const descriptorFromApiKey = (value) => {
  const key = (value || '').toString();
  if (!key) return null;
  return `[${key.length} chars]`;
};

const encryptApiKey = (apiKey) => {
  if (!apiKey) return apiKey;
  try {
    return CryptoJS.AES.encrypt(apiKey, ENCRYPTION_KEY).toString();
  } catch (error) {
    console.error('Erro ao criptografar chave da Evolution:', error.message);
    return apiKey;
  }
};

const decryptApiKey = (encryptedKey) => {
  if (!encryptedKey) return encryptedKey;
  try {
    const bytes = CryptoJS.AES.decrypt(encryptedKey, ENCRYPTION_KEY);
    const decrypted = bytes.toString(CryptoJS.enc.Utf8);
    if (!decrypted) {
      return encryptedKey;
    }
    return decrypted;
  } catch (error) {
    console.warn('Erro ao descriptografar chave da Evolution, usando valor original:', error.message);
    return encryptedKey;
  }
};

const buildAuthHeader = (apiKey) => {
  const trimmedKey = (apiKey || '').toString().trim();
  return trimmedKey || null;
};

const createEvolutionClient = (apiUrl, apiKey) => {
  if (!apiUrl) {
    throw new Error('URL da instância Evolution não informada');
  }

  const baseURL = apiUrl.endsWith('/') ? apiUrl.slice(0, -1) : apiUrl;
  const headers = {
    'Content-Type': 'application/json'
  };
  const apiHeaderValue = buildAuthHeader(apiKey);
  if (apiHeaderValue) {
    headers.apikey = apiHeaderValue;
  }

    console.log('Evolution client request', {
      baseURL,
      instanceKey: descriptorFromApiKey(apiKey),
      apiHeader: apiHeaderValue ? `[REDACTED length=${apiHeaderValue.length}]` : null
    });

  return axios.create({
    baseURL,
    headers,
    timeout: 60000
  });
};

const normalizeEvolutionStatus = (value) => {
  const status = (value || '').toString().toLowerCase();
  if (['open', 'opened', 'connected', 'conectada'].includes(status)) return 'open';
  if (['close', 'closed', 'disconnected', 'desconectada'].includes(status)) return 'close';
  if (['connecting', 'qr', 'qrcode'].includes(status)) return 'connecting';
  return status || 'close';
};

const parseInstanceState = (payload) => {
  if (!payload) return null;
  return payload.state
    || payload.status
    || payload.connectionStatus
    || payload.connectionState
    || payload?.instance?.state
    || payload?.instance?.status
    || payload?.instance?.connectionStatus
    || payload?.instance?.connectionState;
};

const pickInstanceFromList = (payload, instanceName) => {
  if (!payload) return null;
  const lista = Array.isArray(payload)
    ? payload
    : Array.isArray(payload.instances)
      ? payload.instances
      : Array.isArray(payload.data)
        ? payload.data
        : payload.instance
          ? [payload.instance]
          : [];

  if (!lista.length) return null;
  const nome = (instanceName || '').toString().toLowerCase();
  return lista.find((item) => {
    const nested = item?.instance || {};
    const key = (item?.instanceName
      || item?.name
      || nested?.instanceName
      || nested?.name
      || item?.id
      || '').toString().toLowerCase();
    return key === nome;
  }) || null;
};

const extractMessageTimestamp = (msg) => {
  if (!msg) return null;
  const candidate = msg.messageTimestamp
    ?? msg.timestamp
    ?? msg.message?.messageTimestamp
    ?? msg.message?.timestamp
    ?? msg.key?.messageTimestamp;
  const parsed = Number(candidate);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
};

const extractMessageStatus = (msg) => {
  if (!msg) return null;
  return msg.status
    || msg.message?.status
    || msg.key?.status
    || msg.message?.conversationStatus
    || msg.message?.contextInfo?.status
    || null;
};

const normalizeChatId = (value) => {
  if (!value) return null;
  const str = value.toString();
  if (!str.includes('@')) return null;
  const lower = str.toLowerCase();
  if (lower.endsWith('@g.us') || lower.includes('@g.')) return null;
  return str;
};

const importarHistoricoContato = async (
  instance,
  consultorId,
  contato,
  { limiteMensagens = 1000, criarSeNaoExiste = true } = {}
) => {
  const chatId = contato?.remoteJid
    || contato?.id
    || contato?.jid
    || contato?.key?.remoteJid;
  const normalizedChatId = normalizeChatId(chatId);
  if (!normalizedChatId) {
    throw new Error('ChatId inválido');
  }

  const telefone = normalizedChatId.split('@')[0];
  const nome = contato?.name || contato?.pushName || telefone;
  const { Lead } = require('../models');

  let lead = await Lead.findOne({
    where: { telefone, consultorId }
  });

  let leadCriado = false;
  if (!lead) {
    if (!criarSeNaoExiste) {
      return { lead: null, leadCriado: false };
    }
    leadCriado = true;
    lead = await Lead.create({
      consultorId,
      nome,
      telefone,
      origem: 'whatsapp',
      status: 'novo',
      temperaturaLead: 50,
      evolutionInstanceId: instance.id,
      evolutionSyncEnabled: true
    });
  }

  await sincronizarChat(instance, normalizedChatId, lead.id, limiteMensagens);

  return {
    lead,
    leadCriado
  };
};

/**
 * Testa conexao com a instancia Evolution
 */
async function testarConexao(apiUrl, instanceName, apiKey) {
  const client = createEvolutionClient(apiUrl, apiKey);
  try {
    const response = await client.get(`/instance/connectionState/${instanceName}`);
    const state = parseInstanceState(response.data);
    if (state) {
      return {
        sucesso: true,
        status: normalizeEvolutionStatus(state),
        dados: response.data
      };
    }
  } catch (error) {
    const statusCode = error?.response?.status;
    if (statusCode && statusCode != 404) {
    if (statusCode === 401) {
      console.error('Unauthorized (401) ao testar conexao Evolution', {
        apiUrl,
        instanceName,
        apiKey: maskApiKey(apiKey),
        apiKeyDescriptor: descriptorFromApiKey(apiKey),
        response: error?.response?.data,
        tip: 'Confirme que o mesmo API key que funciona no painel está sendo enviado via cabeçalho "apikey".'
      });
    }
    console.error('Erro ao testar conexao Evolution:', {
      message: error.message,
      statusCode,
      data: error?.response?.data
    });
      return {
        sucesso: false,
        erro: error.response?.data?.message || error.message
      };
    }
  }

  try {
    const response = await client.get('/instance/fetchInstances', {
      params: { instanceName }
    });
    const instancia = pickInstanceFromList(response.data, instanceName);
    const state = parseInstanceState(instancia) || parseInstanceState(response.data);
    if (!instancia && !state) {
      return {
        sucesso: false,
        erro: 'Instancia nao encontrada.'
      };
    }
    return {
      sucesso: true,
      status: normalizeEvolutionStatus(state),
      dados: response.data
    };
  } catch (error) {
    const statusCode = error?.response?.status;
    if (statusCode === 401) {
      console.error('Unauthorized (401) ao buscar instancias Evolution', {
        apiUrl,
        endpoint: '/instance/fetchInstances',
        apiKey: maskApiKey(apiKey),
        apiKeyDescriptor: descriptorFromApiKey(apiKey),
        response: error?.response?.data,
        tip: 'Confirme que o mesmo API key que funciona no painel está sendo enviado via cabeçalho "apikey".'
      });
    }
    console.error('Erro ao testar conexao Evolution:', {
      message: error.message,
      statusCode,
      data: error?.response?.data
    });
    return {
      sucesso: false,
      erro: error.response?.data?.message || error.message
    };
  }
}

/**
 * Configura webhook para receber mensagens
 */
async function configurarWebhook(apiUrl, instanceName, apiKey, webhookUrl) {
  try {
    const client = createEvolutionClient(apiUrl, apiKey);
    
    const payload = {
      url: webhookUrl,
      webhook_by_events: false,
      webhook_base64: false,
      events: [
        'MESSAGES_UPSERT',
        'MESSAGES_UPDATE',
        'CONNECTION_UPDATE'
      ]
    };
    
    const response = await client.post(`/webhook/set/${instanceName}`, payload);
    
    return {
      sucesso: true,
      dados: response.data
    };
  } catch (error) {
    console.error('Erro ao configurar webhook:', error.message);
    return {
      sucesso: false,
      erro: error.response?.data?.message || error.message
    };
  }
}

/**
 * Busca mensagens de um chat específico
 */
async function buscarMensagensChat(apiUrl, instanceName, apiKey, chatId, limite = 50) {
  try {
    const client = createEvolutionClient(apiUrl, apiKey);
    
    const response = await client.post(`/chat/findMessages/${instanceName}`, {
      where: {
        key: {
          remoteJid: chatId
        }
      },
      limit: limite
    });
    
    return {
      sucesso: true,
      mensagens: response.data || []
    };
  } catch (error) {
    console.error('Erro ao buscar mensagens:', error.message);
    return {
      sucesso: false,
      erro: error.response?.data?.message || error.message,
      mensagens: []
    };
  }
}

/**
 * Busca todos os contatos/chats
 */
async function buscarContatos(apiUrl, instanceName, apiKey) {
  try {
    const client = createEvolutionClient(apiUrl, apiKey);
    
    const response = await client.post(`/chat/findContacts/${instanceName}`, {
      limit: 1000
    });
    
    const contatos = response.data?.contacts
      || response.data?.data
      || response.data
      || [];
    
    return {
      sucesso: true,
      contatos: Array.isArray(contatos) ? contatos : []
    };
  } catch (error) {
    console.error('Erro ao buscar contatos:', {
      message: error.message,
      statusCode: error?.response?.status,
      data: error?.response?.data
    });
    return {
      sucesso: false,
      erro: error.response?.data?.message || error.message,
      contatos: []
    };
  }
}

async function validarNumerosWhatsapp(apiUrl, instanceName, apiKey, numeros = []) {
  if (!Array.isArray(numeros) || !numeros.length) {
    return {
      sucesso: false,
      erro: 'Nenhum numero informado para validacao'
    };
  }

  try {
    const client = createEvolutionClient(apiUrl, apiKey);
    const response = await client.post(`/chat/whatsappNumbers/${instanceName}`, {
      numbers: numeros
    });
    return {
      sucesso: true,
      dados: response.data
    };
  } catch (error) {
    console.error('Erro ao validar numeros WhatsApp:', {
      message: error.message,
      statusCode: error?.response?.status,
      data: error?.response?.data
    });
    return {
      sucesso: false,
      erro: error.response?.data?.message || error.message
    };
  }
}

/**
 * Sincroniza mensagens de um chat para o sistema
 */
async function sincronizarChat(evolutionInstance, chatId, leadId, limiteMensagens = 100) {
  const { EvolutionInstance, Lead, Conversa, Mensagem } = require('../models');
  const iaService = require('./ia');
  
  try {
    // Buscar instância do banco (aceita ID ou objeto)
    let instance;
    if (typeof evolutionInstance === 'object' && evolutionInstance.id) {
      // Se já é um objeto com id, buscar novamente para garantir dados atualizados
      instance = await EvolutionInstance.findByPk(evolutionInstance.id);
    } else if (typeof evolutionInstance === 'number' || typeof evolutionInstance === 'string') {
      // Se é um ID, buscar
      instance = await EvolutionInstance.findByPk(evolutionInstance);
    } else {
      throw new Error('Parâmetro evolutionInstance inválido');
    }
    
    if (!instance) {
      throw new Error('Instância Evolution não encontrada');
    }
    
    const apiKey = decryptApiKey(instance.apiKey);
    
    // Buscar mensagens do chat
    const resultado = await buscarMensagensChat(
      instance.apiUrl,
      instance.instanceName,
      apiKey,
      chatId,
      limiteMensagens
    );
    
    if (!resultado.sucesso) {
      throw new Error(resultado.erro);
    }
    
    // Buscar ou criar conversa
    let conversa = await Conversa.findOne({
      where: { leadId, chatId }
    });
    
    if (!conversa) {
      conversa = await Conversa.create({
        leadId,
        consultorId: instance.consultorId,
        plataforma: 'whatsapp',
        chatId,
        status: 'ativa'
      });
    }
    
    const mensagensArray = Array.isArray(resultado.mensagens) ? resultado.mensagens : [];
    const mensagensOrdenadas = mensagensArray
      .map((item) => ({ item, timestamp: extractMessageTimestamp(item) || 0 }))
      .sort((a, b) => a.timestamp - b.timestamp)
      .map((entry) => entry.item);

    let mensagensNovas = 0;

    // Processar cada mensagem
    for (const msg of mensagensOrdenadas) {
      const messageKey = msg.key || {};
      const messageId = messageKey.id;

      // Verificar se já existe
      const existe = await Mensagem.findOne({
        where: { evolutionMessageId: messageId }
      });
      
      if (existe) continue;
      
      // Determinar remetente
      const remetente = messageKey.fromMe ? 'consultor' : 'lead';
      
      // Extrair conteúdo
      let conteudo = '';
      let tipoMidia = 'texto';
      let urlMidia = null;
      
      if (msg.message?.conversation) {
        conteudo = msg.message.conversation;
      } else if (msg.message?.extendedTextMessage?.text) {
        conteudo = msg.message.extendedTextMessage.text;
      } else if (msg.message?.imageMessage?.caption) {
        conteudo = msg.message.imageMessage.caption || '[Imagem]';
        tipoMidia = 'imagem';
        urlMidia = msg.message.imageMessage.url;
      } else if (msg.message?.audioMessage) {
        conteudo = '[Áudio]';
        tipoMidia = 'audio';
        urlMidia = msg.message.audioMessage.url;
      } else if (msg.message?.documentMessage) {
        conteudo = msg.message.documentMessage.fileName || '[Documento]';
        tipoMidia = 'documento';
        urlMidia = msg.message.documentMessage.url;
      } else {
        conteudo = '[Mensagem não suportada]';
      }
      
      const timestampUnix = extractMessageTimestamp(msg);
      const dataMensagem = timestampUnix ? new Date(timestampUnix * 1000) : new Date();
      const statusMensagem = extractMessageStatus(msg);

      // Criar mensagem
      const novaMensagem = await Mensagem.create({
        conversaId: conversa.id,
        remetente,
        conteudo,
        tipoMidia,
        urlMidia,
        evolutionMessageId: messageId,
        timestamp: dataMensagem,
        status: statusMensagem,
        analisadaPorIA: false
      });
      
      mensagensNovas++;
      
      // Analisar com IA se for mensagem do lead
      if (remetente === 'lead' && tipoMidia === 'texto') {
        try {
          const analise = await iaService.analisarMensagem(conteudo);
          
          const { AnaliseIA } = require('../models');
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
        } catch (error) {
          console.error('Erro ao analisar mensagem:', error);
        }
      }
    }
    
    // Atualizar última mensagem da conversa
    if (mensagensOrdenadas.length > 0) {
      const ultimaMensagem = mensagensOrdenadas[mensagensOrdenadas.length - 1];
      const ultimaTimestamp = extractMessageTimestamp(ultimaMensagem);
      await conversa.update({
        ultimaMensagem: ultimaTimestamp ? new Date(ultimaTimestamp * 1000) : new Date()
      });
    }
    
    // Recalcular temperatura do lead
    const temperatura = await iaService.calcularTemperaturaLead(conversa.id);
    await Lead.update(
      { 
        temperaturaLead: temperatura,
        ultimaMensagem: conversa.ultimaMensagem,
        totalMensagens: await Mensagem.count({ where: { conversaId: conversa.id } })
      },
      { where: { id: leadId } }
    );
    
    // Atualizar última sincronização
    await instance.update({ ultimaSincronizacao: new Date() });
    
    return {
      sucesso: true,
      mensagensNovas,
      temperaturaAtualizada: temperatura
    };
    
  } catch (error) {
    console.error('Erro ao sincronizar chat:', error);
    return {
      sucesso: false,
      erro: error.message
    };
  }
}

/**
 * Importa todos os chats da instância Evolution
 */
async function importarTodosChats(evolutionInstanceId, consultorId) {
  const { EvolutionInstance } = require('../models');

  const instance = await EvolutionInstance.findByPk(evolutionInstanceId);
  if (!instance) {
    throw new Error('Instância não encontrada');
  }

  const apiKey = decryptApiKey(instance.apiKey);

  // Buscar todos os contatos
  const resultado = await buscarContatos(
    instance.apiUrl,
    instance.instanceName,
    apiKey
  );

  if (!resultado.sucesso) {
    throw new Error(resultado.erro);
  }

    let leadsSincronizados = 0;

  const processarContato = async (contato) => {
    try {
        const resultadoContato = await importarHistoricoContato(instance, consultorId, contato, {
          limiteMensagens: 1000,
          criarSeNaoExiste: true
        });
        if (resultadoContato.lead) {
          leadsSincronizados++;
        }
    } catch (error) {
      console.error('Erro ao processar contato durante carga inicial:', {
        contato,
        erro: error?.message || error
      });
    }
  };

  const contatosValidos = (resultado.contatos || []).filter((contato) => {
    const chatId = contato?.remoteJid || contato?.id || contato?.jid;
    return Boolean(normalizeChatId(chatId));
  });

  const tarefas = contatosValidos.map((contato) => () => processarContato(contato));

  const executarComConcorrencia = async (jobs, limite = 5) => {
    for (let i = 0; i < jobs.length; i += limite) {
      const lote = jobs.slice(i, i + limite);
      await Promise.allSettled(lote.map((job) => job()));
    }
  };

  await executarComConcorrencia(tarefas, 5);

    return {
      sucesso: true,
      leadsSincronizados,
      totalContatos: resultado.contatos.length,
      totalContatosValidos: contatosValidos.length
    };
}

/**
 * Atualiza mensagens dos leads já sincronizados com a Evolution
 */
async function sincronizarMensagensLeads(evolutionInstanceId, consultorId, { limiteMensagens = 100 } = {}) {
  const { EvolutionInstance, Conversa } = require('../models');

  const instance = await EvolutionInstance.findByPk(evolutionInstanceId);
  if (!instance) {
    throw new Error('Instância Evolution não encontrada');
  }

  const conversas = await Conversa.findAll({
    where: {
      consultorId,
      plataforma: 'whatsapp',
      chatId: { [Op.ne]: null }
    }
  });

  if (!conversas.length) {
    return {
      sucesso: true,
      conversasProcessadas: 0,
      conversasSincronizadas: 0
    };
  }

  let sincronizadas = 0;
  for (const conversa of conversas) {
    try {
      const resultado = await sincronizarChat(instance, conversa.chatId, conversa.leadId, limiteMensagens);
      if (resultado.sucesso) sincronizadas++;
    } catch (error) {
      console.error('Erro ao sincronizar conversa do lead:', {
        leadId: conversa.leadId,
        chatId: conversa.chatId,
        erro: error?.message || error
      });
    }
  }

  await instance.update({ ultimaSincronizacao: new Date() });

  return {
    sucesso: true,
    conversasProcessadas: conversas.length,
    conversasSincronizadas: sincronizadas
  };
}

module.exports = {
  encryptApiKey,
  decryptApiKey,
  testarConexao,
  configurarWebhook,
  buscarMensagensChat,
  buscarContatos,
  validarNumerosWhatsapp,
  sincronizarMensagensLeads,
  sincronizarChat,
  importarTodosChats,
  importarHistoricoContato
};
