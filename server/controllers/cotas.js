const cotaService = require('../services/cotas');
const ExcelJS = require('exceljs');

const normalizarPerfil = (perfil) => (perfil ? String(perfil).toUpperCase() : '');
const usuarioEhAdminOuRh = (perfil) => {
  const normalizado = normalizarPerfil(perfil);
  return normalizado === 'ADMIN' || normalizado === 'RH' || normalizado === 'MASTER';
};
const usuarioEhGestor = (perfil) => normalizarPerfil(perfil) === 'GESTOR';
const usuarioEhConsultorRestrito = (perfil, consultorId) => Boolean(consultorId)
  && !usuarioEhAdminOuRh(perfil)
  && !usuarioEhGestor(perfil);

function usuarioPodeGerirContemplacao(req) {
  const perfil = normalizarPerfil(req.user?.perfil);
  if (usuarioEhAdminOuRh(perfil)) return true;
  const permissoes = Array.isArray(req.user?.permissoes) ? req.user.permissoes.map(p => p.toUpperCase()) : [];
  if (permissoes.includes('GESTAO') || permissoes.includes('CLIENTES_ALL')) return true;
  return false;
}

// 🔹 Criar nova cota
async function criar(req, res) {
  try {
    const perfil = normalizarPerfil(req.user?.perfil);
    if (!usuarioEhAdminOuRh(perfil)) {
      return res.status(403).json({ message: 'Apenas administradores ou RH podem criar cotas.' });
    }

    const novaCota = await cotaService.criarCota(req.body);
    return res.status(201).json(novaCota);
  } catch (error) {
    console.error('❌ Erro ao criar cota:', error);
    return res.status(500).json({ message: 'Erro ao criar cota', error });
  }
}

// 🔹 Listar todas (com filtros opcionais)
async function listar(req, res) {
  try {
    const perfil = normalizarPerfil(req.user?.perfil);
    const consultorId = req.user?.consultorId ? Number(req.user.consultorId) : null;
    const isConsultor = usuarioEhConsultorRestrito(perfil, consultorId);
    
    // Aplicar filtros se fornecidos
    const { clienteId, grupo, busca, limit } = req.query;
    
    const cotas = await cotaService.listarCotas(
      isConsultor ? consultorId : null,
      { clienteId, grupo, busca, limit }
    );
    
    return res.json(cotas);
  } catch (error) {
    console.error('❌ Erro ao listar cotas:', error);
    return res.status(500).json({ message: 'Erro ao listar cotas', error });
  }
}

async function buscarComFiltros(req, res) {
  try {
    const perfil = normalizarPerfil(req.user?.perfil);
    const consultorId = req.user?.consultorId ? Number(req.user.consultorId) : null;
    const isConsultor = usuarioEhConsultorRestrito(perfil, consultorId);

    const resultado = await cotaService.buscarCotasComFiltros(
      req.query,
      isConsultor ? consultorId : null
    );

    return res.json({
      sucesso: true,
      mensagem: 'Cotas obtidas com sucesso',
      total: resultado.total,
      pagina: resultado.pagina,
      totalPaginas: resultado.totalPaginas,
      limite: resultado.limite,
      somaValor: resultado.totalValor,
      somaValorTotal: resultado.totalValorTotal,
      dados: resultado.registros
    });
  } catch (error) {
    console.error('❌ Erro ao buscar cotas com filtros:', error);
    return res.status(500).json({ sucesso: false, mensagem: 'Erro ao buscar cotas', erro: error.message });
  }
}

