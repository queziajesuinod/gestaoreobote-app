const { Op } = require('sequelize');
const {
  Cota,
  Consultor,
  Cliente,
  Contemplacao,
  CotaConsultor
} = require('../models');

const TIPOS_CONTEMPLACAO = ['LANCE_FIXO', 'LANCE_LIVRE', 'SORTEIO'];

const contemplacaoInclude = {
  model: Contemplacao,
  as: 'contemplacao',
  attributes: ['id', 'dataContemplacao', 'tipo', 'observacao']
};

const CONSULTOR_ATTRIBUTES = ['id', 'nome', 'id_agendor', 'ativo'];

const consultorSingularInclude = {
  model: Consultor,
  as: 'consultor',
  attributes: CONSULTOR_ATTRIBUTES
};

const buildConsultoresInclude = (overrides = {}) => {
  const { throughWhere, ...rest } = overrides;
  return {
    model: Consultor,
    as: 'consultores',
    attributes: CONSULTOR_ATTRIBUTES,
    through: {
      attributes: ['idagendor'],
      ...(throughWhere ? { where: throughWhere } : {})
    },
    required: false,
    ...rest
  };
};

function normalizeConsultorAssociacoes(value, fallbackIdagendor = null) {
  const lista = normalizeToArray(value);
  const resultado = [];
  lista.forEach((item) => {
    if (item === null || item === undefined) return;
    if (typeof item === 'object' && !Array.isArray(item)) {
      const consultorId = toInt(item.consultorId ?? item.id);
      if (consultorId === null) return;
      const idagendor = Object.prototype.hasOwnProperty.call(item, 'idagendor')
        ? (item.idagendor === null || item.idagendor === undefined ? null : String(item.idagendor).trim())
        : (fallbackIdagendor !== null && fallbackIdagendor !== undefined ? String(fallbackIdagendor).trim() : null);
      resultado.push({ consultorId, idagendor: idagendor || null });
      return;
    }
    const consultorId = toInt(item);
    if (consultorId === null) return;
    const idagendor = fallbackIdagendor !== null && fallbackIdagendor !== undefined
      ? String(fallbackIdagendor).trim()
      : null;
    resultado.push({ consultorId, idagendor: idagendor || null });
  });

  const mapa = new Map();
  resultado.forEach((item) => {
    mapa.set(item.consultorId, item);
  });
  return Array.from(mapa.values());
}

function extrairConsultoresDoPayload(payload = {}, { considerarConsultorId = false } = {}) {
  if (!payload || typeof payload !== 'object') {
    return null;
  }

  const fallbackIdagendor = Object.prototype.hasOwnProperty.call(payload, 'idagendor')
    ? (payload.idagendor === null || payload.idagendor === undefined ? null : payload.idagendor)
    : null;

  const fontes = [
    payload.consultoresDetalhes,
    payload.consultores,
    payload.consultorAssociacoes,
    payload.consultorIds,
    considerarConsultorId ? payload.consultorId : null
  ];

  for (let i = 0; i < fontes.length; i += 1) {
    const fonte = fontes[i];
    if (fonte === null || fonte === undefined || (Array.isArray(fonte) && fonte.length === 0)) {
      continue;
    }
    const normalizados = normalizeConsultorAssociacoes(fonte, fallbackIdagendor);
    if (normalizados.length) {
      return normalizados;
    }
  }

  return null;
}

async function sincronizarConsultoresDaCota(cota, consultoresAssociados = null) {
  const associados = normalizeConsultorAssociacoes(
    consultoresAssociados ?? [],
    cota.idagendor ?? null
  );
  const ids = associados.map(item => item.consultorId);

  if (typeof cota.setConsultores === 'function') {
    await cota.setConsultores(ids);
  }

  await Promise.all(
    associados.map(({ consultorId, idagendor }) =>
      CotaConsultor.update(
        { idagendor: idagendor || null },
        { where: { cotaId: cota.id, consultorId } }
      )
    )
  );

  const primeiroConsultor = ids[0] ?? null;
  const primeiroIdagendor = associados[0]?.idagendor ?? null;
  const precisaAtualizar = cota.consultorId !== primeiroConsultor || cota.idagendor !== primeiroIdagendor;
  if (precisaAtualizar) {
    await cota.update({
      consultorId: primeiroConsultor,
      idagendor: primeiroIdagendor || null
    });
  }

  return associados;
}

