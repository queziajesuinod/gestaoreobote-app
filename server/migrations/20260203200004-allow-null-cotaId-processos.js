'use strict';

const SCHEMA = (process.env.DB_SCHEMA || 'dev').trim();

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn(
      { tableName: 'processos_cobranca', schema: SCHEMA },
      'cotaId',
      {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: { tableName: 'cotas', schema: SCHEMA },
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      }
    );
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn(
      { tableName: 'processos_cobranca', schema: SCHEMA },
      'cotaId',
      {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: { tableName: 'cotas', schema: SCHEMA },
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      }
    );
  }
};
