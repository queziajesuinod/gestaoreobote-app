'use strict';

/**
 * Script de sincronização: cria ProcessoCobranca + CobrancaMensal para todas as
 * cotas que ainda não possuem processo cadastrado.
 *
 * Regras:
 *  - Dia de vencimento por administradora: HS=10, YAMAHA=18, Rodobens=19, Servopa=16, demais=10
 *  - Nome do processo: "<nome cliente> - <cota> - <grupo>"
 *  - Cobranças retroativas (pagas): da data de aquisição até dezembro/2025 inclusive
 *  - Cobranças pós-corte (atrasadas/pendentes): de janeiro/2026 (ou mês de aquisição,
 *    se posterior a jan/2026) até o mês atual
 *  - Status: 'pago' para retroativas, 'atrasado' para vencidas, 'pendente' para futuras
 *  - Valor: cota.valor  |  quantidadeMeses: null (não preencher)
 *
 * Uso:
 *   node scripts/sync-processos-cobranca.js
 *   node scripts/sync-processos-cobranca.js --dry-run   (só exibe, não grava)
 */

require('dotenv').config();

const db = require('../server/models');
const { Cota, Cliente, ProcessoCobranca, CobrancaMensal, CotaProcessoCobranca, CotaConsultor } = db;
const { Op } = require('sequelize');

// ─── Configurações ────────────────────────────────────────────────────────────

const DATA_CORTE = { ano: 2025, mes: 12 }; // Último mês "pago" = dezembro/2025

// Ordem importa: a primeira keyword que bater no nome da administradora vence.
const REGRAS_VENCIMENTO = [
  { keyword: 'yamaha',   dia: 18 },
  { keyword: 'rodobens', dia: 19 },
  { keyword: 'servopa',  dia: 16 },
  { keyword: 'hs',       dia: 10 },
];

const IS_DRY_RUN = process.argv.includes('--dry-run');

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getDiaVencimento(administradora) {
  if (!administradora) return 10;
  const adm = administradora.trim().toLowerCase();
  const regra = REGRAS_VENCIMENTO.find(({ keyword }) => adm.includes(keyword));
  return regra ? regra.dia : 10;
}

function formatDate(ano, mes, dia) {
  return `${ano}-${String(mes).padStart(2, '0')}-${String(dia).padStart(2, '0')}`;
}

/** Retorna YYYY-MM-DD da data de hoje no fuso local */
function hojeISO() {
  const d = new Date();
  return formatDate(d.getFullYear(), d.getMonth() + 1, d.getDate());
}

/**
 * Conta os meses de anoInicio/mesInicio até DATA_CORTE (inclusive).
 * Retorna 0 se dtaquisicao for depois do corte.
 */
function calcularMesesRetroativos(dtaquisicao) {
  const d = new Date(dtaquisicao);
  const anoInicio = d.getFullYear();
  const mesInicio = d.getMonth() + 1;

  const total =
    (DATA_CORTE.ano - anoInicio) * 12 + (DATA_CORTE.mes - mesInicio) + 1;

  return Math.max(0, total);
}

/**
 * Primeiro mês "pós-corte" a gerar cobranças (jan/2026 ou mês de aquisição
 * se posterior a jan/2026).
 */
function primeiraMesPosCorte(dtaquisicao) {
  const d = new Date(dtaquisicao);
  const anoAq = d.getFullYear();
  const mesAq = d.getMonth() + 1;

  if (anoAq < 2026) return { ano: 2026, mes: 1 };
  return { ano: anoAq, mes: mesAq };
}

/**
 * Verifica se a cota já possui algum processo de cobrança (legado ou multi-cota).
 */
async function cotaTemProcesso(cotaId) {
  const processoUnico = await ProcessoCobranca.findOne({ where: { cotaId } });
  if (processoUnico) return true;

  const cotaProcesso = await CotaProcessoCobranca.findOne({ where: { cotaId } });
  return !!cotaProcesso;
}

// ─── Lógica principal por cota ────────────────────────────────────────────────