async function exportar(req, res) {
  try {
    const perfil = normalizarPerfil(req.user?.perfil);
    const consultorId = req.user?.consultorId ? Number(req.user.consultorId) : null;
    const isConsultor = usuarioEhConsultorRestrito(perfil, consultorId);

    const filtros = {
      ...req.query,
      limit: -1, // sem paginação
      page: 1
    };

    const resultado = await cotaService.buscarCotasComFiltros(
      filtros,
      isConsultor ? consultorId : null
    );

    const registros = resultado.registros || [];

    // 🔹 Cria planilha Excel
    const workbook = new ExcelJS.Workbook();
    const sheet = workbook.addWorksheet('Cotas');

    // Cabeçalho
    sheet.columns = [
      { header: 'Cliente', key: 'cliente', width: 25 },
      { header: 'CPF', key: 'cpf', width: 18 },
      { header: 'Email', key: 'email', width: 25 },
      { header: 'Consultor(es)', key: 'consultores', width: 30 },
      { header: 'ID Agendor(es)', key: 'idagendors', width: 22 },
      { header: 'Grupo', key: 'grupo', width: 12 },
      { header: 'Cota', key: 'cota', width: 12 },
      { header: 'Dígito', key: 'digito', width: 8 },
      { header: 'Administradora', key: 'administradora', width: 25 },
      { header: 'Valor', key: 'valor', width: 15 },
      { header: 'Valor Total', key: 'valorTotal', width: 15 },
      { header: 'Data Aquisição', key: 'dtaquisicao', width: 18 },
      { header: 'Contemplado', key: 'contemplado', width: 15 },
      { header: 'Tipo Contemplação', key: 'tipoContemplacao', width: 18 },
      { header: 'Data Contemplação', key: 'dataContemplacao', width: 18 }
    ];

    // Linhas
    registros.forEach(cota => {
      const consultoresLista = Array.isArray(cota.consultores) ? cota.consultores : [];
      const nomesConsultores = consultoresLista.length
        ? consultoresLista.map(consultor => consultor.nome).filter(Boolean).join(', ')
        : (cota.consultorLegado || '');
      const idagendors = consultoresLista.length
        ? consultoresLista
          .map(consultor => consultor.idagendor)
          .filter(valor => valor && valor.trim())
          .join(', ')
        : (cota.idagendor || '');
      sheet.addRow({
        cliente: cota.cliente?.nome || '',
        cpf: cota.cliente?.cpf || '',
        email: cota.cliente?.email || '',
        consultores: nomesConsultores,
        idagendors,
        grupo: cota.grupo || '',
        cota: cota.cota || '',
        digito: cota.digito || '',
        administradora: cota.administradora || '',
        valor: Number(cota.valor || 0),
        valorTotal: Number(cota.valorTotal || 0),
        dtaquisicao: cota.dtaquisicao
          ? new Date(cota.dtaquisicao).toLocaleDateString('pt-BR')
          : '',
        contemplado: cota.contemplacao ? 'Sim' : 'Não',
        tipoContemplacao: cota.contemplacao?.tipo || '',
        dataContemplacao: cota.contemplacao?.dataContemplacao
          ? new Date(cota.contemplacao.dataContemplacao).toLocaleDateString('pt-BR')
          : ''
      });
    });

    // Formatação
    sheet.getRow(1).font = { bold: true };
    sheet.getRow(1).alignment = { horizontal: 'center' };
    sheet.getColumn('valor').numFmt = 'R$ #,##0.00';
    sheet.getColumn('valorTotal').numFmt = 'R$ #,##0.00';

    // Nome do arquivo
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `cotas-${timestamp}.xlsx`;

    // Envio
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('❌ Erro ao exportar cotas (Excel):', error);
    return res.status(500).json({
      sucesso: false,
      mensagem: 'Erro ao exportar cotas',
      erro: error.message
    });
  }
}


// 🔹 Buscar por cliente
async function buscarPorCliente(req, res) {
  try {
    const perfil = normalizarPerfil(req.user?.perfil);
    const consultorId = req.user?.consultorId ? Number(req.user.consultorId) : null;
    const isConsultor = usuarioEhConsultorRestrito(perfil, consultorId);

    if (perfil === 'CONSULTOR' && !consultorId) {
      return res.json([]);
    }

    const cotas = await cotaService.buscarPorCliente(
      req.params.clienteId,
      isConsultor ? consultorId : null
    );
    return res.json(cotas);
  } catch (error) {
    return res.status(500).json({ message: 'Erro ao buscar cotas por cliente', error });
  }
}

// 🔹 Atualizar cota
async function atualizar(req, res) {
  try {
    const perfil = normalizarPerfil(req.user?.perfil);
    if (!usuarioEhAdminOuRh(perfil)) {
      return res.status(403).json({ message: 'Apenas administradores ou RH podem atualizar cotas.' });
    }

    const { id } = req.params;
    const cotaAtualizada = await cotaService.atualizarCota(id, req.body);
    return res.json({ mensagem: 'Cota atualizada com sucesso', dados: cotaAtualizada });
  } catch (error) {
    console.error('❌ Erro ao atualizar cota:', error);
    return res.status(500).json({ message: 'Erro ao atualizar cota', error: error.message });
  }
}

