// server/services/assistenteIA.js
// Cérebro do assistente "Alô Reobote": entende a mensagem em português e devolve
// dados estruturados pra direcionar o Agendor.
//
// AGNÓSTICO DE PROVEDOR: fala com qualquer API no formato OpenAI-compatible
// (Groq, Google Gemini via camada OpenAI, OpenRouter, Ollama local, OpenAI...).
// Basta configurar via .env — nada de SDK, só axios (já é dependência).
//
//   IA_BASE_URL  -> ex Groq:   https://api.groq.com/openai/v1
//                   ex Gemini: https://generativelanguage.googleapis.com/v1beta/openai
//   IA_API_KEY   -> chave do provedor escolhido
//   IA_MODEL     -> ex Groq:   llama-3.3-70b-versatile
//                   ex Gemini: gemini-2.0-flash
//
// (Retrocompat: se IA_* não estiver setado, cai para OPENAI_* se existir.)

const axios = require('axios');

const IA_BASE_URL = (process.env.IA_BASE_URL || process.env.OPENAI_BASE_URL || 'https://api.groq.com/openai/v1').replace(/\/$/, '');
const IA_API_KEY = process.env.IA_API_KEY || process.env.OPENAI_API_KEY || null;
const IA_MODEL = process.env.IA_MODEL || process.env.OPENAI_MODEL || 'llama-3.3-70b-versatile';
const IA_TIMEOUT_MS = Number(process.env.IA_TIMEOUT_MS || 30000);

// Tipos de tarefa aceitos pelo Agendor (enum fechado).
const TIPOS = ['VISITA', 'REUNIAO', 'LIGACAO', 'EMAIL', 'WHATSAPP', 'PROPOSTA'];

// Gatilho: mensagem que "acorda" o assistente. Aceita variações e acentos.
// Ex: "alo reobote", "alô, reobote", "ALO REOBOTE".
const REGEX_GATILHO = /\ba?l[ôo]\s*,?\s*re[oó]bote\b/i;

function detectarGatilho(texto = '') {
  if (!texto) return false;
  const limpo = texto.normalize('NFD').replace(/[̀-ͯ]/g, '');
  return REGEX_GATILHO.test(texto) || /\balo\s*,?\s*reobote\b/i.test(limpo);
}

// Remove o gatilho do começo do texto pra sobrar só o relato.
function removerGatilho(texto = '') {
  return texto
    .replace(REGEX_GATILHO, '')
    .replace(/^[\s,.:;!?¡¿-]+/, '')
    .trim();
}

const SYSTEM_PROMPT = `Você é um assistente que lê relatos informais de consultores de consórcio (em português do Brasil, muitas vezes com erros de digitação, gírias ou transcrição de áudio) e extrai dados estruturados para um CRM.

Sua saída DEVE ser um único objeto JSON válido, sem texto antes ou depois, com EXATAMENTE este formato:
{
  "cliente_nome": string | null,        // nome do cliente citado no relato
  "interacao_realizada": {              // o que o consultor JÁ FEZ (ação concluída). null se não houver.
     "tipo": "VISITA"|"REUNIAO"|"LIGACAO"|"EMAIL"|"WHATSAPP"|"PROPOSTA"|null,
     "resumo": string | null,           // o que aconteceu, em 1-3 frases objetivas
     "data": string | null              // ISO 8601 se citada/dedutível, senão null
  } | null,
  "proxima_acao": {                     // o que ficou AGENDADO para o futuro. null se não houver.
     "tipo": "VISITA"|"REUNIAO"|"LIGACAO"|"EMAIL"|"WHATSAPP"|"PROPOSTA"|null,
     "descricao": string | null,
     "data": string | null              // ISO 8601 da data/hora agendada
  } | null,
  "confianca": number                   // 0 a 1, quão confiante você está na extração
}

Regras de mapeamento de tipo (o CRM só aceita esses 6):
- "visita", "fui ver", "estive com" presencial -> VISITA
- "liguei", "chamei", "telefonei" -> LIGACAO
- "mandei zap", "whatsapp", "mensagem" -> WHATSAPP
- "e-mail", "mandei email" -> EMAIL
- "reunião", "call", "vídeo chamada", "videochamada", "ligação de vídeo", "meet", "google meet" -> REUNIAO
- "proposta", "enviei proposta", "apresentei proposta" -> PROPOSTA

Regras de data: converta expressões relativas ("amanhã às 10h", "sexta que vem", "dia 15") em data/hora usando a DATA ATUAL informada. Use o formato "YYYY-MM-DDTHH:mm:ss" SEM fuso horário (sem "Z" e sem "-04:00") — representando o horário LOCAL do Brasil EXATAMENTE como a pessoa falou. NUNCA converta para UTC (se falou 10h, escreva T10:00:00, não T14:00:00). Se não houver hora, use 09:00. Se não der para deduzir a data, use null.
Não invente cliente nem dados. Se algo não estiver no relato, use null.`;

