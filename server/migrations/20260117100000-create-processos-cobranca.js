'use strict';

const SCHEMA = process.env.DB_SCHEMA || 'dev';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable(
      'processos_cobranca',
      {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false
        },
        cotaId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: {
              tableName: 'cotas',
              schema: SCHEMA
            },
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        diaVencimento: {
          type: Sequelize.INTEGER,
          allowNull: false,
          comment: 'Dia do mês para vencimento (1-31)'
        },
        dataInicioCobranca: {
          type: Sequelize.DATEONLY,
          allowNull: false,
          comment: 'Data a partir da qual começar a gerar cobranças'
        },
        valorParcela: {
          type: Sequelize.DECIMAL(10, 2),
          allowNull: false,
          comment: 'Valor fixo da parcela mensal'
        },
        status: {
          type: Sequelize.ENUM('ativo', 'pausado', 'encerrado'),
          allowNull: false,
          defaultValue: 'ativo',
          comment: 'Status do processo de cobrança'
        },
        observacao: {
          type: Sequelize.TEXT,
          allowNull: true,
          comment: 'Observações sobre o processo'
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
      { tableName: 'processos_cobranca', schema: SCHEMA },
      ['cotaId'],
      { name: 'idx_processos_cobranca_cota_id' }
    );

    await queryInterface.addIndex(
      { tableName: 'processos_cobranca', schema: SCHEMA },
      ['status'],
      { name: 'idx_processos_cobranca_status' }
    );

    await queryInterface.addIndex(
      { tableName: 'processos_cobranca', schema: SCHEMA },
      ['dataInicioCobranca'],
      { name: 'idx_processos_cobranca_data_inicio' }
    );
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable({ tableName: 'processos_cobranca', schema: SCHEMA });
  }
};
