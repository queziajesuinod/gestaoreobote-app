# Plano Detalhado de Refatoração - Módulo de Leads IA

## Objetivo

Refatorar o módulo de leads para **focar exclusivamente em importação e análise**, removendo todas as funcionalidades de envio de mensagens e criando um dashboard robusto de insights.

---

## Fase 1: Remoção de Funcionalidades de Envio

### 1.1 Backend - Serviços

**Arquivo:** `server/services/ia.js`

```javascript
// ❌ REMOVER função sugerirResposta
// Linhas 313-367

// ✅ MANTER:
// - analisarMensagem()
// - calcularTemperaturaLead()
// - gerarResumoConversa()
// - extrairDadosLead()
```

**Arquivo:** `server/services/evolutionService.js`

```javascript
// ❌ REMOVER função enviarMensagemTexto
// Linhas 413-439

// ✅ MANTER:
// - testarConexao()
// - buscarContatos()
// - buscarMensagensChat()
// - sincronizarChat()
// - importarHistoricoContato()
// - importarTodosChats()
// - configurarWebhook()
```

### 1.2 Backend - Controllers

**Arquivo:** `server/controllers/leads.js`

```javascript
// ❌ REMOVER endpoint enviarMensagem
// Buscar e remover função completa

// ✅ MANTER:
// - listarLeads()
// - obterLead()
// - criarLead()
// - atualizarLead()
// - sincronizarLead()
// - importarContatos()
```

### 1.3 Backend - Rotas

**Arquivo:** `server/routers/leads.js`

```javascript
// ❌ REMOVER rota:
// router.post('/:leadId/enviar-mensagem', enviarMensagem);
```

### 1.4 Frontend - Componentes

**Arquivo:** `app/containers/Pages/Leads/LeadDetalhes.js`

```javascript
// ❌ REMOVER:
// - Estado 'mensagem'
// - Estado 'enviando'
// - Função handleEnviarMensagem()
// - TextField de mensagem
// - Botão "Enviar Mensagem"

// ✅ ADICIONAR:
// - Botão "Sincronizar Mensagens"
// - Indicador de última sincronização
// - Seção de insights destacados
```

### 1.5 Frontend - API Service

**Arquivo:** `app/services/leadsApi.js`

```javascript
// ❌ REMOVER:
// - evolutionApi.enviarMensagem()

// ✅ ADICIONAR:
// - leadsApi.sincronizar(leadId)
// - leadsApi.obterInsights(leadId)
```

---

## Fase 2: Melhorias na Importação

### 2.1 Sincronização Automática

**Novo arquivo:** `server/services/sincronizacaoService.js`

```javascript
/**
 * Serviço de sincronização automática de leads
 */

const cron = require('node-cron');
const { EvolutionInstance, Lead } = require('../models');
const evolutionService = require('./evolutionService');

/**
 * Sincroniza todos os leads ativos
 */
async function sincronizarTodosLeads() {
  console.log('[SYNC] Iniciando sincronização automática...');
  
  try {
    // Buscar todas as instâncias ativas
    const instancias = await EvolutionInstance.findAll({
      where: { ativo: true }
    });
    
    for (const instancia of instancias) {
      // Buscar leads com sync habilitado
      const leads = await Lead.findAll({
        where: {
          evolutionInstanceId: instancia.id,
          evolutionSyncEnabled: true
        }
      });
      
      console.log(`[SYNC] Sincronizando ${leads.length} leads da instância ${instancia.instanceName}`);
      
      for (const lead of leads) {
        try {
          // Buscar conversa do lead
          const conversa = await Conversa.findOne({
            where: { leadId: lead.id }
          });
          
          if (conversa) {
            await evolutionService.sincronizarChat(
              instancia,
              conversa.chatId,
              lead.id,
              100 // Últimas 100 mensagens
            );
          }
        } catch (error) {
          console.error(`[SYNC] Erro ao sincronizar lead ${lead.id}:`, error.message);
        }
      }
    }
    
    console.log('[SYNC] Sincronização concluída.');
  } catch (error) {
    console.error('[SYNC] Erro na sincronização automática:', error);
  }
}

/**
 * Agenda sincronização automática
 * Executa a cada 15 minutos
 */
function agendarSincronizacao() {
  // Executar a cada 15 minutos
  cron.schedule('*/15 * * * *', () => {
    sincronizarTodosLeads();
  });
  
  console.log('[SYNC] Sincronização automática agendada (a cada 15 minutos)');
}

module.exports = {
  sincronizarTodosLeads,
  agendarSincronizacao
};
```

