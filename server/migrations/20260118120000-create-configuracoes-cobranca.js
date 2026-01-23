'use strict';

const SCHEMA = (process.env.DB_SCHEMA || 'dev').trim();

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      {
        tableName: 'configuracoes_cobranca',
        schema: SCHEMA
      },
      {
        id: {
          type: Sequelize.UUID,
          primaryKey: true,
          defaultValue: Sequelize.UUIDV4,
          allowNull: false
        },
        nome: {
          type: Sequelize.STRING(150),
          allowNull: false,
          defaultValue: 'Configuração de Cobrança'
        },
        modo: {
          type: Sequelize.ENUM('diaria', 'semanal', 'dia_sim_dia_nao'),
          allowNull: false,
          defaultValue: 'diaria',
          comment: 'Define em que cadência o módulo dispara a detecção'
        },
        diasSemana: {
          type: Sequelize.JSONB,
          allowNull: true,
          comment: 'Dias ativos quando o modo é semanal (0=domingo)'
        },
        ultimaExecucao: {
          type: Sequelize.DATE,
          allowNull: true,
          comment: 'Última vez que a detecção automática executou'
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('NOW()')
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.literal('NOW()')
        }
      }
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable({
      tableName: 'configuracoes_cobranca',
      schema: SCHEMA
    });
  }
};
