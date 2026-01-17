const { Lead, Conversa, Mensagem, AnaliseIA, Cliente, Cota, Consultor, LeadAgendor, EvolutionInstance } = require('../models');
const { Op } = require('sequelize');
const iaService = require('../services/ia');
const agendorService = require('../services/agendor');
const evolutionService = require('../services/evolutionService');

const formatWhatsappNumberInput = (value) => {
  let digits = (value || '').toString().replace(/\D+/g, '');
  if (!digits) return null;
  if (!digits.startsWith('55')) {
    if (digits.length >= 10 && digits.length <= 11) {
      digits = `55${digits}`;
    } else {
      return null;
    }
  }
  if (!digits.startsWith('55')) return null;
  if (digits.length < 12 || digits.length > 13) return null;
  return digits;
};

const parseNullableNumber = (value) => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

/**
 * Listar leads do consultor (ou todos para gestor)
 */
async function listarLeads(req, res) {
  try {
    const { consultorId } = req.params;
    const { status, temperatura, ordenar, limite = 50 } = req.query;
    
    // Controle de acesso
    const isGestor = req.user.perfilId === 1; // Admin
    const consultorIdFiltro = isGestor && consultorId !== 'todos' 
      ? parseInt(consultorId)
      : req.user.consultorId;
    
    if (!isGestor && req.user.consultorId !== consultorIdFiltro) {
      return res.status(403).json({
        sucesso: false,
        mensagem: 'Você só pode ver seus próprios leads'
      });
    }
    
    // Filtros
    const where = {};
    if (consultorIdFiltro) where.consultorId = consultorIdFiltro;
    if (status) where.status = status;
    if (temperatura === 'quente') where.temperaturaLead = { [Op.gte]: 70 };
    if (temperatura === 'morno') where.temperaturaLead = { [Op.between]: [40, 69] };
    if (temperatura === 'frio') where.temperaturaLead = { [Op.lt]: 40 };
    
    // Ordenação
    let order = [['ultimaMensagem', 'DESC']];
    if (ordenar === 'temperatura') order = [['temperaturaLead', 'DESC']];
    if (ordenar === 'nome') order = [['nome', 'ASC']];
    
    const leads = await Lead.findAll({
      where,
      include: [
        {
          model: Consultor,
          as: 'consultor',
          attributes: ['id', 'nome', 'email']
        },
        {
          model: Cliente,
          as: 'cliente',
          attributes: ['id', 'nome'],
          required: false
        },
        {
          model: LeadAgendor,
          as: 'agendor',
          required: false
        }
      ],
      order,
      limit: parseInt(limite)
    });
    
    // Agrupar por temperatura
    const agrupados = {
      quentes: leads.filter(l => l.temperaturaLead >= 70),
      mornos: leads.filter(l => l.temperaturaLead >= 40 && l.temperaturaLead < 70),
      frios: leads.filter(l => l.temperaturaLead < 40)
    };
    
    res.json({
      sucesso: true,
      total: leads.length,
      agrupados,
      leads
    });
    
  } catch (error) {
    console.error('Erro ao listar leads:', error);
    res.status(500).json({ sucesso: false, erro: error.message });
  }
}

/**
 * Obter detalhes de um lead específico
 */
async function obterLead(req, res) {
  try {
    const { leadId } = req.params;
    
    const lead = await Lead.findByPk(leadId, {
      include: [
        {
          model: Consultor,
          as: 'consultor',
          attributes: ['id', 'nome', 'email']
        },
        {
          model: Cliente,
          as: 'cliente'
        },
        {
          model: Conversa,
          as: 'conversas',
          include: [
            {
              model: Mensagem,
              as: 'mensagens',
              include: [{ model: AnaliseIA, as: 'analise' }],
              order: [['timestamp', 'ASC']],
              limit: 100
            }
          ]
        },
        {
          model: LeadAgendor,
          as: 'agendor'
        }
      ]
    });
    
    if (!lead) {
      return res.status(404).json({
        sucesso: false,
        mensagem: 'Lead não encontrado'
      });
    }
    
    // Controle de acesso
    const isGestor = req.user.perfilId === 1;
    if (!isGestor && req.user.consultorId !== lead.consultorId) {
      return res.status(403).json({
        sucesso: false,
        mensagem: 'Acesso negado'
      });
    }
    
    // Gerar resumo de IA se não existir
    if (!lead.resumoIA && lead.conversas && lead.conversas[0]) {
      const resumo = await iaService.gerarResumoConversa(lead.conversas[0].id);
      await lead.update({ resumoIA: resumo });
      lead.resumoIA = resumo;
    }
    
    res.json({
      sucesso: true,
      lead
    });
    
  } catch (error) {
    console.error('Erro ao obter lead:', error);
    res.status(500).json({ sucesso: false, erro: error.message });
  }
}

