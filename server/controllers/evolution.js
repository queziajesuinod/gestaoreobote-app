const { EvolutionInstance, Conversa } = require('../models');
const evolutionService = require('../services/evolutionService');

const resolveConsultorId = (req) => {
  const perfil = (req.user?.perfil || '').toUpperCase();
  const podeSelecionar = perfil === 'ADMIN' || perfil === 'GESTOR';
  const consultorParam = req.body?.consultorId ?? req.query?.consultorId;
  const consultorIdParam = consultorParam !== undefined && consultorParam !== null
    ? Number(consultorParam)
    : null;

  if (podeSelecionar && consultorIdParam) {
    return consultorIdParam;
  }

  const consultorIdToken = req.user?.consultorId;
  return consultorIdToken ? Number(consultorIdToken) : null;
};

const ensureConsultorId = (req, res) => {
  const consultorId = resolveConsultorId(req);
  if (!consultorId || Number.isNaN(consultorId)) {
    res.status(400).json({
      sucesso: false,
      mensagem: 'Consultor nao informado.'
    });
    return null;
  }
  return consultorId;
};

const buscarInstanciaConsultor = async (req, res) => {
  const consultorId = ensureConsultorId(req, res);
  if (!consultorId) return null;

  const instancia = await EvolutionInstance.findOne({
    where: { consultorId }
  });
  if (!instancia) {
    res.status(404).json({
      sucesso: false,
      mensagem: 'Instancia Evolution nao configurada'
    });
    return null;
  }

  return { consultorId, instancia };
};

const iniciarCargaInicial = (instancia, consultorId, sincronizarAutomaticamente) => {
  if (!instancia || !consultorId || !sincronizarAutomaticamente) return;
  if (instancia.ultimaSincronizacao) return;

  evolutionService.importarTodosChats(instancia.id, consultorId)
    .then((resultado) => {
      console.log('Carga inicial Evolution concluida', {
        consultorId,
        instanciaId: instancia.id,
        totalContatos: resultado.totalContatos,
        leadsImportados: resultado.leadsImportados
      });
    })
    .catch((erro) => {
      console.error('Erro na carga inicial Evolution:', erro);
    });
};

/**
 * Configurar nova instância Evolution
 */
async function configurarInstancia(req, res) {
  try {
    const { instanceName, apiUrl, apiKey, sincronizarAutomaticamente } = req.body;
    const consultorId = ensureConsultorId(req, res);
    if (!consultorId) return;
    
    // Testar conexão
    const teste = await evolutionService.testarConexao(apiUrl, instanceName, apiKey);
    
    if (!teste.sucesso) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Falha ao conectar com a instância Evolution',
        erro: teste.erro
      });
    }
    
    // Verificar se já existe instância para este consultor
    const instanciaExistente = await EvolutionInstance.findOne({
      where: { consultorId }
    });
    
    if (instanciaExistente) {
      // Atualizar
      await instanciaExistente.update({
        instanceName,
        apiUrl,
        apiKey: evolutionService.encryptApiKey(apiKey),
        status: teste.status === 'open' ? 'conectada' : 'desconectada',
        sincronizarAutomaticamente,
      ultimaConexao: new Date()
      });
      iniciarCargaInicial(instanciaExistente, consultorId, sincronizarAutomaticamente);

      return res.json({
        sucesso: true,
        mensagem: 'Instância atualizada com sucesso',
        instancia: instanciaExistente
      });
    }
    
    // Criar nova
    const novaInstancia = await EvolutionInstance.create({
      consultorId,
      instanceName,
      apiUrl,
      apiKey: evolutionService.encryptApiKey(apiKey),
      status: teste.status === 'open' ? 'conectada' : 'desconectada',
      sincronizarAutomaticamente,
      ultimaConexao: new Date()
    });
    iniciarCargaInicial(novaInstancia, consultorId, sincronizarAutomaticamente);
    
    // Configurar webhook
    const webhookUrl = `${process.env.REACT_APP_API_URL}/webhook/evolution/${novaInstancia.id}`;
    await evolutionService.configurarWebhook(apiUrl, instanceName, apiKey, webhookUrl);
    
    res.json({
      sucesso: true,
      mensagem: 'Instância configurada com sucesso',
      instancia: novaInstancia
    });
    
  } catch (error) {
    console.error('Erro ao configurar instância:', error);
    res.status(500).json({ sucesso: false, erro: error.message });
  }
}