function formatarCotaParaResposta(instancia) {
  if (!instancia) return null;
  const plain = instancia.toJSON ? instancia.toJSON() : instancia;
  const consultores = Array.isArray(plain.consultores) ? plain.consultores : [];
  const quantidadeConsultores = consultores.length;
  const valorLiquido = Number(plain.valor ?? 0);
  const valorDistribuido = quantidadeConsultores > 0
    ? valorLiquido / quantidadeConsultores
    : (valorLiquido || 0);

  const consultoresEnriquecidos = consultores.map((consultor) => {
    const idagendor = consultor?.CotaConsultor?.idagendor ?? consultor?.idagendor ?? null;
    return {
      ...consultor,
      idagendor: idagendor || null,
      valorRecebido: quantidadeConsultores > 0 ? valorDistribuido : valorLiquido || 0
    };
  });

  return {
    ...plain,
    quantidadeConsultores,
    valorDistribuidoPorConsultor: valorDistribuido,
    consultores: consultoresEnriquecidos,
    idagendors: consultoresEnriquecidos
      .map(consultor => consultor.idagendor)
      .filter((valor, index, array) => Boolean(valor) && array.indexOf(valor) === index)
  };
}

function mapearCotasParaResposta(lista) {
  return (lista || []).map(item => formatarCotaParaResposta(item)).filter(Boolean);
}

// 🔹 Criar nova cota
async function criarCota(data = {}) {
  const payload = { ...data };
  const consultoresAssociados = extrairConsultoresDoPayload(payload, { considerarConsultorId: true }) || [];
  delete payload.consultorIds;
  delete payload.consultores;
  delete payload.consultoresDetalhes;
  delete payload.consultorAssociacoes;

  payload.consultorId = consultoresAssociados[0]?.consultorId ?? null;
  if (consultoresAssociados[0]?.idagendor !== undefined) {
    payload.idagendor = consultoresAssociados[0]?.idagendor || null;
  }

  const novaCota = await Cota.create(payload);
  await sincronizarConsultoresDaCota(novaCota, consultoresAssociados);
  return obterCotaPorId(novaCota.id);
}

// 🔹 Listar todas as cotas
async function listarCotas(consultorId = null) {
  const consultoresInclude = buildConsultoresInclude(
    consultorId
      ? { required: true, where: { id: consultorId } }
      : {}
  );

  const registros = await Cota.findAll({
    include: [
      consultoresInclude,
      consultorSingularInclude,
      {
        model: Cliente,
        as: 'cliente',
        attributes: ['id', 'nome']
      },
      contemplacaoInclude
    ],
    distinct: true
  });

  return mapearCotasParaResposta(registros);
}

// 🔹 Buscar por clienteId
async function buscarPorCliente(clienteId, consultorId = null) {
  const consultoresInclude = buildConsultoresInclude(
    consultorId
      ? { required: true, where: { id: consultorId } }
      : {}
  );

  const registros = await Cota.findAll({
    where: { clienteId },
    include: [
      consultoresInclude,
      consultorSingularInclude,
      {
        model: Cliente,
        as: 'cliente',
        attributes: ['id', 'nome']
      },
      contemplacaoInclude
    ],
    order: [['dtaquisicao', 'DESC']],
    distinct: true
  });

  return mapearCotasParaResposta(registros);
}

// 🔹 Atualizar cota
async function atualizarCota(id, dadosAtualizados = {}) {
  const cota = await Cota.findByPk(id);
  if (!cota) {
    throw new Error('Cota não encontrada');
  }

  const payload = { ...dadosAtualizados };
  const consultoresAssociados = extrairConsultoresDoPayload(payload, { considerarConsultorId: true });
  delete payload.consultorIds;
  delete payload.consultores;
  delete payload.consultoresDetalhes;
  delete payload.consultorAssociacoes;

  if (consultoresAssociados !== null) {
    payload.consultorId = consultoresAssociados[0]?.consultorId ?? null;
    if (consultoresAssociados[0]?.idagendor !== undefined) {
      payload.idagendor = consultoresAssociados[0]?.idagendor || null;
    }
  }

  await cota.update(payload);

  if (consultoresAssociados !== null) {
    await sincronizarConsultoresDaCota(cota, consultoresAssociados);
  }

  return obterCotaPorId(id);
}