/**
 * Criar lead manualmente
 */
async function criarLead(req, res) {
  try {
    const {
      nome,
      telefone,
      email,
      interesseEm,
      valorDesejado,
      prazoDesejado,
      consultorId: consultorIdBody,
      status: statusBody,
      temperaturaLead: temperaturaBody
    } = req.body;
    const isGestor = req.user.perfilId === 1;
    const allowsConsultorSelection = isGestor || !req.user.consultorId;
    const targetConsultorId = allowsConsultorSelection && consultorIdBody
      ? Number(consultorIdBody)
      : req.user.consultorId;
    if (!targetConsultorId) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Consultor inválido para o lead'
      });
    }

    const validStatuses = ['novo', 'em_contato', 'qualificado', 'perdido', 'convertido'];
    const status = validStatuses.includes(statusBody) ? statusBody : 'novo';
    const temperatura = Number.isFinite(Number(temperaturaBody))
      ? Number(temperaturaBody)
      : 50;

    const telefoneFormatado = formatWhatsappNumberInput(telefone);
    if (!telefoneFormatado) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Telefone deve estar no formato 55DDDNUMERO sem caracteres especiais'
      });
    }

    const instanciaEvolution = await EvolutionInstance.findOne({
      where: { consultorId: targetConsultorId }
    });
    if (!instanciaEvolution) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Instancia Evolution nao configurada para este consultor'
      });
    }

    const apiKey = evolutionService.decryptApiKey(instanciaEvolution.apiKey);
    const validacaoWhatsapp = await evolutionService.validarNumerosWhatsapp(
      instanciaEvolution.apiUrl,
      instanciaEvolution.instanceName,
      apiKey,
      [telefoneFormatado]
    );
    if (!validacaoWhatsapp.sucesso) {
      return res.status(400).json({
        sucesso: false,
        mensagem: validacaoWhatsapp.erro || 'Telefone do WhatsApp nao validado'
      });
    }
    
    // Verificar se já existe
    const existente = await Lead.findOne({
      where: { telefone: telefoneFormatado, consultorId: targetConsultorId }
    });
    
    if (existente) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Já existe um lead com este telefone'
      });
    }
    
    const novoLead = await Lead.create({
      consultorId: targetConsultorId,
      nome,
      telefone: telefoneFormatado,
      email,
      origem: 'manual',
      status,
      interesseEm,
      valorDesejado,
      prazoDesejado,
      temperaturaLead: temperatura
    });
    
    res.json({
      sucesso: true,
      mensagem: 'Lead criado com sucesso',
      lead: novoLead
    });
    
  } catch (error) {
    console.error('Erro ao criar lead:', error);
    res.status(500).json({ sucesso: false, erro: error.message });
  }
}

/**
 * Atualizar lead
 */
