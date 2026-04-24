const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const { Op, fn, col, literal } = require('sequelize');
const {
  ProcessoCobranca,
  CobrancaMensal
} = require('../models');

const formatarValor = (valor) => `R$ ${valor.toFixed(2)}`;

/**
 * Service para geracao de relatórios em PDF e Excel
 */
class RelatoriosService {
  async gerarRelatorioPDF(processoId) {
    const processo = await ProcessoCobranca.findByPk(processoId, {
      include: [
        {
          association: 'cota',
          include: [
            { association: 'cliente' },
            { association: 'consultor' }
          ]
        },
        {
          association: 'cobrancas',
          include: [
            {
              association: 'notificacoes',
              order: [['createdAt', 'DESC']]
            }
          ],
          order: [['mesReferencia', 'DESC']]
        }
      ]
    });

    if (!processo) {
      throw new Error('Processo não encontrado');
    }

    const valorMensal = parseFloat(processo.cota?.valor) || 0;
    const cobrancas = processo.cobrancas || [];
    const totalCobrancas = cobrancas.length;
    const cobrancasPagas = cobrancas.filter(c => c.status === 'pago').length;
    const cobrancasAtrasadas = cobrancas.filter(c => c.status === 'atrasado').length;
    const cobrancasPendentes = cobrancas.filter(c => c.status === 'pendente').length;
    const valorTotal = totalCobrancas * valorMensal;
    const valorPago = cobrancasPagas * valorMensal;
    const valorPendente = (cobrancasPendentes + cobrancasAtrasadas) * valorMensal;

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const chunks = [];

        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        doc.fontSize(20).text('Relatorio de Processo de Cobranca', { align: 'center' });
        doc.moveDown();

        doc.fontSize(14).text('Informacoes do Processo', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10);
        doc.text(`ID do Processo: ${processo.id}`);
        doc.text(`Status: ${processo.status.toUpperCase()}`);
        doc.text(`Valor Mensal: R$ ${valorMensal.toFixed(2)}`);
        doc.text(`Dia de Vencimento: ${processo.diaVencimento}`);
        doc.text(`Data de Inicio: ${new Date(processo.dataInicioCobranca).toLocaleDateString('pt-BR')}`);
        doc.moveDown();

        doc.fontSize(14).text('Informacoes da Cota', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10);
        doc.text(`Numero da Cota: ${processo.cota?.cota || '-'}`);
        doc.text(`Grupo: ${processo.cota?.grupo || 'N/A'}`);
        doc.moveDown();

        doc.fontSize(14).text('Informacoes do Cliente', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10);
        doc.text(`Nome: ${processo.cota?.cliente?.nome || '-'}`);
        doc.text(`Telefone: ${processo.cota?.cliente?.telefone || 'N/A'}`);
        doc.text(`Email: ${processo.cota?.cliente?.email || 'N/A'}`);
        doc.moveDown();

        if (processo.cota?.consultor) {
          doc.fontSize(14).text('Informacoes do Consultor', { underline: true });
          doc.moveDown(0.5);
          doc.fontSize(10);
          doc.text(`Nome: ${processo.cota.consultor.nome}`);
          doc.text(`Telefone: ${processo.cota.consultor.telefone || 'N/A'}`);
          doc.moveDown();
        }

        doc.fontSize(14).text('Estatisticas', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10);
        doc.text(`Total de Cobrancas: ${totalCobrancas}`);
        doc.text(`Cobrancas Pagas: ${cobrancasPagas}`);
        doc.text(`Cobrancas Atrasadas: ${cobrancasAtrasadas}`);
        doc.text(`Cobrancas Pendentes: ${cobrancasPendentes}`);
        doc.text(`Valor Total: R$ ${valorTotal.toFixed(2)}`);
        doc.text(`Valor Pago: R$ ${valorPago.toFixed(2)}`);
        doc.text(`Valor Pendente: R$ ${valorPendente.toFixed(2)}`);
        doc.moveDown();

        doc.addPage();
        doc.fontSize(14).text('Historico de Cobrancas', { underline: true });
        doc.moveDown();

        cobrancas.forEach((cobranca, index) => {
          if (index > 0 && index % 10 === 0) {
            doc.addPage();
          }

          doc.fontSize(10);
          doc.text(`Mes: ${new Date(cobranca.mesReferencia).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`);
          doc.text(`Vencimento: ${new Date(cobranca.dataVencimento).toLocaleDateString('pt-BR')}`);
          doc.text(`Valor: R$ ${parseFloat(cobranca.valor).toFixed(2)}`);
          doc.text(`Status: ${cobranca.status.toUpperCase()}`);

          if (cobranca.dataPagamento) {
            doc.text(`Pago em: ${new Date(cobranca.dataPagamento).toLocaleDateString('pt-BR')}`);
          }

          if (cobranca.notificacoes?.length > 0) {
            doc.text(`Notificacoes: ${cobranca.notificacoes.length}`);
          }

          doc.moveDown(0.5);
        });

        const pages = doc.bufferedPageRange();
        for (let i = 0; i < pages.count; i++) {
          doc.switchToPage(i);
          doc.fontSize(8);
          doc.text(
            `Pagina ${i + 1} de ${pages.count} - Gerado em ${new Date().toLocaleString('pt-BR')}`,
            50,
            doc.page.height - 50,
            { align: 'center' }
          );
        }

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  async gerarRelatorioInadimplenciaPDF(filtros = {}) {
    const whereClause = { status: 'atrasado' };
    if (filtros.dataInicio && filtros.dataFim) {
      whereClause.dataVencimento = {
        [Op.between]: [filtros.dataInicio, filtros.dataFim]
      };
    }

    const cobrancasAtrasadas = await CobrancaMensal.findAll({
      where: whereClause,
      include: [
        {
          association: 'processoCobranca',
          include: [
            {
              association: 'cota',
              include: [
                { association: 'cliente' },
                { association: 'consultor' }
              ]
            }
          ]
        }
      ],
      order: [['dataVencimento', 'ASC']],
      limit: 2000
    });

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const chunks = [];

        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        doc.fontSize(20).text('Relatorio de Inadimplencia', { align: 'center' });
        doc.moveDown();
        doc.fontSize(10).text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, { align: 'center' });
        doc.moveDown(2);

        const totalCobrancas = cobrancasAtrasadas.length;
        const valorTotal = cobrancasAtrasadas.reduce((sum, c) => sum + parseFloat(c.valor), 0);

        doc.fontSize(14).text('Resumo', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10);
        doc.text(`Total de Cobrancas Atrasadas: ${totalCobrancas}`);
        doc.text(`Valor Total em Atraso: R$ ${valorTotal.toFixed(2)}`);
        doc.moveDown();

        doc.fontSize(14).text('Cobranças atrasadas', { underline: true });
        doc.moveDown();

        cobrancasAtrasadas.forEach((cobranca, index) => {
          if (index > 0 && index % 8 === 0) {
            doc.addPage();
          }

          const diasAtraso = Math.floor((new Date() - new Date(cobranca.dataVencimento)) / (1000 * 60 * 60 * 24));
          doc.fontSize(10);
          doc.text(`Cliente: ${cobranca.processoCobranca?.cota?.cliente?.nome || '-'}`);
          doc.text(`Cota: ${cobranca.processoCobranca?.cota?.cota || '-'}`);
          doc.text(`Mes: ${new Date(cobranca.mesReferencia).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`);
          doc.text(`Vencimento: ${new Date(cobranca.dataVencimento).toLocaleDateString('pt-BR')}`);
          doc.text(`Dias em Atraso: ${diasAtraso}`);
          doc.text(`Valor: R$ ${parseFloat(cobranca.valor).toFixed(2)}`);

          if (cobranca.processoCobranca?.cota?.consultor) {
            doc.text(`Consultor: ${cobranca.processoCobranca.cota.consultor.nome}`);
          }

          doc.moveDown(0.5);
        });

        const pages = doc.bufferedPageRange();
        for (let i = 0; i < pages.count; i++) {
          doc.switchToPage(i);
          doc.fontSize(8);
          doc.text(`Pagina ${i + 1} de ${pages.count}`, 50, doc.page.height - 50, { align: 'center' });
        }

        doc.end();
      } catch (error) {
        reject(error);
      }
    });
  }

  async exportarProcessosExcel(filtros = {}) {
    const whereClause = {};
    if (filtros.status) {
      whereClause.status = filtros.status;
    }

    const processos = await ProcessoCobranca.findAll({
      where: whereClause,
      include: [
        {
          association: 'cota',
          include: [
            { association: 'cliente' },
            { association: 'consultor' }
          ]
        }
      ],
      order: [['createdAt', 'DESC']],
      limit: 5000
    });

    const cobrancaCounts = await CobrancaMensal.findAll({
      attributes: [
        'processoCobrancaId',
        [fn('COUNT', col('id')), 'total'],
        [fn('SUM', literal("CASE WHEN status = 'pago' THEN 1 ELSE 0 END")), 'pagas'],
        [fn('SUM', literal("CASE WHEN status = 'atrasado' THEN 1 ELSE 0 END")), 'atrasadas']
      ],
      group: ['processoCobrancaId'],
      raw: true
    });
    const countsMap = {};
    cobrancaCounts.forEach(c => { countsMap[c.processoCobrancaId] = c; });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Processos de Cobranca');

    worksheet.columns = [
      { header: 'ID', key: 'id', width: 12 },
      { header: 'Cota', key: 'cota', width: 15 },
      { header: 'Cliente', key: 'cliente', width: 30 },
      { header: 'Consultor', key: 'consultor', width: 25 },
      { header: 'Valor Mensal', key: 'valor', width: 15 },
      { header: 'Dia Vencimento', key: 'diaVencimento', width: 15 },
      { header: 'Data Inicio', key: 'dataInicio', width: 15 },
      { header: 'Status', key: 'status', width: 12 },
      { header: 'Total Cobrancas', key: 'totalCobrancas', width: 18 },
      { header: 'Cobrancas Pagas', key: 'pagas', width: 16 },
      { header: 'Cobrancas Atrasadas', key: 'atrasadas', width: 18 }
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4CAF50' }
    };

    processos.forEach(processo => {
      const counts = countsMap[processo.id] || { total: 0, pagas: 0, atrasadas: 0 };

      worksheet.addRow({
        id: processo.id.slice(0, 8),
        cota: processo.cota?.cota || '-',
        cliente: processo.cota?.cliente?.nome || '-',
        consultor: processo.cota?.consultor?.nome || 'N/A',
        valor: formatarValor(parseFloat(processo.cota?.valor) || 0),
        diaVencimento: processo.diaVencimento,
        dataInicio: new Date(processo.dataInicioCobranca).toLocaleDateString('pt-BR'),
        status: processo.status.toUpperCase(),
        totalCobrancas: parseInt(counts.total, 10) || 0,
        pagas: parseInt(counts.pagas, 10) || 0,
        atrasadas: parseInt(counts.atrasadas, 10) || 0
      });
    });

    worksheet.addRow({});
    const totalRow = worksheet.addRow({
      id: 'TOTAL',
      cota: '',
      cliente: '',
      consultor: '',
      valor: '',
      diaVencimento: '',
      dataInicio: '',
      status: '',
      totalCobrancas: cobrancaCounts.reduce((sum, c) => sum + (parseInt(c.total, 10) || 0), 0),
      pagas: cobrancaCounts.reduce((sum, c) => sum + (parseInt(c.pagas, 10) || 0), 0),
      atrasadas: cobrancaCounts.reduce((sum, c) => sum + (parseInt(c.atrasadas, 10) || 0), 0)
    });

    totalRow.font = { bold: true };
    totalRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFEEEEEE' }
    };

    return workbook.xlsx.writeBuffer();
  }

  async exportarCobrancasAtrasadasExcel() {
    const cobrancas = await CobrancaMensal.findAll({
      where: { status: 'atrasado' },
      include: [
        {
          association: 'processoCobranca',
          include: [
            {
              association: 'cota',
              include: [
                { association: 'cliente' },
                { association: 'consultor' }
              ]
            }
          ]
        }
      ],
      order: [['dataVencimento', 'ASC']],
      limit: 5000
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Cobrancas Atrasadas');

    worksheet.columns = [
      { header: 'Cota', key: 'cota', width: 15 },
      { header: 'Cliente', key: 'cliente', width: 30 },
      { header: 'Consultor', key: 'consultor', width: 25 },
      { header: 'Telefone', key: 'telefone', width: 18 },
      { header: 'Mes Referencia', key: 'mesReferencia', width: 20 },
      { header: 'Vencimento', key: 'dataVencimento', width: 18 },
      { header: 'Dias em Atraso', key: 'diasAtraso', width: 18 },
      { header: 'Valor', key: 'valor', width: 18 },
      { header: 'Status', key: 'status', width: 12 }
    ];

    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF44336' }
    };

    cobrancas.forEach(cobranca => {
      const diasAtraso = Math.floor((new Date() - new Date(cobranca.dataVencimento)) / (1000 * 60 * 60 * 24));
      worksheet.addRow({
        cota: cobranca.processoCobranca?.cota?.cota || '-',
        cliente: cobranca.processoCobranca?.cota?.cliente?.nome || '-',
        consultor: cobranca.processoCobranca?.cota?.consultor?.nome || 'N/A',
        telefone: cobranca.processoCobranca?.cota?.cliente?.telefone || 'N/A',
        mesReferencia: new Date(cobranca.mesReferencia).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
        dataVencimento: new Date(cobranca.dataVencimento).toLocaleDateString('pt-BR'),
        diasAtraso,
        valor: `R$ ${parseFloat(cobranca.valor).toFixed(2)}`,
        status: cobranca.status.toUpperCase()
      });
    });

    worksheet.addRow({});
    const valorTotal = cobrancas.reduce((sum, c) => sum + parseFloat(c.valor), 0);
    const totalRow = worksheet.addRow({
      cota: 'TOTAL',
      cliente: '',
      consultor: '',
      telefone: '',
      mesReferencia: '',
      dataVencimento: '',
      diasAtraso: cobrancas.length,
      valor: `R$ ${valorTotal.toFixed(2)}`,
      status: ''
    });

    totalRow.font = { bold: true };
    totalRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFEEEEEE' }
    };

    return workbook.xlsx.writeBuffer();
  }
}

module.exports = new RelatoriosService();