async function processarCota(cota, cliente) {
  const diaVencimento = getDiaVencimento(cota.administradora);
  const nome = `${cliente.nome} - ${cota.cota} - ${cota.grupo}`;
  const valorCota = parseFloat(cota.valor) || 0;

  const dtAquisicao = new Date(cota.dtaquisicao);
  const anoInicio = dtAquisicao.getFullYear();
  const mesInicio = dtAquisicao.getMonth() + 1;

  // ── 1. Processo de cobrança ──────────────────────────────────────────────
  const dataInicioCobranca = formatDate(
    primeiraMesPosCorte(cota.dtaquisicao).ano,
    primeiraMesPosCorte(cota.dtaquisicao).mes,
    1
  );

  if (IS_DRY_RUN) {
    const mesesRetro = calcularMesesRetroativos(cota.dtaquisicao);
    const { ano: anoPosCorte, mes: mesPosCorte } = primeiraMesPosCorte(cota.dtaquisicao);
    const hoje = new Date();
    const mesesPos =
      (hoje.getFullYear() - anoPosCorte) * 12 +
      (hoje.getMonth() + 1 - mesPosCorte) +
      1;
    const totalPos = Math.max(0, mesesPos);

    console.log(
      `  [DRY-RUN] ${nome} | adm=${cota.administradora} | dia=${diaVencimento}` +
      ` | retroativos=${mesesRetro} | pos-corte=${totalPos}`
    );
    return { nome, mesesRetro, totalPos, dry: true };
  }

  const processo = await ProcessoCobranca.create({
    cotaId: cota.id,
    nome,
    tipo: 'unico',
    diaVencimento,
    dataInicioCobranca,
    status: 'ativo',
    quantidadeMeses: null,
  });

  const cobrancas = [];
  const hoje = hojeISO();

  // ── 2. Cobranças retroativas (pagas: dtaquisicao → dez/2025) ────────────
  const mesesRetro = calcularMesesRetroativos(cota.dtaquisicao);

  for (let i = 0; i < mesesRetro; i++) {
    const mesOffset = mesInicio - 1 + i;
    const ano = anoInicio + Math.floor(mesOffset / 12);
    const mes = (mesOffset % 12) + 1;

    const mesReferencia = formatDate(ano, mes, 1);
    const dataVencimento = formatDate(ano, mes, diaVencimento);

    cobrancas.push({
      processoCobrancaId: processo.id,
      mesReferencia,
      valor: valorCota,
      dataVencimento,
      status: 'pago',
      dataPagamento: dataVencimento,
      historicoRetroativo: true,
    });
  }

  // ── 3. Cobranças pós-corte (jan/2026 ou mês de aquisição → mês atual) ──
  const { ano: anoPosCorte, mes: mesPosCorte } = primeiraMesPosCorte(cota.dtaquisicao);
  const hojeDate = new Date();
  const anoAtual = hojeDate.getFullYear();
  const mesAtual = hojeDate.getMonth() + 1;

  const totalMesesPos =
    (anoAtual - anoPosCorte) * 12 + (mesAtual - mesPosCorte) + 1;

  for (let i = 0; i < Math.max(0, totalMesesPos); i++) {
    const mesOffset = mesPosCorte - 1 + i;
    const ano = anoPosCorte + Math.floor(mesOffset / 12);
    const mes = (mesOffset % 12) + 1;

    const mesReferencia = formatDate(ano, mes, 1);
    const dataVencimento = formatDate(ano, mes, diaVencimento);

    // Status: 'atrasado' se vencimento já passou, 'pendente' se ainda não
    const status = dataVencimento < hoje ? 'atrasado' : 'pendente';

    cobrancas.push({
      processoCobrancaId: processo.id,
      mesReferencia,
      valor: valorCota,
      dataVencimento,
      status,
      dataPagamento: null,
      historicoRetroativo: false,
    });
  }

  if (cobrancas.length > 0) {
    await CobrancaMensal.bulkCreate(cobrancas);
  }

  return {
    processoId: processo.id,
    nome,
    mesesRetro,
    mesesPos: Math.max(0, totalMesesPos),
    totalCobrancas: cobrancas.length,
  };
}

// ─── Argumentos de linha de comando ──────────────────────────────────────────
//
//   --bloco=N    Tamanho do bloco (padrão: 20)
//   --limite=N   Máximo de cotas a processar nesta execução (padrão: sem limite)
//   --pausa=N    Pausa em ms entre blocos (padrão: 500)
//   --dry-run    Simula sem gravar nada
//
// Exemplos:
//   node scripts/sync-processos-cobranca.js --bloco=10 --limite=50
//   node scripts/sync-processos-cobranca.js --bloco=5 --limite=5 --dry-run

function getArg(nome, padrao) {
  const arg = process.argv.find((a) => a.startsWith(`--${nome}=`));
  if (!arg) return padrao;
  const valor = Number(arg.split('=')[1]);
  return Number.isFinite(valor) && valor > 0 ? Math.floor(valor) : padrao;
}