async function atualizarLead(req, res) {
  try {
    const { leadId } = req.params;
    const {
      nome,
      status,
      interesseEm,
      valorDesejado,
      prazoDesejado,
      email,
      telefone
    } = req.body;
    
    const lead = await Lead.findByPk(leadId);
    
    if (!lead) {
      return res.status(404).json({
        sucesso: false,
        mensagem: 'Lead não encontrado'
      });
    }
    
    // Controle de acesso
    const isGestor = req.user.perfilId === 1;
    if (!isGestor && req.user.consultorId !== lead.consultorId) {
      return res.status(403).json({
        sucesso: false,
        mensagem: 'Acesso negado'
      });
    }
    
    const payload = {
      nome,
      status,
      interesseEm,
      valorDesejado: parseNullableNumber(valorDesejado),
      prazoDesejado: parseNullableNumber(prazoDesejado),
      email
    };

    if (telefone !== undefined) {
      const telefoneFormatado = formatWhatsappNumberInput(telefone);
      if (!telefoneFormatado) {
        return res.status(400).json({
          sucesso: false,
          mensagem: 'Telefone deve estar no formato 55DDDNUMERO sem caracteres especiais'
        });
      }

      const conflito = await Lead.findOne({
        where: {
          telefone: telefoneFormatado,
          consultorId: lead.consultorId,
          id: { [Op.ne]: lead.id }
        }
      });
      if (conflito) {
        return res.status(400).json({
          sucesso: false,
          mensagem: 'Outro lead com este telefone já existe'
        });
      }

      const instanciaEvolution = await EvolutionInstance.findOne({
        where: { consultorId: lead.consultorId }
      });
      if (!instanciaEvolution) {
        return res.status(400).json({
          sucesso: false,
          mensagem: 'Instancia Evolution nao configurada para este consultor'
        });
      }

      const apiKey = evolutionService.decryptApiKey(instanciaEvolution.apiKey);
      const validacaoWhatsapp = await evolutionService.validarNumerosWhatsapp(
        instanciaEvolution.apiUrl,
        instanciaEvolution.instanceName,
        apiKey,
        [telefoneFormatado]
      );
      if (!validacaoWhatsapp.sucesso) {
        return res.status(400).json({
          sucesso: false,
          mensagem: validacaoWhatsapp.erro || 'Telefone do WhatsApp nao validado'
        });
      }

      payload.telefone = telefoneFormatado;
    }

    await lead.update(payload);
    
    res.json({
      sucesso: true,
      mensagem: 'Lead atualizado com sucesso',
      lead
    });
    
  } catch (error) {
    console.error('Erro ao atualizar lead:', error);
    res.status(500).json({ sucesso: false, erro: error.message });
  }
}

/**
 * Promover lead a cliente
 */
async function promoverACliente(req, res) {
  try {
    const { leadId } = req.params;
    const { 
      cpf, 
      dtnascimento, 
      cidade, 
      estado, 
      profissao,
      criarCota,
      dadosCota 
    } = req.body;
    
    const lead = await Lead.findByPk(leadId);
    
    if (!lead) {
      return res.status(404).json({
        sucesso: false,
        mensagem: 'Lead não encontrado'
      });
    }
    
    // Controle de acesso
    const isGestor = req.user.perfilId === 1;
    if (!isGestor && req.user.consultorId !== lead.consultorId) {
      return res.status(403).json({
        sucesso: false,
        mensagem: 'Acesso negado'
      });
    }
    
    // Verificar se já foi convertido
    if (lead.status === 'convertido' && lead.clienteId) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Este lead já foi convertido em cliente'
      });
    }
    
    // Criar cliente
    const novoCliente = await Cliente.create({
      nome: lead.nome,
      cpf,
      cidade,
      estado,
      dtnascimento,
      profissao,
      celular: lead.telefone,
      email: lead.email || `${lead.telefone}@temp.com`
    });
    
    // Atualizar lead
    await lead.update({
      status: 'convertido',
      clienteId: novoCliente.id
    });
    
    // Criar cota se solicitado
    let cota = null;
    if (criarCota && dadosCota) {
      cota = await Cota.create({
        grupo: dadosCota.grupo,
        cota: dadosCota.cota,
        digito: dadosCota.digito,
        valor: dadosCota.valor || lead.valorDesejado,
        valorTotal: dadosCota.valorTotal,
        dtaquisicao: new Date(),
        clienteId: novoCliente.id,
        consultorId: lead.consultorId,
        administradora: dadosCota.administradora
      });
    }
    
    res.json({
      sucesso: true,
      mensagem: 'Lead promovido a cliente com sucesso',
      cliente: novoCliente,
      cota
    });
    
  } catch (error) {
    console.error('Erro ao promover lead:', error);
    res.status(500).json({ sucesso: false, erro: error.message });
  }
}

/**
 * Vincular lead a negócio do Agendor
 */
