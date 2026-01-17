const { Lead, Conversa, Mensagem, AnaliseIA, Consultor } = require('../models');
const { Op } = require('sequelize');

/**
 * Gera insights consolidados para um lead específico
 */
async function gerarInsightsLead(leadId) {
  try {
    console.log(`[INSIGHTS] Gerando insights para lead: ${leadId}`);
    
    const lead = await Lead.findByPk(leadId, {
      include: [
        {
          model: Conversa,
          as: 'conversas',
          include: [
            {
              model: Mensagem,
              as: 'mensagens',
              include: [{ model: AnaliseIA, as: 'analise' }],
              order: [['timestamp', 'ASC']]
            }
          ]
        }
      ]
    });
    
    if (!lead) {
      console.log(`[INSIGHTS] Lead não encontrado: ${leadId}`);
      return null;
    }
    
    console.log(`[INSIGHTS] Lead encontrado: ${lead.nome}`);
    console.log(`[INSIGHTS] Conversas: ${lead.conversas ? lead.conversas.length : 0}`);
    
    // Se não houver conversas, retornar insights básicos
    if (!lead.conversas || lead.conversas.length === 0) {
      console.log(`[INSIGHTS] Lead sem conversas, retornando insights básicos`);
      return {
        leadId: lead.id,
        nome: lead.nome,
        temperatura: lead.temperaturaLead,
        classificacao: classificarTemperatura(lead.temperaturaLead),
        totalMensagens: 0,
        totalAnalisadas: 0,
        sinaisCompra: [],
        objecoes: [],
        topicos: [],
        distribuicaoSentimento: { positivo: 0, neutro: 0, negativo: 0 },
        tendencia: 'estavel',
        ultimaMensagem: lead.ultimaMensagem,
        diasSemMensagem: calcularDiasSemMensagem(lead.ultimaMensagem),
        recomendacoes: [{
          tipo: 'info',
          mensagem: 'Nenhuma conversa importada ainda. Sincronize as mensagens para gerar insights.',
          icone: 'ℹ️'
        }],
        resumo: lead.resumoIA || 'Sem dados de conversa'
      };
    }
    
    const mensagens = lead.conversas[0].mensagens || [];
    const mensagensComAnalise = mensagens.filter(m => m.analise);
    
    // Coletar todos os sinais de compra
    const sinaisCompraMap = {};
    mensagensComAnalise.forEach(msg => {
      if (msg.analise.sinaisCompra) {
        msg.analise.sinaisCompra.forEach(sinal => {
          sinaisCompraMap[sinal] = (sinaisCompraMap[sinal] || 0) + 1;
        });
      }
    });
    
    // Coletar todas as objeções
    const objecoesMap = {};
    mensagensComAnalise.forEach(msg => {
      if (msg.analise.objecoes) {
        msg.analise.objecoes.forEach(objecao => {
          objecoesMap[objecao] = (objecoesMap[objecao] || 0) + 1;
        });
      }
    });
    
    // Coletar tópicos
    const topicosMap = {};
    mensagensComAnalise.forEach(msg => {
      if (msg.analise.topicos) {
        msg.analise.topicos.forEach(topico => {
          topicosMap[topico] = (topicosMap[topico] || 0) + 1;
        });
      }
    });
    
    // Distribuição de sentimento
    const sentimentos = {
      positivo: 0,
      neutro: 0,
      negativo: 0
    };
    mensagensComAnalise.forEach(msg => {
      if (msg.analise.sentimento) {
        sentimentos[msg.analise.sentimento]++;
      }
    });
    
    // Calcular tendência (últimas 5 vs primeiras 5 mensagens)
    const primeiras5 = mensagensComAnalise.slice(0, 5);
    const ultimas5 = mensagensComAnalise.slice(-5);
    
    const sentimentoPrimeiras = calcularSentimentoMedio(primeiras5);
    const sentimentoUltimas = calcularSentimentoMedio(ultimas5);
    
    let tendencia = 'estavel';
    if (sentimentoUltimas > sentimentoPrimeiras + 0.2) tendencia = 'melhorando';
    if (sentimentoUltimas < sentimentoPrimeiras - 0.2) tendencia = 'piorando';
    
    // Recomendações
    const recomendacoes = gerarRecomendacoes(lead, sinaisCompraMap, objecoesMap);
    
    return {
      leadId: lead.id,
      nome: lead.nome,
      temperatura: lead.temperaturaLead,
      classificacao: classificarTemperatura(lead.temperaturaLead),
      totalMensagens: mensagens.length,
      totalAnalisadas: mensagensComAnalise.length,
      sinaisCompra: Object.entries(sinaisCompraMap)
        .map(([sinal, count]) => ({ sinal, ocorrencias: count }))
        .sort((a, b) => b.ocorrencias - a.ocorrencias),
      objecoes: Object.entries(objecoesMap)
        .map(([objecao, count]) => ({ objecao, ocorrencias: count }))
        .sort((a, b) => b.ocorrencias - a.ocorrencias),
      topicos: Object.entries(topicosMap)
        .map(([topico, count]) => ({ topico, ocorrencias: count }))
        .sort((a, b) => b.ocorrencias - a.ocorrencias)
        .slice(0, 10),
      distribuicaoSentimento: sentimentos,
      tendencia,
      ultimaMensagem: lead.ultimaMensagem,
      diasSemMensagem: calcularDiasSemMensagem(lead.ultimaMensagem),
      recomendacoes,
      resumo: lead.resumoIA
    };
    
  } catch (error) {
    console.error('Erro ao gerar insights:', error);
    return null;
  }
}