async function moverCota(id, novoClienteId) {
  if (!novoClienteId) {
    throw new Error('Cliente destino é obrigatório.');
  }

  const cota = await Cota.findByPk(id);
  if (!cota) {
    throw new Error('Cota não encontrada');
  }

  const clienteDestino = await Cliente.findByPk(novoClienteId);
  if (!clienteDestino) {
    throw new Error('Cliente destino não encontrado');
  }

  await cota.update({ clienteId: novoClienteId });
  return obterCotaPorId(id);
}

// 🔹 Deletar cota
async function deletarCota(id) {
  const cota = await Cota.findByPk(id);
  if (!cota) {
    throw new Error('Cota não encontrada');
  }
  await cota.destroy();
  return { mensagem: 'Cota removida com sucesso' };
}

async function deletarCotasPorCliente(clienteId) {
  if (!clienteId) {
    const erro = new Error('Cliente inválido.');
    erro.status = 400;
    throw erro;
  }

  const cliente = await Cliente.findByPk(clienteId);
  if (!cliente) {
    const erro = new Error('Cliente não encontrado.');
    erro.status = 404;
    throw erro;
  }

  const totalRemover = await Cota.count({ where: { clienteId } });
  if (totalRemover === 0) {
    return { mensagem: 'Nenhuma cota encontrada para este cliente.', totalRemovidas: 0 };
  }

  await Cota.destroy({ where: { clienteId } });

  return {
    mensagem: totalRemover === 1
      ? '1 cota removida com sucesso.'
      : `${totalRemover} cotas removidas com sucesso.`,
    totalRemovidas: totalRemover
  };
}

async function obterCotaPorId(id) {
  const cota = await Cota.findByPk(id, {
    include: [
      buildConsultoresInclude(),
      {
        model: Cliente,
        as: 'cliente',
        attributes: ['id', 'nome', 'cpf', 'email']
      },
      contemplacaoInclude
    ]
  });
  return formatarCotaParaResposta(cota);
}

// 🔹 Buscar por consultorId
async function buscarPorConsultor(consultorId) {
  if (!consultorId) {
    return [];
  }
  const registros = await Cota.findAll({
    include: [
      buildConsultoresInclude({ required: true, where: { id: consultorId } }),
      consultorSingularInclude,
      {
        model: Cliente,
        as: 'cliente',
        attributes: ['id', 'nome']
      },
      contemplacaoInclude
    ],
    distinct: true
  });
  return mapearCotasParaResposta(registros);
}

// 🔹 Buscar por range de data e (opcionalmente) idagendor
async function buscarPorPeriodo(inicio, fim, idagendor = null, consultorId = null) {
  const where = {
    dtaquisicao: {
      [Op.between]: [new Date(inicio), new Date(fim)]
    }
  };

  const consultoresInclude = buildConsultoresInclude(
    consultorId
      ? { required: true, where: { id: consultorId } }
      : {}
  );

  if (idagendor) {
    consultoresInclude.required = true;
    consultoresInclude.through = consultoresInclude.through || {};
    consultoresInclude.through.where = {
      ...(consultoresInclude.through.where || {}),
      idagendor
    };
  }

  const registros = await Cota.findAll({
    where,
    include: [
      consultoresInclude,
      consultorSingularInclude,
      {
        model: Cliente,
        as: 'cliente',
        attributes: ['id', 'nome']
      },
      contemplacaoInclude
    ],
    distinct: true
  });

  return mapearCotasParaResposta(registros);
}

function toInt(value, fallback = null) {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
}

function normalizeToArray(value) {
  if (Array.isArray(value)) {
    return value;
  }
  if (value === null || value === undefined || value === '') {
    return [];
  }
  return [value];
}

