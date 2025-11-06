const cotaService = require('../services/cotas');
const ExcelJS = require('exceljs');

// 🔹 Criar nova cota
async function criar(req, res) {
  try {
    const perfil = req.user?.perfil ? req.user.perfil.toUpperCase() : '';
    if (perfil !== 'ADMIN') {
      return res.status(403).json({ message: 'Apenas administradores podem criar cotas.' });
    }

    const novaCota = await cotaService.criarCota(req.body);
    return res.status(201).json(novaCota);
  } catch (error) {
    console.error('❌ Erro ao criar cota:', error);
    return res.status(500).json({ message: 'Erro ao criar cota', error });
  }
}

// 🔹 Listar todas
async function listar(req, res) {
  try {
    const perfil = req.user?.perfil ? req.user.perfil.toUpperCase() : '';
    const consultorId = req.user?.consultorId ? Number(req.user.consultorId) : null;
    const isConsultor = Boolean(consultorId) && perfil !== 'ADMIN' && perfil !== 'GESTOR';
    const cotas = await cotaService.listarCotas(isConsultor ? consultorId : null);
    return res.json(cotas);
  } catch (error) {
    return res.status(500).json({ message: 'Erro ao listar cotas', error });
  }
}

async function buscarComFiltros(req, res) {
  try {
    const perfil = req.user?.perfil ? req.user.perfil.toUpperCase() : '';
    const consultorId = req.user?.consultorId ? Number(req.user.consultorId) : null;
    const isConsultor = Boolean(consultorId) && perfil !== 'ADMIN' && perfil !== 'GESTOR';

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
    const perfil = req.user?.perfil ? req.user.perfil.toUpperCase() : '';
    const consultorId = req.user?.consultorId ? Number(req.user.consultorId) : null;
    const isConsultor = Boolean(consultorId) && perfil !== 'ADMIN' && perfil !== 'GESTOR';

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
      { header: 'Consultor', key: 'consultor', width: 25 },
      { header: 'Grupo', key: 'grupo', width: 12 },
      { header: 'Cota', key: 'cota', width: 12 },
      { header: 'Administradora', key: 'administradora', width: 25 },
      { header: 'Valor', key: 'valor', width: 15 },
      { header: 'Valor Total', key: 'valorTotal', width: 15 },
      { header: 'Data Aquisição', key: 'dtaquisicao', width: 18 }
    ];

    // Linhas
    registros.forEach(cota => {
      sheet.addRow({
        cliente: cota.cliente?.nome || '',
        cpf: cota.cliente?.cpf || '',
        email: cota.cliente?.email || '',
        consultor: cota.consultor?.nome || '',
        grupo: cota.grupo || '',
        cota: cota.cota || '',
        administradora: cota.administradora || '',
        valor: Number(cota.valor || 0),
        valorTotal: Number(cota.valorTotal || 0),
        dtaquisicao: cota.dtaquisicao
          ? new Date(cota.dtaquisicao).toLocaleDateString('pt-BR')
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
    const perfil = req.user?.perfil ? req.user.perfil.toUpperCase() : '';
    const consultorId = req.user?.consultorId ? Number(req.user.consultorId) : null;
    const isConsultor = Boolean(consultorId) && perfil !== 'ADMIN' && perfil !== 'GESTOR';

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
    const perfil = req.user?.perfil ? req.user.perfil.toUpperCase() : '';
    if (perfil !== 'ADMIN') {
      return res.status(403).json({ message: 'Apenas administradores podem atualizar cotas.' });
    }

    const { id } = req.params;
    const cotaAtualizada = await cotaService.atualizarCota(id, req.body);
    return res.json({ mensagem: 'Cota atualizada com sucesso', dados: cotaAtualizada });
  } catch (error) {
    console.error('❌ Erro ao atualizar cota:', error);
    return res.status(500).json({ message: 'Erro ao atualizar cota', error: error.message });
  }
}

// 🔹 Deletar cota
async function deletar(req, res) {
  try {
    const perfil = req.user?.perfil ? req.user.perfil.toUpperCase() : '';
    if (perfil !== 'ADMIN') {
      return res.status(403).json({ message: 'Apenas administradores podem remover cotas.' });
    }

    const { id } = req.params;
    const resultado = await cotaService.deletarCota(id);
    return res.json({ mensagem: resultado.mensagem });
  } catch (error) {
    console.error('❌ Erro ao deletar cota:', error);
    return res.status(500).json({ message: 'Erro ao deletar cota', error: error.message });
  }
}

// 🔹 Buscar por consultor
async function buscarPorConsultor(req, res) {
  try {
    const perfil = req.user?.perfil ? req.user.perfil.toUpperCase() : '';
    const consultorId = req.user?.consultorId ? Number(req.user.consultorId) : null;
    const isConsultor = Boolean(consultorId) && perfil !== 'ADMIN' && perfil !== 'GESTOR';
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

    const perfil = req.user?.perfil ? req.user.perfil.toUpperCase() : '';
    const consultorId = req.user?.consultorId ? Number(req.user.consultorId) : null;
    const isConsultor = Boolean(consultorId) && perfil !== 'ADMIN';

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

module.exports = {
  criar,
  listar,
  buscarPorCliente,
  atualizar,
  deletar,
  buscarPorConsultor,
  buscarPorPeriodo,
  buscarComFiltros,
  exportar
};
