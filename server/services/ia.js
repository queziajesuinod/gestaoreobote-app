const { OpenAI } = require('openai');

// Inicializar cliente OpenAI
const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

const MODEL = process.env.OPENAI_MODEL || 'gpt-4.1-mini';

// Pesos dos sinais de compra
const PESOS_SINAIS_COMPRA = {
  perguntou_documentos: 15,
  pediu_simulacao: 12,
  perguntou_pagamento: 10,
  quer_agendar: 10,
  mencionou_urgencia: 12,
  perguntou_prazo: 8,
  perguntou_valor: 8,
  respondeu_rapido: 5,
  fez_pergunta_especifica: 7,
  mencionou_decisao: 10,
  perguntou_contemplacao: 8
};

// Pesos das objeções
const PESOS_OBJECOES = {
  preco_alto: -10,
  demora_contemplacao: -8,
  duvida_lance: -5,
  precisa_pensar: -7,
  vai_consultar_familia: -6,
  nao_tem_dinheiro: -12,
  prefere_financiamento: -8,
  nao_tem_interesse: -15,
  nao_decidiu: -5
};

// Pesos de sentimento
const PESOS_SENTIMENTO = {
  positivo: 10,
  negativo: -10,
  neutro: 0
};

/**
 * Analisa uma mensagem usando IA
 */
async function analisarMensagem(conteudo, contexto = {}) {
  try {
    const prompt = `
Você é um especialista em análise de conversas de vendas de consórcio.

Analise a seguinte mensagem do cliente e extraia:
1. **Tópicos**: Assuntos mencionados (preco, lance_embutido, contemplacao, prazo, documentos, pagamento, etc)
2. **Objeções**: Preocupações ou resistências do cliente
3. **Sinais de Compra**: Indicações de interesse real em fechar negócio
4. **Sentimento**: Classificação emocional (positivo, neutro, negativo)

Mensagem: "${conteudo}"

Responda APENAS em JSON válido com esta estrutura:
{
  "topicos": ["topico1", "topico2"],
  "objecoes": ["objecao1"],
  "sinaisCompra": ["sinal1"],
  "sentimento": "positivo",
  "confianca": 0.85
}

Possíveis sinais de compra:
- perguntou_documentos
- pediu_simulacao
- perguntou_pagamento
- quer_agendar
- mencionou_urgencia
- perguntou_prazo
- perguntou_valor
- fez_pergunta_especifica
- mencionou_decisao
- perguntou_contemplacao

Possíveis objeções:
- preco_alto
- demora_contemplacao
- duvida_lance
- precisa_pensar
- vai_consultar_familia
- nao_tem_dinheiro
- prefere_financiamento
- nao_tem_interesse
`;

    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: 'Você é um assistente especializado em análise de vendas de consórcio. Responda sempre em JSON válido.'
        },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 300
    });

    const resultado = JSON.parse(response.choices[0].message.content);

    return {
      topicos: resultado.topicos || [],
      objecoes: resultado.objecoes || [],
      sinaisCompra: resultado.sinaisCompra || [],
      sentimento: resultado.sentimento || 'neutro',
      scoreConfianca: resultado.confianca || 0.5,
      respostaCompleta: resultado
    };
  } catch (error) {
    console.error('Erro ao analisar mensagem com IA:', error);
    
    // Fallback: análise básica sem IA
    return {
      topicos: [],
      objecoes: [],
      sinaisCompra: [],
      sentimento: 'neutro',
      scoreConfianca: 0.3,
      respostaCompleta: { erro: error.message }
    };
  }
}

/**
 * Calcula a temperatura do lead baseado nas análises de IA
 */