/**
 * Gera insights consolidados para um consultor
 */
async function gerarInsightsConsultor(consultorId, filtros = {}) {
  try {
    const where = { consultorId };
    
    // Aplicar filtros
    if (filtros.temperatura) {
      if (filtros.temperatura === 'quente') where.temperaturaLead = { [Op.gte]: 70 };
      if (filtros.temperatura === 'morno') where.temperaturaLead = { [Op.between]: [40, 69] };
      if (filtros.temperatura === 'frio') where.temperaturaLead = { [Op.lt]: 40 };
    }
    
    if (filtros.status) {
      where.status = filtros.status;
    }
    
    const leads = await Lead.findAll({
      where,
      include: [
        {
          model: Conversa,
          as: 'conversas',
          include: [
            {
              model: Mensagem,
              as: 'mensagens',
              include: [{ model: AnaliseIA, as: 'analise' }]
            }
          ]
        }
      ]
    });
    
    // Estatísticas gerais
    const totalLeads = leads.length;
    const leadsQuentes = leads.filter(l => l.temperaturaLead >= 70).length;
    const leadsMornos = leads.filter(l => l.temperaturaLead >= 40 && l.temperaturaLead < 70).length;
    const leadsFrios = leads.filter(l => l.temperaturaLead < 40).length;
    
    // Coletar sinais de compra globais
    const sinaisGlobais = {};
    const objecoesGlobais = {};
    const topicosGlobais = {};
    
    leads.forEach(lead => {
      if (!lead.conversas || !lead.conversas[0]) return;
      
      const mensagens = lead.conversas[0].mensagens || [];
      mensagens.forEach(msg => {
        if (!msg.analise) return;
        
        // Sinais
        if (msg.analise.sinaisCompra) {
          msg.analise.sinaisCompra.forEach(sinal => {
            sinaisGlobais[sinal] = (sinaisGlobais[sinal] || 0) + 1;
          });
        }
        
        // Objeções
        if (msg.analise.objecoes) {
          msg.analise.objecoes.forEach(objecao => {
            objecoesGlobais[objecao] = (objecoesGlobais[objecao] || 0) + 1;
          });
        }
        
        // Tópicos
        if (msg.analise.topicos) {
          msg.analise.topicos.forEach(topico => {
            topicosGlobais[topico] = (topicosGlobais[topico] || 0) + 1;
          });
        }
      });
    });
    
    // Leads que precisam de atenção
    const leadsAtencao = leads
      .filter(l => {
        const dias = calcularDiasSemMensagem(l.ultimaMensagem);
        return (l.temperaturaLead >= 60 && dias >= 2) || // Quente sem resposta há 2 dias
               (l.temperaturaLead >= 40 && dias >= 5);    // Morno sem resposta há 5 dias
      })
      .map(l => ({
        id: l.id,
        nome: l.nome,
        temperatura: l.temperaturaLead,
        diasSemMensagem: calcularDiasSemMensagem(l.ultimaMensagem),
        motivo: l.temperaturaLead >= 60 ? 'Lead quente sem interação' : 'Lead morno esfriando'
      }))
      .sort((a, b) => b.temperatura - a.temperatura)
      .slice(0, 10);
    
    return {
      consultorId,
      totalLeads,
      distribuicao: {
        quentes: leadsQuentes,
        mornos: leadsMornos,
        frios: leadsFrios
      },
      percentuais: {
        quentes: totalLeads > 0 ? ((leadsQuentes / totalLeads) * 100).toFixed(1) : '0.0',
        mornos: totalLeads > 0 ? ((leadsMornos / totalLeads) * 100).toFixed(1) : '0.0',
        frios: totalLeads > 0 ? ((leadsFrios / totalLeads) * 100).toFixed(1) : '0.0'
      },
      topSinaisCompra: Object.entries(sinaisGlobais)
        .map(([sinal, count]) => ({ sinal, ocorrencias: count }))
        .sort((a, b) => b.ocorrencias - a.ocorrencias)
        .slice(0, 10),
      topObjecoes: Object.entries(objecoesGlobais)
        .map(([objecao, count]) => ({ objecao, ocorrencias: count }))
        .sort((a, b) => b.ocorrencias - a.ocorrencias)
        .slice(0, 10),
      topTopicos: Object.entries(topicosGlobais)
        .map(([topico, count]) => ({ topico, ocorrencias: count }))
        .sort((a, b) => b.ocorrencias - a.ocorrencias)
        .slice(0, 15),
      leadsAtencao
    };
    
  } catch (error) {
    console.error('Erro ao gerar insights do consultor:', error);
    return null;
  }
}

