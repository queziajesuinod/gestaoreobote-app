'use strict';

const SCHEMA = process.env.DB_SCHEMA || 'dev';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.changeColumn(
      { schema: SCHEMA, tableName: 'cotas' },
      'idagendor',
      {
        type: Sequelize.STRING,
        allowNull: true
      }
    );
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.changeColumn(
      { schema: SCHEMA, tableName: 'cotas' },
      'idagendor',
      {
        type: Sequelize.STRING,
        allowNull: false
      }
    );
  }
};