**Integração no servidor:**

**Arquivo:** `server/index.js`

```javascript
// Adicionar no final do arquivo, após inicialização do servidor

const sincronizacaoService = require('./services/sincronizacaoService');

// Agendar sincronização automática
sincronizacaoService.agendarSincronizacao();

// Executar primeira sincronização após 1 minuto
setTimeout(() => {
  sincronizacaoService.sincronizarTodosLeads();
}, 60000);
```

### 2.2 Melhorias no Controller

**Arquivo:** `server/controllers/leads.js`

```javascript
/**
 * Sincronizar mensagens de um lead específico
 */
async function sincronizarLead(req, res) {
  try {
    const { leadId } = req.params;
    
    const lead = await Lead.findByPk(leadId, {
      include: [
        {
          model: Conversa,
          as: 'conversas'
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
    
    const instancia = await EvolutionInstance.findByPk(lead.evolutionInstanceId);
    if (!instancia) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Instância Evolution não configurada'
      });
    }
    
    const conversa = lead.conversas && lead.conversas[0];
    if (!conversa) {
      return res.status(400).json({
        sucesso: false,
        mensagem: 'Nenhuma conversa encontrada para sincronizar'
      });
    }
    
    // Sincronizar
    const resultado = await evolutionService.sincronizarChat(
      instancia,
      conversa.chatId,
      lead.id,
      200 // Últimas 200 mensagens
    );
    
    if (!resultado.sucesso) {
      return res.status(500).json({
        sucesso: false,
        mensagem: resultado.erro
      });
    }
    
    res.json({
      sucesso: true,
      mensagem: 'Sincronização concluída',
      mensagensNovas: resultado.mensagensNovas,
      temperaturaAtualizada: resultado.temperaturaAtualizada
    });
    
  } catch (error) {
    console.error('Erro ao sincronizar lead:', error);
    res.status(500).json({ sucesso: false, erro: error.message });
  }
}
```

### 2.3 Importação em Lote Melhorada

**Arquivo:** `server/controllers/leads.js`

```javascript
/**
 * Importar múltiplos contatos do Evolution
 */
async function importarContatosLote(req, res) {
  try {
    const { consultorId } = req.params;
    const { evolutionInstanceId, contatosSelecionados } = req.body;
    
    // Validações de acesso...
    
    const instancia = await EvolutionInstance.findByPk(evolutionInstanceId);
    if (!instancia) {
      return res.status(404).json({
        sucesso: false,
        mensagem: 'Instância não encontrada'
      });
    }
    
    const resultados = {
      sucesso: 0,
      falhas: 0,
      detalhes: []
    };
    
    for (const contato of contatosSelecionados) {
      try {
        const resultado = await evolutionService.importarHistoricoContato(
          instancia,
          consultorId,
          contato,
          { limiteMensagens: 1000, criarSeNaoExiste: true }
        );
        
        resultados.sucesso++;
        resultados.detalhes.push({
          contato: contato.name || contato.id,
          status: 'sucesso',
          leadCriado: resultado.leadCriado
        });
      } catch (error) {
        resultados.falhas++;
        resultados.detalhes.push({
          contato: contato.name || contato.id,
          status: 'falha',
          erro: error.message
        });
      }
    }
    
    res.json({
      sucesso: true,
      mensagem: `Importação concluída: ${resultados.sucesso} sucesso, ${resultados.falhas} falhas`,
      resultados
    });
    
  } catch (error) {
    console.error('Erro ao importar contatos:', error);
    res.status(500).json({ sucesso: false, erro: error.message });
  }
}
```

---

## Fase 3: Dashboard de Insights

### 3.1 Novo Serviço de Insights

**Novo arquivo:** `server/services/insightsService.js`

```javascript
const { Lead, Conversa, Mensagem, AnaliseIA, Consultor } = require('../models');
const { Op } = require('sequelize');

/**
 * Gera insights consolidados para um lead específico
 */
async function gerarInsightsLead(leadId) {
  try {
    const lead = await Lead.findByPk(leadId, {
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
    
    if (!lead || !lead.conversas || !lead.conversas[0]) {
      return null;
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
        quentes: ((leadsQuentes / totalLeads) * 100).toFixed(1),
        mornos: ((leadsMornos / totalLeads) * 100).toFixed(1),
        frios: ((leadsFrios / totalLeads) * 100).toFixed(1)
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
  
  // Baseado em tempo
  const dias = calcularDiasSemMensagem(lead.ultimaMensagem);
  if (dias >= 3 && lead.temperaturaLead >= 50) {
    recomendacoes.push({
      tipo: 'tempo',
      mensagem: `Sem mensagens há ${dias} dias. Considere retomar contato.`,
      icone: '⏰'
    });
  }
  
  return recomendacoes;
}

module.exports = {
  gerarInsightsLead,
  gerarInsightsConsultor
};
```

