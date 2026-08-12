// server/services/assistente/etapas.js
// Mapa de etapas (dealStage) do assistente e regra de movimentação do negócio.
// Referência: Funil de Vendas (id 716011). dealStage = SEQUÊNCIA (1-based) dentro do funil.

const FUNIL_PADRAO = Number(process.env.ASSISTENTE_FUNIL_ID || 716011);

// Sequências das etapas no Funil de Vendas 716011.
const ETAPA = {
  PROSPECCAO: 1,
  MENSAGEM_LIGACAO: 2,
  NOSHOW: 3,
  REMARKETING: 4,
  VISITA_MARCADA: 5,
  EM_ANALISE: 6,
  QUENTE: 7,
  EXTRAS: 8
};

// Etapa em que um negócio novo nasce.
const ETAPA_INICIAL = ETAPA.PROSPECCAO;

// tipo de interação (enum Agendor) -> etapa alvo. `null` = não mexe na etapa.
// Decisões da usuária: LIGACAO/WHATSAPP/EMAIL->Mensagem/Ligação; VISITA->Visita Marcada;
// PROPOSTA->Quente; REUNIAO->não move (consultor decide manual por enquanto).
const TIPO_PARA_ETAPA = {
  LIGACAO: ETAPA.MENSAGEM_LIGACAO,
  WHATSAPP: ETAPA.MENSAGEM_LIGACAO,
  EMAIL: ETAPA.MENSAGEM_LIGACAO,
  VISITA: ETAPA.VISITA_MARCADA,
  PROPOSTA: ETAPA.QUENTE,
  REUNIAO: null
};

// Retorna a etapa-alvo (sequência) para um tipo de interação, ou null se não move.
// Regra confirmada: a etapa reflete a última interação e PODE retroceder.
function etapaAlvoParaTipo(tipo) {
  if (!tipo) return null;
  const seq = TIPO_PARA_ETAPA[String(tipo).toUpperCase()];
  return seq == null ? null : seq;
}

// Nome legível de uma sequência (para mensagens de confirmação/resumo).
const NOME_POR_SEQ = {
  1: 'Prospecção',
  2: 'Mensagem/Ligação',
  3: 'Noshow',
  4: 'Remarketing',
  5: 'Visita Marcada',
  6: 'Em Análise',
  7: 'Quente',
  8: 'EXTRAS'
};

function nomeEtapa(seq) {
  return NOME_POR_SEQ[seq] || `Etapa ${seq}`;
}

module.exports = {
  FUNIL_PADRAO,
  ETAPA,
  ETAPA_INICIAL,
  TIPO_PARA_ETAPA,
  etapaAlvoParaTipo,
  nomeEtapa
};