const TAMANHO_BLOCO       = getArg('bloco',  20);
const LIMITE_COTAS        = getArg('limite', Infinity);
const PAUSA_ENTRE_BLOCOS_MS = getArg('pausa', 500);

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// ─── Entry point ─────────────────────────────────────────────────────────────

async function processarBloco(cotas, numeroBlocoAtual, totalBlocos, contadores) {
  console.log(`\n┌─ Bloco ${numeroBlocoAtual}/${totalBlocos} (${cotas.length} cota(s)) ${'─'.repeat(30)}`);

  for (const cota of cotas) {
    const label = `Cota ${cota.cota} / Grupo ${cota.grupo} / Adm. ${cota.administradora}`;

    try {
      if (!cota.cliente) {
        console.warn(`│ [IGNORADA] ${label} — sem cliente associado`);
        contadores.ignorados++;
        continue;
      }

      const temProcesso = await cotaTemProcesso(cota.id);
      if (temProcesso) {
        console.log(`│ [IGNORADA] ${label} — já possui processo`);
        contadores.ignorados++;
        continue;
      }

      const resultado = await processarCota(cota, cota.cliente);

      if (!resultado.dry) {
        const pagasStr = resultado.mesesRetro > 0
          ? `${resultado.mesesRetro} paga(s) retroativa(s)`
          : 'sem retroativos';
        const posStr = resultado.mesesPos > 0
          ? `${resultado.mesesPos} pós-corte`
          : 'sem pós-corte';

        console.log(`│ [CRIADO]   ${resultado.nome} | ${pagasStr} + ${posStr} = ${resultado.totalCobrancas} cobrança(s)`);
        contadores.criados++;
      }
    } catch (err) {
      console.error(`│ [ERRO]     ${label} — ${err.message}`);
      contadores.erros++;
    }
  }

  console.log(`└${'─'.repeat(50)}`);
  console.log(`  Acumulado até bloco ${numeroBlocoAtual}: criados=${contadores.criados} | ignorados=${contadores.ignorados} | erros=${contadores.erros}`);
}

async function sincronizar() {
  if (IS_DRY_RUN) {
    console.log('═══════════════════════════════════════════');
    console.log('  MODO DRY-RUN — nenhum dado será gravado  ');
    console.log('═══════════════════════════════════════════\n');
  }

  const limiteStr = Number.isFinite(LIMITE_COTAS) ? `${LIMITE_COTAS} cota(s)` : 'sem limite';
  console.log(`[Sync] Bloco: ${TAMANHO_BLOCO} | Limite: ${limiteStr} | Pausa: ${PAUSA_ENTRE_BLOCOS_MS}ms`);
  console.log('[Sync] Contando cotas...');

  const totalNoBanco = await Cota.count();
  const totalCotas = Number.isFinite(LIMITE_COTAS)
    ? Math.min(LIMITE_COTAS, totalNoBanco)
    : totalNoBanco;
  const totalBlocos = Math.ceil(totalCotas / TAMANHO_BLOCO);

  console.log(`[Sync] ${totalNoBanco} cota(s) no banco → processando ${totalCotas} em ${totalBlocos} bloco(s)\n`);

  const contadores = { criados: 0, ignorados: 0, erros: 0 };

  for (let bloco = 0; bloco < totalBlocos; bloco++) {
    const offset = bloco * TAMANHO_BLOCO;
    // Último bloco pode ser menor que TAMANHO_BLOCO quando há limite definido
    const limitBloco = Math.min(TAMANHO_BLOCO, totalCotas - offset);

    const cotas = await Cota.findAll({
      include: [{ model: Cliente, as: 'cliente' }],
      order: [['administradora', 'ASC'], ['grupo', 'ASC'], ['cota', 'ASC']],
      limit: limitBloco,
      offset,
    });

    await processarBloco(cotas, bloco + 1, totalBlocos, contadores);

    // Pausa entre blocos (exceto após o último)
    if (bloco < totalBlocos - 1) {
      console.log(`  Aguardando ${PAUSA_ENTRE_BLOCOS_MS}ms antes do próximo bloco...`);
      await sleep(PAUSA_ENTRE_BLOCOS_MS);
    }
  }

  console.log('\n═════════════════════════════════════════');
  console.log('  RESUMO FINAL');
  console.log(`  Processos criados : ${contadores.criados}`);
  console.log(`  Cotas ignoradas   : ${contadores.ignorados}`);
  console.log(`  Erros             : ${contadores.erros}`);
  console.log('═════════════════════════════════════════');

  await db.sequelize.close();
}

sincronizar().catch((err) => {
  console.error('[Sync] Erro fatal:', err);
  process.exit(1);
});