// Extrai a intenção do relato. `agora` = Date atual (injetável para testes).
async function extrairIntencao(texto, { agora = new Date() } = {}) {
  if (!IA_API_KEY) {
    throw new Error('IA não configurada: defina IA_API_KEY (e IA_BASE_URL/IA_MODEL) no .env.');
  }
  const relato = removerGatilho(texto || '');
  if (!relato) {
    return { cliente_nome: null, interacao_realizada: null, proxima_acao: null, confianca: 0 };
  }

  // data/hora atual no fuso do Brasil (wall-clock), pra "hoje/amanhã" saírem certos
  const TZ = process.env.ASSISTENTE_TZ || 'America/Campo_Grande';
  let agoraBR;
  try {
    agoraBR = agora.toLocaleString('sv-SE', { timeZone: TZ }); // ex: "2026-08-12 15:30:00"
  } catch (_) {
    agoraBR = agora.toISOString().slice(0, 19).replace('T', ' ');
  }
  const userPrompt = `Data e hora atuais no Brasil: ${agoraBR} (horário local; NÃO use UTC).\n\nRelato do consultor:\n"""${relato}"""\n\nResponda apenas com o JSON.`;

  const { data } = await axios.post(
    `${IA_BASE_URL}/chat/completions`,
    {
      model: IA_MODEL,
      temperature: 0,
      response_format: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userPrompt }
      ]
    },
    {
      headers: { Authorization: `Bearer ${IA_API_KEY}`, 'Content-Type': 'application/json' },
      timeout: IA_TIMEOUT_MS
    }
  );

  const conteudo = data?.choices?.[0]?.message?.content || '';
  const parsed = parseJsonSeguro(conteudo);
  return normalizarSaida(parsed);
}

// Extrai o primeiro bloco JSON válido, mesmo se o modelo enfeitar com texto/markdown.
function parseJsonSeguro(txt) {
  if (!txt) return {};
  try {
    return JSON.parse(txt);
  } catch (_) {
    const inicio = txt.indexOf('{');
    const fim = txt.lastIndexOf('}');
    if (inicio >= 0 && fim > inicio) {
      try {
        return JSON.parse(txt.slice(inicio, fim + 1));
      } catch (_) { /* cai no fallback */ }
    }
    return {};
  }
}

// Rede de segurança: aceita o enum exato OU frases naturais comuns, mapeando pro enum.
function tipoValido(tipo) {
  if (!tipo) return null;
  const t = String(tipo).normalize('NFD').replace(/[̀-ͯ]/g, '').toUpperCase().trim();
  if (TIPOS.includes(t)) return t;
  if (/\b(VIDEO|VIDEOCHAMADA|CALL|MEET|REUNIAO|REUNIÃO)\b/.test(t)) return 'REUNIAO';
  if (/\b(ZAP|WHATS|WPP)\b/.test(t)) return 'WHATSAPP';
  if (/\b(LIGA|TELEFON|CHAMEI)\b/.test(t)) return 'LIGACAO';
  if (/\b(VISIT)\b/.test(t)) return 'VISITA';
  if (/\b(PROPOST)\b/.test(t)) return 'PROPOSTA';
  if (/\b(EMAIL|E-MAIL)\b/.test(t)) return 'EMAIL';
  return null;
}

function normalizarBloco(bloco) {
  if (!bloco || typeof bloco !== 'object') return null;
  const tipo = tipoValido(bloco.tipo);
  const resumo = bloco.resumo || bloco.descricao || null;
  const data = bloco.data || null;
  if (!tipo && !resumo && !data) return null;
  return { tipo, resumo, descricao: bloco.descricao || bloco.resumo || null, data };
}

function normalizarSaida(p) {
  return {
    cliente_nome: (p && typeof p.cliente_nome === 'string' && p.cliente_nome.trim()) ? p.cliente_nome.trim() : null,
    interacao_realizada: normalizarBloco(p && p.interacao_realizada),
    proxima_acao: normalizarBloco(p && p.proxima_acao),
    confianca: typeof (p && p.confianca) === 'number' ? Math.max(0, Math.min(1, p.confianca)) : 0.5
  };
}

module.exports = {
  detectarGatilho,
  removerGatilho,
  extrairIntencao,
  TIPOS,
  // exports internos p/ teste
  _parseJsonSeguro: parseJsonSeguro,
  _normalizarSaida: normalizarSaida
};