### 3.2 Controller de Insights

**Arquivo:** `server/controllers/leads.js` (adicionar)

```javascript
const insightsService = require('../services/insightsService');

/**
 * Obter insights de um lead específico
 */
async function obterInsightsLead(req, res) {
  try {
    const { leadId } = req.params;
    
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
    
    const insights = await insightsService.gerarInsightsLead(leadId);
    
    if (!insights) {
      return res.status(404).json({
        sucesso: false,
        mensagem: 'Não foi possível gerar insights'
      });
    }
    
    res.json({
      sucesso: true,
      insights
    });
    
  } catch (error) {
    console.error('Erro ao obter insights:', error);
    res.status(500).json({ sucesso: false, erro: error.message });
  }
}

/**
 * Obter insights consolidados do consultor
 */
async function obterInsightsConsultor(req, res) {
  try {
    const { consultorId } = req.params;
    const { temperatura, status } = req.query;
    
    // Controle de acesso
    const isGestor = req.user.perfilId === 1;
    const targetConsultorId = isGestor && consultorId !== 'meu'
      ? parseInt(consultorId)
      : req.user.consultorId;
    
    if (!isGestor && req.user.consultorId !== targetConsultorId) {
      return res.status(403).json({
        sucesso: false,
        mensagem: 'Acesso negado'
      });
    }
    
    const insights = await insightsService.gerarInsightsConsultor(targetConsultorId, {
      temperatura,
      status
    });
    
    if (!insights) {
      return res.status(404).json({
        sucesso: false,
        mensagem: 'Não foi possível gerar insights'
      });
    }
    
    res.json({
      sucesso: true,
      insights
    });
    
  } catch (error) {
    console.error('Erro ao obter insights do consultor:', error);
    res.status(500).json({ sucesso: false, erro: error.message });
  }
}
```

### 3.3 Rotas de Insights

**Arquivo:** `server/routers/leads.js` (adicionar)

```javascript
// Insights
router.get('/:leadId/insights', obterInsightsLead);
router.get('/consultor/:consultorId/insights', obterInsightsConsultor);
```

### 3.4 Frontend - Dashboard de Insights

**Novo arquivo:** `app/containers/Pages/Leads/DashboardInsights.js`

