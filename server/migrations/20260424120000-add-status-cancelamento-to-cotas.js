'use strict';

const SCHEMA = (process.env.DB_SCHEMA || 'dev').trim();

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(
      { tableName: 'cotas', schema: SCHEMA },
      'status',
      {
        type: Sequelize.ENUM('ativo', 'cancelado'),
        allowNull: false,
        defaultValue: 'ativo'
      }
    );

    await queryInterface.addColumn(
      { tableName: 'cotas', schema: SCHEMA },
      'dataCancelamento',
      {
        type: Sequelize.DATEONLY,
        allowNull: true
      }
    );
  },

  async down(queryInterface) {
    await queryInterface.removeColumn(
      { tableName: 'cotas', schema: SCHEMA },
      'dataCancelamento'
    );
    await queryInterface.removeColumn(
      { tableName: 'cotas', schema: SCHEMA },
      'status'
    );
  }
};
