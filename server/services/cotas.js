const { Op } = require('sequelize');
const {
  Cota,
  Consultor,
  Cliente,
  Contemplacao
} = require('../models');

const contemplacaoInclude = {
  model: Contemplacao,
  as: 'contemplacao',
  attributes: ['id', 'dataContemplacao', 'tipo', 'observacao']
};

// 🔹 Criar nova cota
async function criarCota(data) {
  return Cota.create(data);
}

// 🔹 Listar todas as cotas
async function listarCotas(consultorId = null) {
  const where = {};
  if (consultorId) {
    where.consultorId = consultorId;
  }

  return Cota.findAll({
    where,
    include: [
      {
        model: Consultor,
        as: 'consultor',
        attributes: ['id', 'nome']
      },
      contemplacaoInclude
    ]
  });
}

// 🔹 Buscar por clienteId
async function buscarPorCliente(clienteId, consultorId = null) {
  const where = { clienteId };
  if (consultorId) {
    where.consultorId = consultorId;
  }

  return Cota.findAll({
    where,
    include: [
      {
        model: Consultor,
        as: 'consultor',
        attributes: ['id', 'nome']
      },
      contemplacaoInclude
    ]
  });
}

// 🔹 Atualizar cota
async function atualizarCota(id, dadosAtualizados) {
  const cota = await Cota.findByPk(id);
  if (!cota) {
    throw new Error('Cota não encontrada');
  }
  await cota.update(dadosAtualizados);
  return cota;
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

async function obterCotaPorId(id) {
  return Cota.findByPk(id);
}

// 🔹 Buscar por consultorId
async function buscarPorConsultor(consultorId) {
  return Cota.findAll({
    where: { consultorId },
    include: [contemplacaoInclude]
  });
}

// 🔹 Buscar por range de data e (opcionalmente) idagendor
async function buscarPorPeriodo(inicio, fim, idagendor = null, consultorId = null) {
  const where = {
    dtaquisicao: {
      [Op.between]: [new Date(inicio), new Date(fim)]
    }
  };
  if (idagendor) where.idagendor = idagendor;
  if (consultorId) where.consultorId = consultorId;

  return Cota.findAll({
    where,
    include: [contemplacaoInclude]
  });
}

function toInt(value, fallback = null) {
  if (value === undefined || value === null || value === '') return fallback;
  const parsed = Number.parseInt(value, 10);
  return Number.isNaN(parsed) ? fallback : parsed;
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

  if (consultorRestrito) {
    where.consultorId = consultorRestrito;
  }

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

  const dateRange = buildDateRange({ mes, ano });
  if (dateRange) {
    if (dateRange.start && dateRange.end) {
      where.dtaquisicao = {
        [Op.gte]: dateRange.start,
        [Op.lt]: dateRange.end
      };
    }
  }

  const consultorFiltro = consultor && consultor.toString().trim();
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

  includeBase.push({
    model: Consultor,
    as: 'consultor',
    attributes: ['id', 'nome', 'id_agendor'],
    required: Boolean(consultorFiltro),
    ...(consultorFiltro
      ? Number.isInteger(Number(consultorFiltro))
        ? {
            where: {
              id: Number(consultorFiltro)
            }
          }
        : {
            where: {
              nome: {
                [Op.iLike]: `%${consultorFiltro}%`
              }
            }
          }
      : {})
  });

  const contemplacaoRequest = { ...contemplacaoInclude };
  const normalizedTipoContemplacao = (tipoContemplacao || '').toString().toUpperCase();

  if (somenteContempladas === 'true') {
    contemplacaoRequest.required = true;
  }

  if (normalizedTipoContemplacao) {
    const tipoValido = TIPOS_CONTEMPLACAO.includes(normalizedTipoContemplacao);
    if (tipoValido) {
      contemplacaoRequest.required = true;
      contemplacaoRequest.where = {
        tipo: normalizedTipoContemplacao
      };
    }
  }

  includeBase.push(contemplacaoRequest);

  const normalizedOrderBy = String(orderBy || '').toLowerCase();
  const normalizedDirection = String(order || '').toLowerCase() === 'asc' ? 'ASC' : 'DESC';

  const orderMapping = {
    cliente: [{ model: Cliente, as: 'cliente' }, 'nome'],
    consultor: [{ model: Consultor, as: 'consultor' }, 'nome'],
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

  const resultado = await Cota.findAndCountAll({
    where,
    include: includeBase,
    order: orderClauses,
    limit: realLimit ?? undefined,
    offset,
    distinct: true,
    subQuery: false
  });

  const total = resultado.count;
  const totalPaginas = usarTodos ? 1 : Math.max(Math.ceil(total / realLimit), 1);

  const includeTotals = includeBase.map((item) => ({
    ...item,
    attributes: [],
    duplicating: false
  }));

  const somaValor = Number(await Cota.sum('valor', {
    where,
    include: includeTotals
  }) || 0);

  const somaValorTotal = Number(await Cota.sum('valorTotal', {
    where,
    include: includeTotals
  }) || 0);

  return {
    total,
    pagina,
    totalPaginas,
    limite: usarTodos ? total : realLimit,
    registros: resultado.rows,
    totalValor: somaValor,
    totalValorTotal: somaValorTotal
  };
}

const TIPOS_CONTEMPLACAO = ['LANCE_FIXO', 'LANCE_LIVRE', 'SORTEIO'];

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
  obterCotaPorId,
  buscarPorConsultor,
  buscarPorPeriodo,
  buscarCotasComFiltros,
  somarCotasPorPeriodo,
  registrarContemplacao,
  removerContemplacao
};