function sanitizeStringArray(value) {
  return normalizeToArray(value)
    .map(item => (item !== null && item !== undefined ? String(item).trim() : ''))
    .filter(Boolean);
}

function sanitizeNumberArray(value, { min = null, max = null } = {}) {
  return normalizeToArray(value)
    .map(item => toInt(item))
    .filter(num => num !== null)
    .filter((num) => {
      if (min !== null && num < min) return false;
      if (max !== null && num > max) return false;
      return true;
    });
}

function buildDateRange({ mes, ano }) {
  const month = toInt(mes);
  const year = toInt(ano);

  if (!month && !year) {
    return { start: null, end: null };
  }

  const targetYear = year || new Date().getFullYear();

  let start;
  let end;

  if (month) {
    const normalizedMonth = Math.min(Math.max(month, 1), 12);
    start = new Date(Date.UTC(targetYear, normalizedMonth - 1, 1, 0, 0, 0));
    end = new Date(Date.UTC(targetYear, normalizedMonth, 1, 0, 0, 0));
  } else {
    start = new Date(Date.UTC(targetYear, 0, 1, 0, 0, 0));
    end = new Date(Date.UTC(targetYear + 1, 0, 1, 0, 0, 0));
  }

  return { start, end };
}

function buildDateConditions(mesesSelecionados = [], anosSelecionados = []) {
  const uniqueMeses = [...new Set(mesesSelecionados)].filter(mes => mes >= 1 && mes <= 12);
  const uniqueAnos = [...new Set(anosSelecionados)];
  const conditions = [];

  const addCondition = ({ mes, ano }) => {
    const range = buildDateRange({ mes, ano });
    if (range && range.start && range.end) {
      conditions.push({
        dtaquisicao: {
          [Op.gte]: range.start,
          [Op.lt]: range.end
        }
      });
    }
  };

  if (uniqueMeses.length && uniqueAnos.length) {
    uniqueAnos.forEach((ano) => {
      uniqueMeses.forEach((mes) => {
        addCondition({ mes, ano });
      });
    });
    return conditions;
  }

  if (uniqueMeses.length) {
    const currentYear = new Date().getFullYear();
    uniqueMeses.forEach((mes) => addCondition({ mes, ano: currentYear }));
    return conditions;
  }

  if (uniqueAnos.length) {
    uniqueAnos.forEach((ano) => addCondition({ ano }));
  }

  return conditions;
}