async function vincularAgendor(req, res) {
  try {
    const { leadId } = req.params;
    const { negocioId } = req.body;
    
    const lead = await Lead.findByPk(leadId);
    
    if (!lead) {
      return res.status(404).json({
        sucesso: false,
        mensagem: 'Lead não encontrado'
      });
    }
    
    // Controle de acesso
    const isGestor = req.user.perfilId === 1;
    if (!isGestor && req.user.consultorId !== lead.consultorId) {
      return res.status(403).json({
        sucesso: false,
        mensagem: 'Acesso negado'
      });
    }
    
    // Buscar dados do negócio no Agendor
    const userToken = req.user.agendorToken;
    const negocio = await agendorService.obterNegocio(negocioId, userToken);
    
    if (!negocio) {
      return res.status(404).json({
        sucesso: false,
        mensagem: 'Negócio não encontrado no Agendor'
      });
    }
    
    // Buscar tarefas do negócio
    const tarefas = await agendorService.obterTarefasNegocio(negocioId, userToken);
    
    // Criar ou atualizar vinculação
    const [leadAgendor, criado] = await LeadAgendor.upsert({
      leadId: lead.id,
      negocioId: negocio.id.toString(),
      negocioNome: negocio.title,
      valorNegocio: negocio.value,
      funilId: negocio.funnel?.id?.toString(),
      funilNome: negocio.funnel?.name,
      estagioId: negocio.stage?.id?.toString(),
      estagioNome: negocio.stage?.name,
      totalTarefas: tarefas.length,
      tarefasPendentes: tarefas.filter(t => !t.done).length,
      proximaTarefa: tarefas.find(t => !t.done)?.dueDate,
      ultimaSincronizacao: new Date()
    }, {
      returning: true
    });
    
    // Atualizar lead
    await lead.update({ negocioAgendorId: negocioId });
    
    res.json({
      sucesso: true,
      mensagem: criado ? 'Lead vinculado ao Agendor' : 'Vinculação atualizada',
      agendor: leadAgendor
    });
    
  } catch (error) {
    console.error('Erro ao vincular Agendor:', error);
    res.status(500).json({ sucesso: false, erro: error.message });
  }
}

/**
 * Sincronizar dados do Agendor
 */
async function sincronizarAgendor(req, res) {
  try {
    const { leadId } = req.params;
    
    const lead = await Lead.findByPk(leadId, {
      include: [{ model: LeadAgendor, as: 'agendor' }]
    });
    
    if (!lead || !lead.agendor) {
      return res.status(404).json({
        sucesso: false,
        mensagem: 'Lead ou vinculação não encontrada'
      });
    }
    
    // Controle de acesso
    const isGestor = req.user.perfilId === 1;
    if (!isGestor && req.user.consultorId !== lead.consultorId) {
      return res.status(403).json({
        sucesso: false,
        mensagem: 'Acesso negado'
      });
    }
    
    // Buscar dados atualizados
    const userToken = req.user.agendorToken;
    const negocio = await agendorService.obterNegocio(lead.agendor.negocioId, userToken);
    const tarefas = await agendorService.obterTarefasNegocio(lead.agendor.negocioId, userToken);
    
    // Atualizar
    await lead.agendor.update({
      negocioNome: negocio.title,
      valorNegocio: negocio.value,
      funilId: negocio.funnel?.id?.toString(),
      funilNome: negocio.funnel?.name,
      estagioId: negocio.stage?.id?.toString(),
      estagioNome: negocio.stage?.name,
      totalTarefas: tarefas.length,
      tarefasPendentes: tarefas.filter(t => !t.done).length,
      proximaTarefa: tarefas.find(t => !t.done)?.dueDate,
      ultimaSincronizacao: new Date()
    });
    
    res.json({
      sucesso: true,
      mensagem: 'Dados sincronizados com sucesso',
      agendor: lead.agendor,
      tarefas: tarefas.map(t => ({
        id: t.id,
        titulo: t.title,
        concluida: t.done,
        dataVencimento: t.dueDate
      }))
    });
    
  } catch (error) {
    console.error('Erro ao sincronizar Agendor:', error);
    res.status(500).json({ sucesso: false, erro: error.message });
  }
}

module.exports = {
  listarLeads,
  obterLead,
  criarLead,
  atualizarLead,
  promoverACliente,
  vincularAgendor,
  sincronizarAgendor
};
