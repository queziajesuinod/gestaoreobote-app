// server/services/relatorios.js
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const { Op } = require('sequelize');
const { ProcessoCobranca, Cobranca, NotificacaoInadimplencia } = require('../models');
const { Cota, Cliente, User } = require('../models');

/**
 * Service para geração de relatórios em PDF e Excel
 */
class RelatoriosService {
  /**
   * Gerar relatório PDF de um processo específico
   */
  async gerarRelatorioPDF(processoId) {
    const processo = await ProcessoCobranca.findByPk(processoId, {
      include: [
        {
          model: Cota,
          include: [
            { model: Cliente },
            { model: User, as: 'Consultor' }
          ]
        },
        {
          model: Cobranca,
          include: [
            { model: NotificacaoInadimplencia }
          ],
          order: [['mes_referencia', 'DESC']]
        }
      ]
    });

    if (!processo) {
      throw new Error('Processo não encontrado');
    }

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const chunks = [];

        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Cabeçalho
        doc.fontSize(20).text('Relatório de Processo de Cobrança', { align: 'center' });
        doc.moveDown();

        // Informações do Processo
        doc.fontSize(14).text('Informações do Processo', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10);
        doc.text(`ID do Processo: ${processo.id}`);
        doc.text(`Status: ${processo.status.toUpperCase()}`);
        doc.text(`Valor Mensal: R$ ${processo.valor.toFixed(2)}`);
        doc.text(`Dia de Vencimento: ${processo.dia_vencimento}`);
        doc.text(`Data de Início: ${new Date(processo.data_inicio).toLocaleDateString('pt-BR')}`);
        doc.moveDown();

        // Informações da Cota
        doc.fontSize(14).text('Informações da Cota', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10);
        doc.text(`Número da Cota: ${processo.Cota.numero}`);
        doc.text(`Grupo: ${processo.Cota.grupo || 'N/A'}`);
        doc.moveDown();

        // Informações do Cliente
        doc.fontSize(14).text('Informações do Cliente', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10);
        doc.text(`Nome: ${processo.Cota.Cliente.nome}`);
        doc.text(`Telefone: ${processo.Cota.Cliente.telefone || 'N/A'}`);
        doc.text(`Email: ${processo.Cota.Cliente.email || 'N/A'}`);
        doc.moveDown();

        // Informações do Consultor
        if (processo.Cota.Consultor) {
          doc.fontSize(14).text('Informações do Consultor', { underline: true });
          doc.moveDown(0.5);
          doc.fontSize(10);
          doc.text(`Nome: ${processo.Cota.Consultor.nome}`);
          doc.text(`Telefone: ${processo.Cota.Consultor.telefone || 'N/A'}`);
          doc.moveDown();
        }

        // Estatísticas
        const totalCobrancas = processo.Cobrancas.length;
        const cobrancasPagas = processo.Cobrancas.filter(c => c.status === 'pago').length;
        const cobrancasAtrasadas = processo.Cobrancas.filter(c => c.status === 'atrasado').length;
        const cobrancasPendentes = processo.Cobrancas.filter(c => c.status === 'pendente').length;
        const valorTotal = totalCobrancas * processo.valor;
        const valorPago = cobrancasPagas * processo.valor;
        const valorPendente = (cobrancasPendentes + cobrancasAtrasadas) * processo.valor;

        doc.fontSize(14).text('Estatísticas', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10);
        doc.text(`Total de Cobranças: ${totalCobrancas}`);
        doc.text(`Cobranças Pagas: ${cobrancasPagas}`);
        doc.text(`Cobranças Atrasadas: ${cobrancasAtrasadas}`);
        doc.text(`Cobranças Pendentes: ${cobrancasPendentes}`);
        doc.text(`Valor Total: R$ ${valorTotal.toFixed(2)}`);
        doc.text(`Valor Pago: R$ ${valorPago.toFixed(2)}`);
        doc.text(`Valor Pendente: R$ ${valorPendente.toFixed(2)}`);
        doc.moveDown();

        // Histórico de Cobranças
        doc.addPage();
        doc.fontSize(14).text('Histórico de Cobranças', { underline: true });
        doc.moveDown();

        processo.Cobrancas.forEach((cobranca, index) => {
          if (index > 0 && index % 10 === 0) {
            doc.addPage();
          }

          doc.fontSize(10);
          doc.text(`Mês: ${new Date(cobranca.mes_referencia).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`);
          doc.text(`Vencimento: ${new Date(cobranca.data_vencimento).toLocaleDateString('pt-BR')}`);
          doc.text(`Valor: R$ ${cobranca.valor.toFixed(2)}`);
          doc.text(`Status: ${cobranca.status.toUpperCase()}`);
          
          if (cobranca.pago_em) {
            doc.text(`Pago em: ${new Date(cobranca.pago_em).toLocaleDateString('pt-BR')}`);
          }

          if (cobranca.NotificacaoInadimplencias && cobranca.NotificacaoInadimplencias.length > 0) {
            doc.text(`Notificações: ${cobranca.NotificacaoInadimplencias.length}`);
          }

          doc.moveDown(0.5);
        });

        // Rodapé
        const pages = doc.bufferedPageRange();
        for (let i = 0; i < pages.count; i++) {
          doc.switchToPage(i);
          doc.fontSize(8);
          doc.text(
            `Página ${i + 1} de ${pages.count} - Gerado em ${new Date().toLocaleString('pt-BR')}`,
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

  /**
   * Gerar relatório consolidado de inadimplência em PDF
   */
  async gerarRelatorioInadimplenciaPDF(filtros = {}) {
    const whereClause = {};
    
    if (filtros.dataInicio && filtros.dataFim) {
      whereClause.data_vencimento = {
        [Op.between]: [filtros.dataInicio, filtros.dataFim]
      };
    }

    whereClause.status = 'atrasado';

    const cobrancasAtrasadas = await Cobranca.findAll({
      where: whereClause,
      include: [
        {
          model: ProcessoCobranca,
          include: [
            {
              model: Cota,
              include: [
                { model: Cliente },
                { model: User, as: 'Consultor' }
              ]
            }
          ]
        }
      ],
      order: [['data_vencimento', 'ASC']]
    });

    return new Promise((resolve, reject) => {
      try {
        const doc = new PDFDocument({ margin: 50 });
        const chunks = [];

        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        // Cabeçalho
        doc.fontSize(20).text('Relatório de Inadimplência', { align: 'center' });
        doc.moveDown();
        doc.fontSize(10).text(`Gerado em: ${new Date().toLocaleString('pt-BR')}`, { align: 'center' });
        doc.moveDown(2);

        // Resumo
        const totalCobrancas = cobrancasAtrasadas.length;
        const valorTotal = cobrancasAtrasadas.reduce((sum, c) => sum + parseFloat(c.valor), 0);

        doc.fontSize(14).text('Resumo', { underline: true });
        doc.moveDown(0.5);
        doc.fontSize(10);
        doc.text(`Total de Cobranças Atrasadas: ${totalCobrancas}`);
        doc.text(`Valor Total em Atraso: R$ ${valorTotal.toFixed(2)}`);
        doc.moveDown();

        // Lista de Cobranças Atrasadas
        doc.fontSize(14).text('Cobranças Atrasadas', { underline: true });
        doc.moveDown();

        cobrancasAtrasadas.forEach((cobranca, index) => {
          if (index > 0 && index % 8 === 0) {
            doc.addPage();
          }

          const diasAtraso = Math.floor((new Date() - new Date(cobranca.data_vencimento)) / (1000 * 60 * 60 * 24));

          doc.fontSize(10);
          doc.text(`Cliente: ${cobranca.ProcessoCobranca.Cota.Cliente.nome}`);
          doc.text(`Cota: ${cobranca.ProcessoCobranca.Cota.numero}`);
          doc.text(`Mês: ${new Date(cobranca.mes_referencia).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })}`);
          doc.text(`Vencimento: ${new Date(cobranca.data_vencimento).toLocaleDateString('pt-BR')}`);
          doc.text(`Dias em Atraso: ${diasAtraso}`);
          doc.text(`Valor: R$ ${cobranca.valor.toFixed(2)}`);
          
          if (cobranca.ProcessoCobranca.Cota.Consultor) {
            doc.text(`Consultor: ${cobranca.ProcessoCobranca.Cota.Consultor.nome}`);
          }

          doc.moveDown(0.5);
        });

        // Rodapé
        const pages = doc.bufferedPageRange();
        for (let i = 0; i < pages.count; i++) {
          doc.switchToPage(i);
          doc.fontSize(8);
          doc.text(
            `Página ${i + 1} de ${pages.count}`,
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

  /**
   * Exportar processos para Excel
   */
  async exportarProcessosExcel(filtros = {}) {
    const whereClause = {};
    
    if (filtros.status) {
      whereClause.status = filtros.status;
    }

    const processos = await ProcessoCobranca.findAll({
      where: whereClause,
      include: [
        {
          model: Cota,
          include: [
            { model: Cliente },
            { model: User, as: 'Consultor' }
          ]
        },
        {
          model: Cobranca
        }
      ],
      order: [['created_at', 'DESC']]
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Processos de Cobrança');

    // Definir colunas
    worksheet.columns = [
      { header: 'ID', key: 'id', width: 10 },
      { header: 'Cota', key: 'cota', width: 15 },
      { header: 'Cliente', key: 'cliente', width: 30 },
      { header: 'Consultor', key: 'consultor', width: 30 },
      { header: 'Valor Mensal', key: 'valor', width: 15 },
      { header: 'Dia Vencimento', key: 'dia_vencimento', width: 15 },
      { header: 'Data Início', key: 'data_inicio', width: 15 },
      { header: 'Status', key: 'status', width: 15 },
      { header: 'Total Cobranças', key: 'total_cobrancas', width: 15 },
      { header: 'Cobranças Pagas', key: 'cobrancas_pagas', width: 15 },
      { header: 'Cobranças Atrasadas', key: 'cobrancas_atrasadas', width: 18 }
    ];

    // Estilizar cabeçalho
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FF4CAF50' }
    };

    // Adicionar dados
    processos.forEach(processo => {
      const cobrancasPagas = processo.Cobrancas.filter(c => c.status === 'pago').length;
      const cobrancasAtrasadas = processo.Cobrancas.filter(c => c.status === 'atrasado').length;

      worksheet.addRow({
        id: processo.id.substring(0, 8),
        cota: processo.Cota.numero,
        cliente: processo.Cota.Cliente.nome,
        consultor: processo.Cota.Consultor ? processo.Cota.Consultor.nome : 'N/A',
        valor: `R$ ${processo.valor.toFixed(2)}`,
        dia_vencimento: processo.dia_vencimento,
        data_inicio: new Date(processo.data_inicio).toLocaleDateString('pt-BR'),
        status: processo.status.toUpperCase(),
        total_cobrancas: processo.Cobrancas.length,
        cobrancas_pagas: cobrancasPagas,
        cobrancas_atrasadas: cobrancasAtrasadas
      });
    });

    // Adicionar totalizadores
    worksheet.addRow({});
    const totalRow = worksheet.addRow({
      id: 'TOTAL',
      cota: '',
      cliente: '',
      consultor: '',
      valor: '',
      dia_vencimento: '',
      data_inicio: '',
      status: '',
      total_cobrancas: processos.reduce((sum, p) => sum + p.Cobrancas.length, 0),
      cobrancas_pagas: processos.reduce((sum, p) => sum + p.Cobrancas.filter(c => c.status === 'pago').length, 0),
      cobrancas_atrasadas: processos.reduce((sum, p) => sum + p.Cobrancas.filter(c => c.status === 'atrasado').length, 0)
    });

    totalRow.font = { bold: true };
    totalRow.fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFEEEEEE' }
    };

    return workbook.xlsx.writeBuffer();
  }

  /**
   * Exportar cobranças atrasadas para Excel
   */
  async exportarCobrancasAtrasadasExcel() {
    const cobrancasAtrasadas = await Cobranca.findAll({
      where: { status: 'atrasado' },
      include: [
        {
          model: ProcessoCobranca,
          include: [
            {
              model: Cota,
              include: [
                { model: Cliente },
                { model: User, as: 'Consultor' }
              ]
            }
          ]
        }
      ],
      order: [['data_vencimento', 'ASC']]
    });

    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Cobranças Atrasadas');

    // Definir colunas
    worksheet.columns = [
      { header: 'Cota', key: 'cota', width: 15 },
      { header: 'Cliente', key: 'cliente', width: 30 },
      { header: 'Consultor', key: 'consultor', width: 30 },
      { header: 'Telefone Cliente', key: 'telefone', width: 18 },
      { header: 'Mês Referência', key: 'mes_referencia', width: 18 },
      { header: 'Data Vencimento', key: 'data_vencimento', width: 18 },
      { header: 'Dias em Atraso', key: 'dias_atraso', width: 15 },
      { header: 'Valor', key: 'valor', width: 15 },
      { header: 'Status', key: 'status', width: 15 }
    ];

    // Estilizar cabeçalho
    worksheet.getRow(1).font = { bold: true };
    worksheet.getRow(1).fill = {
      type: 'pattern',
      pattern: 'solid',
      fgColor: { argb: 'FFF44336' }
    };

    // Adicionar dados
    cobrancasAtrasadas.forEach(cobranca => {
      const diasAtraso = Math.floor((new Date() - new Date(cobranca.data_vencimento)) / (1000 * 60 * 60 * 24));

      worksheet.addRow({
        cota: cobranca.ProcessoCobranca.Cota.numero,
        cliente: cobranca.ProcessoCobranca.Cota.Cliente.nome,
        consultor: cobranca.ProcessoCobranca.Cota.Consultor ? cobranca.ProcessoCobranca.Cota.Consultor.nome : 'N/A',
        telefone: cobranca.ProcessoCobranca.Cota.Cliente.telefone || 'N/A',
        mes_referencia: new Date(cobranca.mes_referencia).toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }),
        data_vencimento: new Date(cobranca.data_vencimento).toLocaleDateString('pt-BR'),
        dias_atraso: diasAtraso,
        valor: `R$ ${cobranca.valor.toFixed(2)}`,
        status: cobranca.status.toUpperCase()
      });
    });

    // Adicionar totalizadores
    worksheet.addRow({});
    const valorTotal = cobrancasAtrasadas.reduce((sum, c) => sum + parseFloat(c.valor), 0);
    const totalRow = worksheet.addRow({
      cota: 'TOTAL',
      cliente: '',
      consultor: '',
      telefone: '',
      mes_referencia: '',
      data_vencimento: '',
      dias_atraso: cobrancasAtrasadas.length,
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