async function buscarCotasComFiltros({
  page = 1,
  limit = 10,
  cliente,
  consultor,
  mes,
  ano,
  administradora,
  grupo,
  cota,
  tipoContemplacao,
  somenteContempladas,
  orderBy = 'dtaquisicao',
  order = 'desc'
} = {}, consultorRestrito = null) {
  const pagina = Math.max(Number.parseInt(page, 10) || 1, 1);
  const tamanho = Number.parseInt(limit, 10);
  const usarTodos = tamanho === -1;
  const realLimit = usarTodos ? null : Math.max(tamanho || 10, 1);
  const offset = usarTodos ? undefined : (pagina - 1) * realLimit;

  const where = {};

  if (administradora) {
    where.administradora = {
      [Op.iLike]: `%${administradora.trim()}%`
    };
  }

  if (grupo) {
    where.grupo = { [Op.iLike]: `%${grupo.trim()}%` };
  }

  if (cota) {
    where.cota = { [Op.iLike]: `%${cota.trim()}%` };
  }

  const mesesSelecionados = sanitizeNumberArray(mes, { min: 1, max: 12 });
  const anosSelecionados = sanitizeNumberArray(ano, { min: 1900 });
  const intervalosDatas = buildDateConditions(mesesSelecionados, anosSelecionados);
  if (intervalosDatas.length === 1) {
    where.dtaquisicao = intervalosDatas[0].dtaquisicao;
  } else if (intervalosDatas.length > 1) {
    where[Op.or] = where[Op.or] || [];
    intervalosDatas.forEach((condicao) => {
      where[Op.or].push(condicao);
    });
  }

  const consultorFiltroLista = sanitizeStringArray(consultor);
  const consultorIds = [
    ...new Set(
      consultorFiltroLista
        .map((item) => toInt(item))
        .filter(id => id !== null)
    )
  ];
  const consultorIdsSet = new Set(consultorIds);
  const consultorFiltroTexto = consultorFiltroLista.filter(item => !consultorIdsSet.has(toInt(item)));

  const includeBase = [{
    model: Cliente,
    as: 'cliente',
    attributes: ['id', 'nome', 'cpf', 'email'],
    required: Boolean(cliente),
    ...(cliente
      ? {
        where: {
          nome: {
            [Op.iLike]: `%${cliente.trim()}%`
          }
        }
      }
      : {})
  }];

  const consultorInclude = buildConsultoresInclude();
  let consultorWhere = null;

  if (consultorIds.length) {
    consultorWhere = {
      id: {
        [Op.in]: consultorIds
      }
    };
  } else if (consultorFiltroTexto.length) {
    consultorWhere = {
      [Op.or]: consultorFiltroTexto.map((termo) => ({
        nome: {
          [Op.iLike]: `%${termo}%`
        }
      }))
    };
  }

  if (consultorRestrito) {
    const restricao = { id: consultorRestrito };
    consultorWhere = consultorWhere
      ? { [Op.and]: [consultorWhere, restricao] }
      : restricao;
  }

  if (consultorWhere) {
    consultorInclude.where = consultorWhere;
    consultorInclude.required = true;
  } else if (consultorRestrito) {
    consultorInclude.where = { id: consultorRestrito };
    consultorInclude.required = true;
  }

  includeBase.push(consultorInclude);
  includeBase.push({ ...consultorSingularInclude });

  const contemplacaoRequest = { ...contemplacaoInclude };
  const tiposFiltro = sanitizeStringArray(tipoContemplacao)
    .map(tipo => tipo.toUpperCase())
    .map((tipo) => (tipo === 'LANCE' ? 'LANCE_LIVRE' : tipo))
    .filter(tipo => TIPOS_CONTEMPLACAO.includes(tipo));

  if (somenteContempladas === 'true') {
    contemplacaoRequest.required = true;
  }

  if (tiposFiltro.length) {
    contemplacaoRequest.required = true;
    contemplacaoRequest.where = {
      tipo: tiposFiltro.length === 1 ? tiposFiltro[0] : { [Op.in]: tiposFiltro }
    };
  }

  includeBase.push(contemplacaoRequest);

  const normalizedOrderBy = String(orderBy || '').toLowerCase();
  const normalizedDirection = String(order || '').toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  const orderMapping = {
    cliente: [{ model: Cliente, as: 'cliente' }, 'nome'],
    consultor: [{ model: Consultor, as: 'consultores' }, 'nome'],
    grupo: ['grupo'],
    cota: ['cota'],
    administradora: ['administradora'],
    valor: ['valor'],
    valortotal: ['valorTotal'],
    dtaquisicao: ['dtaquisicao']
  };

  const orderClauses = [];
  const mappedPath = orderMapping[normalizedOrderBy];
  if (mappedPath) {
    orderClauses.push([...mappedPath, normalizedDirection]);
  }
  if (normalizedOrderBy !== 'dtaquisicao') {
    orderClauses.push(['dtaquisicao', 'DESC']);
  }

  const consultaPrincipal = await Cota.findAll({
    where,
    include: includeBase,
    order: orderClauses,
    limit: realLimit ?? undefined,
    offset,
    distinct: true,
    subQuery: false
  });

  const includeCount = includeBase.map((item) => {
    const clone = {
      ...item,
      attributes: [],
      duplicating: false
    };
    if (item.through) {
      clone.through = {
        ...item.through,
        attributes: []
      };
    }
    return clone;
  });

  const total = await Cota.count({
    where,
    include: includeCount,
    distinct: true
  });
  const totalPaginas = usarTodos ? 1 : Math.max(Math.ceil(total / realLimit), 1);

  const includeTotals = includeBase.map((item) => {
    const clone = {
      ...item,
      attributes: [],
      duplicating: false
    };
    if (item.through) {
      clone.through = {
        ...item.through,
        attributes: []
      };
    }
    return clone;
  });

  const somaResultados = await Cota.findAll({
    attributes: [
      [Cota.sequelize.fn('SUM', Cota.sequelize.col('Cota.valor')), 'somaValor'],
      [Cota.sequelize.fn('SUM', Cota.sequelize.col('Cota.valorTotal')), 'somaValorTotal']
    ],
    where,
    include: includeTotals,
    raw: true
  });

  const somaValor = Number(somaResultados[0]?.somaValor || 0);
  const somaValorTotal = Number(somaResultados[0]?.somaValorTotal || 0);

  return {
    total,
    pagina,
    totalPaginas,
    limite: usarTodos ? total : realLimit,
    registros: mapearCotasParaResposta(consultaPrincipal),
    totalValor: somaValor,
    totalValorTotal: somaValorTotal
  };
}