```javascript
import React, { useState, useEffect } from 'react';
import {
  Grid,
  Card,
  CardContent,
  Typography,
  Box,
  Chip,
  LinearProgress,
  List,
  ListItem,
  ListItemText,
  Divider
} from '@mui/material';
import {
  PieChart,
  Pie,
  Cell,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { leadsApi } from '../../../services/leadsApi';

const COLORS = {
  quente: '#f44336',
  morno: '#ff9800',
  frio: '#2196f3'
};

function DashboardInsights({ consultorId }) {
  const [insights, setInsights] = useState(null);
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    carregarInsights();
  }, [consultorId]);
  
  const carregarInsights = async () => {
    setLoading(true);
    try {
      const response = await leadsApi.obterInsightsConsultor(consultorId);
      setInsights(response.insights);
    } catch (error) {
      console.error('Erro ao carregar insights:', error);
    } finally {
      setLoading(false);
    }
  };
  
  if (loading) return <LinearProgress />;
  if (!insights) return <Typography>Sem dados disponíveis</Typography>;
  
  const dadosDistribuicao = [
    { name: 'Quentes', value: insights.distribuicao.quentes, color: COLORS.quente },
    { name: 'Mornos', value: insights.distribuicao.mornos, color: COLORS.morno },
    { name: 'Frios', value: insights.distribuicao.frios, color: COLORS.frio }
  ];
  
  return (
    <Grid container spacing={3}>
      {/* Resumo Geral */}
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Total de Leads</Typography>
            <Typography variant="h3">{insights.totalLeads}</Typography>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Leads Quentes</Typography>
            <Typography variant="h3" color="error">
              {insights.distribuicao.quentes}
            </Typography>
            <Typography variant="caption">
              {insights.percentuais.quentes}% do total
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} md={4}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>Precisam Atenção</Typography>
            <Typography variant="h3" color="warning.main">
              {insights.leadsAtencao.length}
            </Typography>
          </CardContent>
        </Card>
      </Grid>
      
      {/* Gráfico de Distribuição */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Distribuição por Temperatura
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={dadosDistribuicao}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={(entry) => `${entry.name}: ${entry.value}`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {dadosDistribuicao.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>
      
      {/* Top Sinais de Compra */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Top Sinais de Compra
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={insights.topSinaisCompra.slice(0, 5)}>
                <XAxis dataKey="sinal" angle={-45} textAnchor="end" height={100} />
                <YAxis />
                <Tooltip />
                <Bar dataKey="ocorrencias" fill="#4caf50" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </Grid>
      
      {/* Top Objeções */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Top Objeções
            </Typography>
            <List>
              {insights.topObjecoes.slice(0, 5).map((obj, index) => (
                <ListItem key={index}>
                  <ListItemText
                    primary={obj.objecao}
                    secondary={`${obj.ocorrencias} ocorrências`}
                  />
                  <Chip label={obj.ocorrencias} color="error" size="small" />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      </Grid>
      
      {/* Leads que Precisam de Atenção */}
      <Grid item xs={12} md={6}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Leads que Precisam de Atenção
            </Typography>
            <List>
              {insights.leadsAtencao.map((lead, index) => (
                <React.Fragment key={lead.id}>
                  <ListItem>
                    <ListItemText
                      primary={lead.nome}
                      secondary={`${lead.motivo} - ${lead.diasSemMensagem} dias sem mensagem`}
                    />
                    <Chip
                      label={`${lead.temperatura}°`}
                      color={lead.temperatura >= 70 ? 'error' : 'warning'}
                      size="small"
                    />
                  </ListItem>
                  {index < insights.leadsAtencao.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </CardContent>
        </Card>
      </Grid>
      
      {/* Top Tópicos */}
      <Grid item xs={12}>
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Tópicos Mais Discutidos
            </Typography>
            <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
              {insights.topTopicos.map((topico, index) => (
                <Chip
                  key={index}
                  label={`${topico.topico} (${topico.ocorrencias})`}
                  variant="outlined"
                  size="small"
                />
              ))}
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
}

export default DashboardInsights;
```

---

## Fase 4: Testes e Validação

### 4.1 Checklist de Testes

- [ ] Importação manual de lead funciona
- [ ] Importação via Evolution funciona
- [ ] Sincronização manual funciona
- [ ] Sincronização automática funciona (cron)
- [ ] Análise de IA é executada corretamente
- [ ] Temperatura é calculada corretamente
- [ ] Insights de lead são gerados
- [ ] Dashboard de insights do consultor funciona
- [ ] Não há endpoints de envio de mensagens
- [ ] Frontend não exibe opções de envio

### 4.2 Testes de Integração

```bash
# Testar importação
curl -X POST http://localhost:3000/api/leads/importar-contatos \
  -H "Authorization: Bearer TOKEN" \
  -d '{"evolutionInstanceId": "...", "contatosSelecionados": [...]}'

# Testar sincronização
curl -X POST http://localhost:3000/api/leads/LEAD_ID/sincronizar \
  -H "Authorization: Bearer TOKEN"

# Testar insights de lead
curl -X GET http://localhost:3000/api/leads/LEAD_ID/insights \
  -H "Authorization: Bearer TOKEN"

# Testar insights de consultor
curl -X GET http://localhost:3000/api/leads/consultor/CONSULTOR_ID/insights \
  -H "Authorization: Bearer TOKEN"
```

---

## Fase 5: Documentação

### 5.1 Atualizar README

**Arquivo:** `README_LEADS_IA.md`