async function mover(req, res) {
  try {
    const perfil = normalizarPerfil(req.user?.perfil);
    if (!usuarioEhAdminOuRh(perfil)) {
      return res.status(403).json({ message: 'Apenas administradores ou RH podem mover cotas.' });
    }

    const { id } = req.params;
    const { clienteDestinoId } = req.body || {};

    if (!clienteDestinoId) {
      return res.status(400).json({ message: 'Cliente destino é obrigatório.' });
    }

    const cotaMovida = await cotaService.moverCota(id, clienteDestinoId);
    return res.json({ mensagem: 'Cota movida com sucesso', dados: cotaMovida });
  } catch (error) {
    console.error('❌ Erro ao mover cota:', error);
    return res.status(500).json({ message: 'Erro ao mover cota', error: error.message });
  }
}

// 🔹 Deletar cota
async function deletar(req, res) {
  try {
    const perfil = normalizarPerfil(req.user?.perfil);
    if (!usuarioEhAdminOuRh(perfil)) {
      return res.status(403).json({ message: 'Apenas administradores ou RH podem remover cotas.' });
    }

    const { id } = req.params;
    const resultado = await cotaService.deletarCota(id);
    return res.json({ mensagem: resultado.mensagem });
  } catch (error) {
    console.error('❌ Erro ao deletar cota:', error);
    return res.status(500).json({ message: 'Erro ao deletar cota', error: error.message });
  }
}

async function deletarPorCliente(req, res) {
  try {
    const perfil = normalizarPerfil(req.user?.perfil);
    if (!usuarioEhAdminOuRh(perfil)) {
      return res.status(403).json({ sucesso: false, mensagem: 'Apenas administradores ou RH podem remover cotas.' });
    }

    const { clienteId } = req.params;
    const resultado = await cotaService.deletarCotasPorCliente(clienteId);
    return res.status(200).json({ sucesso: true, ...resultado });
  } catch (error) {
    console.error('❌ Erro ao deletar cotas do cliente:', error);
    const status = error.status || 500;
    return res.status(status).json({ sucesso: false, mensagem: error.message });
  }
}

// 🔹 Buscar por consultor
async function buscarPorConsultor(req, res) {
  try {
    const perfil = normalizarPerfil(req.user?.perfil);
    const consultorId = req.user?.consultorId ? Number(req.user.consultorId) : null;
    const isConsultor = usuarioEhConsultorRestrito(perfil, consultorId);
    const parametroId = Number(req.params.consultorId);

    if (isConsultor) {
      if (!consultorId || consultorId !== parametroId) {
        return res.status(403).json({ message: 'Acesso negado.' });
      }
    }

    const cotas = await cotaService.buscarPorConsultor(parametroId);
    return res.json(cotas);
  } catch (error) {
    return res.status(500).json({ message: 'Erro ao buscar cotas por consultor', error });
  }
}

// 🔹 Buscar por período e idagendor
async function buscarPorPeriodo(req, res) {
  try {
    const { inicio, fim, idagendor } = req.query;
    if (!inicio || !fim) {
      return res.status(400).json({ message: 'Parâmetros "inicio" e "fim" são obrigatórios' });
    }

    const perfil = normalizarPerfil(req.user?.perfil);
    const consultorId = req.user?.consultorId ? Number(req.user.consultorId) : null;
    const isConsultor = usuarioEhConsultorRestrito(perfil, consultorId);

    const cotas = await cotaService.buscarPorPeriodo(
      inicio,
      fim,
      idagendor,
      isConsultor ? consultorId : null
    );
    return res.json({ dados: cotas });
  } catch (error) {
    console.error('❌ Erro ao buscar cotas por período:', error);
    return res.status(500).json({ message: 'Erro ao buscar cotas por período', error });
  }
}

async function totalPorPeriodo(req, res) {
  try {
    const { dataInicio, dataFim } = req.query;
    if (!dataInicio || !dataFim) {
      return res.status(400).json({ sucesso: false, mensagem: 'Parâmetros "dataInicio" e "dataFim" são obrigatórios.' });
    }

    const totais = await cotaService.somarCotasPorPeriodo(dataInicio, dataFim);
    return res.status(200).json({
      sucesso: true,
      dados: totais
    });
  } catch (error) {
    console.error('❌ Erro ao somar cotas por período:', error);
    return res.status(400).json({ sucesso: false, mensagem: error.message });
  }
}

async function registrarContemplacao(req, res) {
  try {
    if (!usuarioPodeGerirContemplacao(req)) {
      return res.status(403).json({ sucesso: false, mensagem: 'Você não tem permissão para contemplar cotas.' });
    }
    const { id } = req.params;
    const resultado = await cotaService.registrarContemplacao(id, req.body);
    return res.status(200).json({ sucesso: true, mensagem: 'Cota marcada como contemplada.', dados: resultado });
  } catch (error) {
    console.error('❌ Erro ao registrar contemplação:', error);
    return res.status(400).json({ sucesso: false, mensagem: error.message });
  }
}