/**
 * Obter status da instância
 */
async function obterStatus(req, res) {
  try {
    const consultorId = ensureConsultorId(req, res);
    if (!consultorId) return;
    
    const instancia = await EvolutionInstance.findOne({
      where: { consultorId }
    });
    
    if (!instancia) {
      return res.json({
        sucesso: true,
        configurada: false
      });
    }
    
    // Testar conexão atual
    const apiKey = evolutionService.decryptApiKey(instancia.apiKey);
    const teste = await evolutionService.testarConexao(
      instancia.apiUrl,
      instancia.instanceName,
      apiKey
    );
    
    // Atualizar status apenas quando o teste for bem sucedido
    const novoStatus = teste.sucesso
      ? (teste.status === 'open' ? 'conectada' : 'desconectada')
      : instancia.status;
    const ultimaConexao = teste.sucesso ? new Date() : instancia.ultimaConexao;

    const instanciaAtualizada = await instancia.update({
      status: novoStatus,
      ultimaConexao
    });
    
    res.json({
      sucesso: true,
      configurada: true,
      teste,
      instancia: {
        id: instanciaAtualizada.id,
        instanceName: instanciaAtualizada.instanceName,
        apiUrl: instanciaAtualizada.apiUrl,
        apiKey,
        status: instanciaAtualizada.status,
        ultimaConexao: instanciaAtualizada.ultimaConexao,
        ultimaSincronizacao: instanciaAtualizada.ultimaSincronizacao,
        sincronizarAutomaticamente: instanciaAtualizada.sincronizarAutomaticamente
      }
    });
    
  } catch (error) {
    console.error('Erro ao obter status:', error);
    res.status(500).json({ sucesso: false, erro: error.message });
  }
}

/**
 * Importar chats do WhatsApp
 */
async function importarChats(req, res) {
  try {
    const contexto = await buscarInstanciaConsultor(req, res);
    if (!contexto) return;

    // Importar em background (pode demorar)
    const resultado = await evolutionService.importarTodosChats(
      contexto.instancia.id,
      contexto.consultorId
    );

    res.json({
      sucesso: resultado.sucesso,
      mensagem: resultado.sucesso
        ? `${resultado.leadsSincronizados} leads sincronizados com sucesso`
        : 'Erro ao importar chats',
      ...resultado
    });

  } catch (error) {
    console.error('Erro ao importar chats:', error);
    res.status(500).json({ sucesso: false, erro: error.message });
  }
}

async function sincronizarMensagens(req, res) {
  try {
    const contexto = await buscarInstanciaConsultor(req, res);
    if (!contexto) return;

    const resultado = await evolutionService.sincronizarMensagensLeads(
      contexto.instancia.id,
      contexto.consultorId
    );

    res.json({
      sucesso: resultado.sucesso,
      mensagem: resultado.sucesso
        ? 'Mensagens sincronizadas com sucesso'
        : 'Nenhuma conversa encontrada para sincronizar',
      ...resultado
    });

  } catch (error) {
    console.error('Erro ao sincronizar mensagens Evolution:', error);
    res.status(500).json({ sucesso: false, erro: error.message });
  }
}

