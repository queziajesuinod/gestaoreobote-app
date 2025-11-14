'use strict';

const SCHEMA = process.env.DB_SCHEMA || 'dev';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(
      { schema: SCHEMA, tableName: 'cotas' },
      'consultorLegado',
      {
        type: Sequelize.STRING,
        allowNull: true
      }
    );
  },

  async down(queryInterface) {
    await queryInterface.removeColumn(
      { schema: SCHEMA, tableName: 'cotas' },
      'consultorLegado'
    );
  }
};