async function calcularTemperaturaLead(conversaId, instrucoesPersonalizadas = null) {
  const { Conversa, Mensagem, AnaliseIA } = require('../models');

  try {
    // Buscar conversa com mensagens recentes
    const conversa = await Conversa.findByPk(conversaId, {
      include: [
        {
          model: Mensagem,
          as: 'mensagens',
          include: [{ model: AnaliseIA, as: 'analise' }],
          order: [['timestamp', 'DESC']],
          limit: 10 // Últimas 10 mensagens
        }
      ]
    });

    if (!conversa || !conversa.mensagens || conversa.mensagens.length === 0) {
      return 50; // Score neutro se não há dados
    }

    // PASSO 1: Score base
    let score = 50;

    // PASSO 2: Calcular pontos de sinais de compra
    let pontosSinaisCompra = 0;
    conversa.mensagens.forEach(mensagem => {
      if (mensagem.analise && mensagem.analise.sinaisCompra) {
        mensagem.analise.sinaisCompra.forEach(sinal => {
          const peso = PESOS_SINAIS_COMPRA[sinal] || 5; // Peso padrão: 5
          pontosSinaisCompra += peso;
        });
      }
    });
    score += pontosSinaisCompra;

    // PASSO 3: Calcular pontos de objeções
    let pontosObjecoes = 0;
    conversa.mensagens.forEach(mensagem => {
      if (mensagem.analise && mensagem.analise.objecoes) {
        mensagem.analise.objecoes.forEach(objecao => {
          const peso = PESOS_OBJECOES[objecao] || -5; // Peso padrão: -5
          pontosObjecoes += peso;
        });
      }
    });
    score += pontosObjecoes;

    // PASSO 4: Calcular pontos de sentimento (últimas 5 mensagens)
    const ultimasMensagens = conversa.mensagens.slice(0, 5);
    const sentimentosPositivos = ultimasMensagens.filter(
      m => m.analise && m.analise.sentimento === 'positivo'
    ).length;
    const sentimentosNegativos = ultimasMensagens.filter(
      m => m.analise && m.analise.sentimento === 'negativo'
    ).length;

    if (sentimentosPositivos > sentimentosNegativos) {
      score += PESOS_SENTIMENTO.positivo;
    } else if (sentimentosNegativos > sentimentosPositivos) {
      score += PESOS_SENTIMENTO.negativo;
    }

    // PASSO 5: Fator temporal (tempo desde última mensagem)
    const ultimaMensagem = conversa.mensagens[0];
    const horasDesdeUltimaMensagem = 
      (Date.now() - new Date(ultimaMensagem.timestamp)) / (1000 * 60 * 60);

    if (horasDesdeUltimaMensagem < 2) {
      score += 10; // Conversa muito ativa
    } else if (horasDesdeUltimaMensagem < 24) {
      score += 5; // Conversa ativa
    } else if (horasDesdeUltimaMensagem < 48) {
      score += 0; // Normal
    } else if (horasDesdeUltimaMensagem < 72) {
      score -= 10; // Esfriando
    } else {
      score -= 20; // Conversa fria
    }

    // PASSO 6: Detectar spam (mensagens repetitivas)
    const mensagensUnicas = new Set(
      conversa.mensagens.slice(0, 5).map(m => m.conteudo.toLowerCase().trim())
    );
    if (mensagensUnicas.size === 1 && conversa.mensagens.length >= 5) {
      return 0; // Spam detectado
    }

    // PASSO 7: Penalizar conversas muito longas sem sinais de compra
    const totalMensagens = conversa.mensagens.length;
    const totalSinaisCompra = conversa.mensagens.filter(
      m => m.analise && m.analise.sinaisCompra.length > 0
    ).length;

    if (totalMensagens > 20) {
      const taxaSinais = totalSinaisCompra / totalMensagens;
      if (taxaSinais < 0.2) {
        score -= 15; // Penalizar "enrolação"
      }
    }

    // PASSO 8: Boost para leads que voltam após inatividade
    const diasSemMensagem = horasDesdeUltimaMensagem / 24;
    if (diasSemMensagem > 7 && diasSemMensagem < 30) {
      score += 15; // Lead voltou, pode estar decidido
    }

    // PASSO 9: Aplicar ajuste baseado em instruções personalizadas
    if (instrucoesPersonalizadas && instrucoesPersonalizadas.trim().length > 0) {
      console.log(`[IA] Aplicando instruções personalizadas: ${instrucoesPersonalizadas.substring(0, 100)}...`);
      const ajuste = await analisarInstrucoesPersonalizadas(instrucoesPersonalizadas, score);
      console.log(`[IA] Ajuste sugerido pela IA: ${ajuste}`);
      score += ajuste;
    }

    // PASSO 10: Normalizar entre 0 e 100
    score = Math.max(0, Math.min(100, Math.round(score)));

    return score;
  } catch (error) {
    console.error('Erro ao calcular temperatura:', error);
    return 50; // Retornar neutro em caso de erro
  }
}

/**
 * Gera um resumo da conversa usando IA
 */