// Funções auxiliares

function calcularSentimentoMedio(mensagens) {
  if (!mensagens || mensagens.length === 0) return 0;
  
  const scores = {
    positivo: 1,
    neutro: 0,
    negativo: -1
  };
  
  const soma = mensagens.reduce((acc, msg) => {
    if (!msg.analise || !msg.analise.sentimento) return acc;
    return acc + (scores[msg.analise.sentimento] || 0);
  }, 0);
  
  return soma / mensagens.length;
}

function classificarTemperatura(temp) {
  if (temp >= 70) return 'quente';
  if (temp >= 40) return 'morno';
  return 'frio';
}

function calcularDiasSemMensagem(ultimaMensagem) {
  if (!ultimaMensagem) return 999;
  const diff = Date.now() - new Date(ultimaMensagem).getTime();
  return Math.floor(diff / (1000 * 60 * 60 * 24));
}

function gerarRecomendacoes(lead, sinaisCompra, objecoes) {
  const recomendacoes = [];
  
  // Baseado em temperatura
  if (lead.temperaturaLead >= 70) {
    recomendacoes.push({
      tipo: 'urgente',
      mensagem: 'Lead quente! Priorize o contato para fechar negócio.',
      icone: '🔥'
    });
  } else if (lead.temperaturaLead < 30) {
    recomendacoes.push({
      tipo: 'atencao',
      mensagem: 'Lead frio. Considere estratégias de reengajamento.',
      icone: '❄️'
    });
  }
  
  // Baseado em sinais de compra
  if (sinaisCompra.pediu_simulacao) {
    recomendacoes.push({
      tipo: 'acao',
      mensagem: 'Cliente pediu simulação. Envie proposta detalhada.',
      icone: '📊'
    });
  }
  
  if (sinaisCompra.quer_agendar) {
    recomendacoes.push({
      tipo: 'acao',
      mensagem: 'Cliente quer agendar. Entre em contato para marcar.',
      icone: '📅'
    });
  }
  
  if (sinaisCompra.perguntou_documentos) {
    recomendacoes.push({
      tipo: 'acao',
      mensagem: 'Cliente perguntou sobre documentos. Envie lista completa.',
      icone: '📄'
    });
  }
  
  // Baseado em objeções
  if (objecoes.preco_alto) {
    recomendacoes.push({
      tipo: 'objecao',
      mensagem: 'Cliente mencionou preço alto. Destaque valor e benefícios.',
      icone: '💰'
    });
  }
  
  if (objecoes.precisa_pensar) {
    recomendacoes.push({
      tipo: 'objecao',
      mensagem: 'Cliente precisa pensar. Envie materiais de apoio à decisão.',
      icone: '🤔'
    });
  }
  
  if (objecoes.nao_tem_dinheiro) {
    recomendacoes.push({
      tipo: 'objecao',
      mensagem: 'Cliente mencionou falta de recursos. Apresente opções de parcelas menores.',
      icone: '💵'
    });
  }
  
  // Baseado em tempo
  const dias = calcularDiasSemMensagem(lead.ultimaMensagem);
  if (dias >= 3 && lead.temperaturaLead >= 50) {
    recomendacoes.push({
      tipo: 'tempo',
      mensagem: `Sem mensagens há ${dias} dias. Considere retomar contato.`,
      icone: '⏰'
    });
  }
  
  if (dias >= 7 && lead.temperaturaLead >= 40) {
    recomendacoes.push({
      tipo: 'urgente',
      mensagem: `Lead sem interação há ${dias} dias. Ação urgente necessária!`,
      icone: '🚨'
    });
  }
  
  return recomendacoes;
}

module.exports = {
  gerarInsightsLead,
  gerarInsightsConsultor
};