function normalizarTipoContemplacao(tipo) {
  const normalized = (tipo || '').toString().toUpperCase();
  if (normalized === 'LANCE') {
    return 'LANCE_LIVRE';
  }
  if (!TIPOS_CONTEMPLACAO.includes(normalized)) {
    throw new Error('Tipo de contemplação inválido. Utilize "LANCE_FIXO", "LANCE_LIVRE" ou "SORTEIO".');
  }
  return normalized;
}

async function registrarContemplacao(cotaId, dados) {
  const cota = await Cota.findByPk(cotaId);
  if (!cota) {
    throw new Error('Cota não encontrada.');
  }

  const dataContemplacao = dados?.dataContemplacao;
  if (!dataContemplacao) {
    throw new Error('Data de contemplação é obrigatória.');
  }

  const tipo = normalizarTipoContemplacao(dados?.tipo);
  const observacao = dados?.observacao ? dados.observacao.toString().trim() : null;

  const valores = {
    cotaId,
    dataContemplacao,
    tipo,
    observacao
  };

  const existente = await Contemplacao.findOne({ where: { cotaId } });
  if (existente) {
    await existente.update(valores);
    return existente;
  }

  return Contemplacao.create(valores);
}

async function removerContemplacao(cotaId) {
  const existente = await Contemplacao.findOne({ where: { cotaId } });
  if (!existente) {
    throw new Error('Contemplação não encontrada para esta cota.');
  }
  await existente.destroy();
  return { mensagem: 'Contemplação removida com sucesso.' };
}

async function somarCotasPorPeriodo(dataInicio, dataFim) {
  if (!dataInicio || !dataFim) {
    throw new Error('Parâmetros dataInicio e dataFim são obrigatórios.');
  }

  const parse = (valor) => {
    const partes = valor.split('-').map(Number);
    if (partes.length < 3 || partes.some(Number.isNaN)) {
      throw new Error('Datas inválidas.');
    }
    const [ano, mes, dia] = partes;
    return { ano, mes, dia };
  };

  const inicioParts = parse(dataInicio);
  const fimParts = parse(dataFim);

  const inicio = new Date(Date.UTC(inicioParts.ano, inicioParts.mes - 1, inicioParts.dia, 0, 0, 0, 0));
  const fimExclusive = new Date(Date.UTC(fimParts.ano, fimParts.mes - 1, fimParts.dia + 1, 0, 0, 0, 0));

  const where = {
    dtaquisicao: {
      [Op.gte]: inicio,
      [Op.lt]: fimExclusive
    },
    consultorId: {
      [Op.ne]: 2
    }

  };

  const [valor, valorTotal] = await Promise.all([
    Cota.sum('valor', { where }),
    Cota.sum('valorTotal', { where })
  ]);

  return {
    valor: Number(valor || 0),
    valorTotal: Number(valorTotal || 0)
  };
}

module.exports = {
  criarCota,
  listarCotas,
  buscarPorCliente,
  atualizarCota,
  deletarCota,
  deletarCotasPorCliente,
  obterCotaPorId,
  buscarPorConsultor,
  buscarPorPeriodo,
  buscarCotasComFiltros,
  somarCotasPorPeriodo,
  registrarContemplacao,
  removerContemplacao,
  moverCota
};
