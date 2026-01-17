'use strict';

const SCHEMA = (process.env.DB_SCHEMA || 'dev').trim();

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable(
      'cobrancas_mensais',
      {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false
        },
        processoCobrancaId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: {
              tableName: 'processos_cobranca',
              schema: SCHEMA
            },
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        mesReferencia: {
          type: Sequelize.DATEONLY,
          allowNull: false,
          comment: 'Primeiro dia do mês de referência (ex: 2024-01-01)'
        },
        valor: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          comment: 'Valor da parcela'
        },
        dataVencimento: {
          type: Sequelize.DATEONLY,
          allowNull: false,
          comment: 'Data de vencimento da parcela'
        },
        status: {
          type: Sequelize.ENUM('pendente', 'atrasado', 'pago', 'cancelado'),
          allowNull: false,
          defaultValue: 'pendente',
          comment: 'Status da cobrança'
        },
        dataPagamento: {
          type: Sequelize.DATEONLY,
          allowNull: true,
          comment: 'Data em que foi pago'
        },
        observacao: {
          type: Sequelize.TEXT,
          allowNull: true,
          comment: 'Observações sobre o pagamento'
        },
        ultimaNotificacaoEm: {
          type: Sequelize.DATE,
          allowNull: true,
          comment: 'Data/hora da última notificação enviada'
        },
        totalNotificacoes: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 0,
          comment: 'Total de notificações enviadas'
        },
        historicoRetroativo: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          comment: 'Flag para identificar se é histórico retroativo'
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        }
      },
      {
        schema: SCHEMA
      }
    );

    // Criar índices
    await queryInterface.addIndex(
      { tableName: 'cobrancas_mensais', schema: SCHEMA },
      ['processoCobrancaId'],
      { name: 'idx_cobrancas_mensais_processo_id' }
    );

    await queryInterface.addIndex(
      { tableName: 'cobrancas_mensais', schema: SCHEMA },
      ['status'],
      { name: 'idx_cobrancas_mensais_status' }
    );

    await queryInterface.addIndex(
      { tableName: 'cobrancas_mensais', schema: SCHEMA },
      ['dataVencimento'],
      { name: 'idx_cobrancas_mensais_vencimento' }
    );

    await queryInterface.addIndex(
      { tableName: 'cobrancas_mensais', schema: SCHEMA },
      ['mesReferencia'],
      { name: 'idx_cobrancas_mensais_mes_referencia' }
    );

    // Criar índice único composto
    await queryInterface.addIndex(
      { tableName: 'cobrancas_mensais', schema: SCHEMA },
      ['processoCobrancaId', 'mesReferencia'],
      {
        unique: true,
        name: 'unique_processo_mes'
      }
    );
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable({ tableName: 'cobrancas_mensais', schema: SCHEMA });
  }
};