async function gerarResumoConversa(conversaId) {
  const { Conversa, Mensagem } = require('../models');

  try {
    const conversa = await Conversa.findByPk(conversaId, {
      include: [
        {
          model: Mensagem,
          as: 'mensagens',
          order: [['timestamp', 'ASC']],
          limit: 20
        }
      ]
    });

    if (!conversa || !conversa.mensagens || conversa.mensagens.length === 0) {
      return 'Sem mensagens para resumir.';
    }

    // Montar contexto da conversa
    const contexto = conversa.mensagens
      .map(m => `[${m.remetente}]: ${m.conteudo}`)
      .join('\n');

    const prompt = `
Resuma a seguinte conversa de vendas de consórcio em 2-3 frases, destacando:
- Principal interesse do cliente
- Principais dúvidas ou objeções
- Sentimento geral

Conversa:
${contexto}

Resumo:`;

    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: 'Você é um assistente especializado em resumir conversas de vendas.'
        },
        { role: 'user', content: prompt }
      ],
      temperature: 0.5,
      max_tokens: 150
    });

    return response.choices[0].message.content.trim();
  } catch (error) {
    console.error('Erro ao gerar resumo:', error);
    return 'Erro ao gerar resumo da conversa.';
  }
}

/**
 * Extrai dados estruturados do lead a partir da conversa
 */
async function extrairDadosLead(conversaId) {
  try {
    const { Conversa, Mensagem } = require('../models');

    const conversa = await Conversa.findByPk(conversaId, {
      include: [
        {
          model: Mensagem,
          as: 'mensagens',
          order: [['timestamp', 'ASC']]
        }
      ]
    });

    if (!conversa || !conversa.mensagens || conversa.mensagens.length === 0) {
      return {};
    }

    const contexto = conversa.mensagens
      .map(m => m.conteudo)
      .join('\n');

    const prompt = `
Analise a seguinte conversa e extraia informações estruturadas sobre o cliente:

Conversa:
${contexto}

Extraia (se mencionado):
- Nome completo
- Email
- Cidade
- Estado
- Profissão
- Interesse em (imovel, automovel, servico)
- Valor desejado
- Prazo desejado (em meses)

Responda em JSON:
{
  "nome": "string ou null",
  "email": "string ou null",
  "cidade": "string ou null",
  "estado": "string ou null",
  "profissao": "string ou null",
  "interesseEm": "string ou null",
  "valorDesejado": number ou null,
  "prazoDesejado": number ou null
}
`;

    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: 'Você é um assistente de extração de dados. Responda sempre em JSON válido.'
        },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.2,
      max_tokens: 200
    });

    return JSON.parse(response.choices[0].message.content);
  } catch (error) {
    console.error('Erro ao extrair dados do lead:', error);
    return {};
  }
}

/**
 * Analisa instruções personalizadas e retorna ajuste de temperatura
 */
async function analisarInstrucoesPersonalizadas(instrucoes, scoreAtual) {
  try {
    const prompt = `
Você é um especialista em análise de leads de venda de consórcio.

O lead atualmente tem uma temperatura (score) de ${scoreAtual} pontos (0-100).

O consultor forneceu as seguintes instruções personalizadas sobre este lead:
"${instrucoes}"

Com base nessas instruções, determine um AJUSTE (positivo ou negativo) para a temperatura do lead.

Exemplos:
- "Lead já comprou consórcio antes e teve boa experiência" → ajuste: +15
- "Lead tem urgência familiar não explícita nas mensagens" → ajuste: +10
- "Desconsidere as objeções iniciais, ele já demonstrou interesse real" → ajuste: +12
- "Lead está apenas pesquisando preços, sem intenção real" → ajuste: -20
- "Cliente foi indicado por outro cliente satisfeito" → ajuste: +18
- "Lead tem histórico de não comparecer em reuniões" → ajuste: -15

Responda APENAS em JSON válido com esta estrutura:
{
  "ajuste": -20,
  "justificativa": "Explicação do ajuste"
}

O ajuste deve estar entre -30 e +30.
`;

    const response = await client.chat.completions.create({
      model: MODEL,
      messages: [
        {
          role: 'system',
          content: 'Você é um assistente especializado em análise de leads. Responda sempre em JSON válido.'
        },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 150
    });

    const resultado = JSON.parse(response.choices[0].message.content);
    console.log(`[IA] Justificativa do ajuste: ${resultado.justificativa}`);
    
    // Limitar ajuste entre -30 e +30
    const ajuste = Math.max(-30, Math.min(30, resultado.ajuste || 0));
    return ajuste;
  } catch (error) {
    console.error('Erro ao analisar instruções personalizadas:', error);
    return 0; // Sem ajuste em caso de erro
  }
}

module.exports = {
  analisarMensagem,
  calcularTemperaturaLead,
  gerarResumoConversa,
  extrairDadosLead,
  PESOS_SINAIS_COMPRA,
  PESOS_OBJECOES,
  PESOS_SENTIMENTO
};