```markdown
# Módulo de Leads com Análise de IA

## Visão Geral

O módulo de Leads permite importar conversas do WhatsApp via Evolution API e analisar automaticamente a temperatura dos leads usando Inteligência Artificial.

## Funcionalidades

### ✅ Importação
- Importação manual de leads
- Importação automática via Evolution API
- Sincronização de histórico completo de mensagens
- Sincronização automática a cada 15 minutos

### ✅ Análise de IA
- Análise automática de cada mensagem
- Detecção de sinais de compra
- Identificação de objeções
- Análise de sentimento
- Cálculo de temperatura (0-100)
- Geração de resumos inteligentes

### ✅ Dashboard de Insights
- Visão consolidada de todos os leads
- Distribuição por temperatura
- Top sinais de compra
- Top objeções
- Leads que precisam de atenção
- Tópicos mais discutidos

### ❌ Funcionalidades Removidas
- Envio de mensagens (removido intencionalmente)
- Sugestão de respostas (removido intencionalmente)

## Como Usar

### 1. Configurar Evolution API

1. Acesse Configurações > Evolution
2. Configure URL, instância e API Key
3. Teste a conexão

### 2. Importar Leads

**Opção A: Importação Manual**
1. Acesse Leads > Novo Lead
2. Preencha nome e telefone
3. O sistema valida automaticamente no WhatsApp

**Opção B: Importação via Evolution**
1. Acesse Leads > Importar do WhatsApp
2. Selecione os contatos desejados
3. Clique em "Importar Selecionados"

### 3. Visualizar Insights

**Insights de Lead Individual:**
1. Acesse Leads > Lista
2. Clique em um lead
3. Veja temperatura, sinais de compra, objeções e recomendações

**Dashboard Consolidado:**
1. Acesse Leads > Dashboard
2. Veja visão geral de todos os leads
3. Identifique oportunidades e riscos

### 4. Sincronização

**Manual:**
- Clique em "Sincronizar" na página do lead

**Automática:**
- Sincronização a cada 15 minutos (automática)

## Classificação de Temperatura

- **🔥 Quente (70-100):** Alta probabilidade de conversão
- **🌡️ Morno (40-69):** Interesse moderado
- **❄️ Frio (0-39):** Baixo interesse ou inativo

## Sinais de Compra Detectados

- `perguntou_documentos`: Cliente perguntou sobre documentação
- `pediu_simulacao`: Cliente pediu simulação de valores
- `perguntou_pagamento`: Cliente perguntou sobre formas de pagamento
- `quer_agendar`: Cliente quer agendar reunião/visita
- `mencionou_urgencia`: Cliente demonstrou urgência
- `perguntou_prazo`: Cliente perguntou sobre prazos
- `mencionou_decisao`: Cliente mencionou estar decidindo

## Objeções Identificadas

- `preco_alto`: Cliente acha o preço alto
- `demora_contemplacao`: Cliente preocupado com tempo de contemplação
- `precisa_pensar`: Cliente precisa pensar mais
- `vai_consultar_familia`: Cliente vai consultar família
- `nao_tem_dinheiro`: Cliente não tem recursos no momento
- `nao_tem_interesse`: Cliente não demonstrou interesse

## API Endpoints

```
GET    /api/leads/:consultorId              - Listar leads
GET    /api/leads/:leadId/detalhes          - Obter lead
POST   /api/leads/criar                     - Criar lead manual
PUT    /api/leads/:leadId                   - Atualizar lead
POST   /api/leads/:leadId/sincronizar       - Sincronizar mensagens
POST   /api/leads/importar-contatos         - Importar do Evolution
GET    /api/leads/:leadId/insights          - Insights do lead
GET    /api/leads/consultor/:id/insights    - Insights do consultor
```

## Tecnologias

- **Backend:** Node.js, Express, Sequelize
- **IA:** OpenAI GPT-4.1-mini
- **Frontend:** React, Material-UI, Recharts
- **Integração:** Evolution API (WhatsApp)

## Suporte

Para dúvidas ou problemas, entre em contato com a equipe de desenvolvimento.
```

---

## Resumo das Mudanças

### Arquivos Modificados
1. `server/services/ia.js` - Remover `sugerirResposta()`
2. `server/services/evolutionService.js` - Remover `enviarMensagemTexto()`
3. `server/controllers/leads.js` - Remover endpoint de envio, adicionar insights
4. `server/routers/leads.js` - Remover rota de envio, adicionar rotas de insights
5. `app/containers/Pages/Leads/LeadDetalhes.js` - Remover formulário de envio
6. `app/services/leadsApi.js` - Remover função de envio, adicionar insights

### Arquivos Novos
1. `server/services/sincronizacaoService.js` - Sincronização automática
2. `server/services/insightsService.js` - Geração de insights
3. `app/containers/Pages/Leads/DashboardInsights.js` - Dashboard frontend
4. `README_LEADS_IA.md` - Documentação completa

### Dependências Novas
```json
{
  "node-cron": "^3.0.3",
  "recharts": "^2.10.3"
}
```

---

## Cronograma de Implementação

| Fase | Descrição | Tempo Estimado |
|------|-----------|----------------|
| 1 | Remoção de funcionalidades de envio | 2 horas |
| 2 | Melhorias na importação | 3 horas |
| 3 | Dashboard de insights | 5 horas |
| 4 | Testes e validação | 3 horas |
| 5 | Documentação | 2 horas |
| **Total** | | **15 horas** |

---

**Pronto para implementação!** 🚀