async function removerContemplacao(req, res) {
  try {
    if (!usuarioPodeGerirContemplacao(req)) {
      return res.status(403).json({ sucesso: false, mensagem: 'Você não tem permissão para remover contemplações.' });
    }
    const { id } = req.params;
    const resultado = await cotaService.removerContemplacao(id);
    return res.status(200).json({ sucesso: true, mensagem: resultado.mensagem });
  } catch (error) {
    console.error('❌ Erro ao remover contemplação:', error);
    return res.status(400).json({ sucesso: false, mensagem: error.message });
  }
}

async function cancelar(req, res) {
  try {
    const perfil = normalizarPerfil(req.user?.perfil);
    if (!usuarioEhAdminOuRh(perfil)) {
      return res.status(403).json({ sucesso: false, mensagem: 'Apenas administradores ou RH podem cancelar cotas.' });
    }

    const { id } = req.params;
    const { dataCancelamento } = req.body;
    const data = dataCancelamento || new Date().toISOString().slice(0, 10);

    const { Cota } = require('../models');
    const cota = await Cota.findByPk(id);
    if (!cota) {
      return res.status(404).json({ sucesso: false, mensagem: 'Cota não encontrada.' });
    }

    await cota.update({ status: 'cancelado', dataCancelamento: data });
    return res.status(200).json({ sucesso: true, mensagem: 'Cota cancelada com sucesso.', dados: cota });
  } catch (error) {
    console.error('❌ Erro ao cancelar cota:', error);
    return res.status(500).json({ sucesso: false, mensagem: 'Erro ao cancelar cota.', erro: error.message });
  }
}

async function cancelarEmLote(req, res) {
  try {
    const perfil = normalizarPerfil(req.user?.perfil);
    if (!usuarioEhAdminOuRh(perfil)) {
      return res.status(403).json({ sucesso: false, mensagem: 'Apenas administradores ou RH podem cancelar cotas.' });
    }

    const { ids, dataCancelamento } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ sucesso: false, mensagem: 'Informe ao menos uma cota (ids).' });
    }

    const data = dataCancelamento || new Date().toISOString().slice(0, 10);
    const { Cota } = require('../models');
    const resultados = { sucesso: [], falha: [] };

    for (const id of ids) {
      try {
        const cota = await Cota.findByPk(id);
        if (!cota) throw new Error('Cota não encontrada');
        await cota.update({ status: 'cancelado', dataCancelamento: data });
        resultados.sucesso.push(id);
      } catch (err) {
        resultados.falha.push({ id, motivo: err.message });
      }
    }

    return res.status(200).json({
      sucesso: true,
      mensagem: `${resultados.sucesso.length} cota(s) cancelada(s)`,
      dados: resultados
    });
  } catch (error) {
    console.error('❌ Erro ao cancelar cotas em lote:', error);
    return res.status(500).json({ sucesso: false, mensagem: 'Erro ao cancelar cotas em lote.' });
  }
}

async function reativarCota(req, res) {
  try {
    const perfil = normalizarPerfil(req.user?.perfil);
    if (!usuarioEhAdminOuRh(perfil)) {
      return res.status(403).json({ sucesso: false, mensagem: 'Apenas administradores ou RH podem reativar cotas.' });
    }

    const { id } = req.params;
    const { Cota } = require('../models');
    const cota = await Cota.findByPk(id);
    if (!cota) {
      return res.status(404).json({ sucesso: false, mensagem: 'Cota não encontrada.' });
    }

    await cota.update({ status: 'ativo', dataCancelamento: null });
    return res.status(200).json({ sucesso: true, mensagem: 'Cota reativada com sucesso.', dados: cota });
  } catch (error) {
    console.error('❌ Erro ao reativar cota:', error);
    return res.status(500).json({ sucesso: false, mensagem: 'Erro ao reativar cota.' });
  }
}

module.exports = {
  criar,
  listar,
  buscarPorCliente,
  atualizar,
  deletar,
  deletarPorCliente,
  buscarPorConsultor,
  buscarPorPeriodo,
  buscarComFiltros,
  totalPorPeriodo,
  exportar,
  registrarContemplacao,
  removerContemplacao,
  mover,
  cancelar,
  cancelarEmLote,
  reativarCota
};