async function listarContatos(req, res) {
  try {
    const contexto = await buscarInstanciaConsultor(req, res);
    if (!contexto) return;

    const { instancia } = contexto;
    const apiKey = evolutionService.decryptApiKey(instancia.apiKey);
    const termo = (req.query.q || req.query.search || '').toString().trim().toLowerCase();
    const limite = Number(req.query.limit) || 50;
    if (!termo) {
      return res.json({
        sucesso: true,
        contatos: []
      });
    }

    const resultado = await evolutionService.buscarContatos(
      instancia.apiUrl,
      instancia.instanceName,
      apiKey
    );

    if (!resultado.sucesso) {
      return res.status(500).json({
        sucesso: false,
        erro: resultado.erro || 'Falha ao buscar contatos'
      });
    }

    const contatos = Array.isArray(resultado.contatos) ? resultado.contatos : [];

    const normalizeChatId = (value) => {
      if (!value) return null;
      const str = value.toString();
      if (!str.includes('@')) return null;
      const lower = str.toLowerCase();
      if (lower.endsWith('@g.us') || lower.includes('@g.')) return null;
      return str;
    };

    const contatosMapeados = contatos
      .map((contato) => {
        const chatId = normalizeChatId(
          contato?.remoteJid || contato?.id || contato?.jid
        );
        return chatId ? { contato, chatId } : null;
      })
      .filter(Boolean);

    let validChatIds = new Set();
    if (contatosMapeados.length) {
      const chatIds = contatosMapeados.map((item) => item.chatId);
      const conversas = await Conversa.findAll({
        where: {
          consultorId: contexto.consultorId,
          chatId: chatIds
        },
        attributes: ['chatId']
      });
      validChatIds = new Set(conversas.map((conversa) => conversa.chatId).filter(Boolean));
    }

    const contatosValidos = contatosMapeados
      .filter((entry) => validChatIds.has(entry.chatId))
      .map((entry) => entry.contato);

    const filtrados = termo
      ? contatosValidos.filter((contato) => {
        const values = [
          contato?.remoteJid,
          contato?.id,
          contato?.jid,
          contato?.name,
          contato?.pushName
        ].filter(Boolean).map((value) => value.toString().toLowerCase());
        return values.some((value) => value.includes(termo));
      })
      : [];

    const selecionados = filtrados.slice(0, limite).map((contato) => {
      const chatId = contato?.remoteJid || contato?.id || contato?.jid || '';
      const nome = contato?.name || contato?.pushName || chatId;
      const telefone = chatId && chatId.includes('@') ? chatId.split('@')[0] : chatId;
      return {
        id: contato?.id || chatId,
        chatId,
        nome,
        telefone,
        pushName: contato?.pushName || null
      };
    });

    res.json({
      sucesso: true,
      contatos: selecionados
    });
  } catch (error) {
    console.error('Erro ao listar contatos Evolution:', error);
    res.status(500).json({ sucesso: false, erro: error.message });
  }
}

async function importarContato(req, res) {
  try {
    const { chatId, nome, pushName } = req.body;
    if (!chatId) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Identificador do contato não informado.'
      });
    }

    const contexto = await buscarInstanciaConsultor(req, res);
    if (!contexto) return;

    const resultado = await evolutionService.importarHistoricoContato(
      contexto.instancia,
      contexto.consultorId,
      { remoteJid: chatId, name: nome, pushName },
      { limiteMensagens: 1000 }
    );

    res.json({
      sucesso: true,
      lead: {
        id: resultado.lead.id,
        nome: resultado.lead.nome,
        telefone: resultado.lead.telefone,
        consultorId: resultado.lead.consultorId
      },
      leadCriado: resultado.leadCriado,
      mensagem: `${resultado.lead.nome} sincronizado com sucesso.`
    });
  } catch (error) {
    console.error('Erro ao importar contato Evolution:', error);
    res.status(500).json({ sucesso: false, erro: error.message });
  }
}

async function cargaInicial(req, res) {
  try {
    const contexto = await buscarInstanciaConsultor(req, res);
    if (!contexto) return;

    const resultado = await evolutionService.importarTodosChats(
      contexto.instancia.id,
      contexto.consultorId
    );

    res.json({
      sucesso: resultado.sucesso,
      mensagem: resultado.sucesso
        ? 'Carga inicial disparada com sucesso'
        : 'Erro ao executar carga inicial',
      ...resultado
    });

  } catch (error) {
    console.error('Erro ao executar carga inicial:', error);
    res.status(500).json({ sucesso: false, erro: error.message });
  }
}

/**
 * Desconectar instância
 */
async function desconectar(req, res) {
  try {
    const consultorId = req.user.consultorId;
    
    const instancia = await EvolutionInstance.findOne({
      where: { consultorId }
    });
    
    if (!instancia) {
      return res.status(404).json({
        sucesso: false,
        mensagem: 'Instância não encontrada'
      });
    }
    
    await instancia.destroy();
    
    res.json({
      sucesso: true,
      mensagem: 'Instância desconectada com sucesso'
    });
    
  } catch (error) {
    console.error('Erro ao desconectar:', error);
    res.status(500).json({ sucesso: false, erro: error.message });
  }
}

module.exports = {
  configurarInstancia,
  obterStatus,
  importarChats,
  listarContatos,
  importarContato,
  cargaInicial,
  sincronizarMensagens,
  desconectar
};
