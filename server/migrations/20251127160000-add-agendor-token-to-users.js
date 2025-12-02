'use strict';
require('dotenv').config();

const SCHEMA = process.env.DB_SCHEMA || 'dev';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(
      { schema: SCHEMA, tableName: 'Users' },
      'agendorToken',
      {
        type: Sequelize.STRING,
        allowNull: true
      }
    );
  },

  async down(queryInterface) {
    await queryInterface.removeColumn(
      { schema: SCHEMA, tableName: 'Users' },
      'agendorToken'
    );
  }
};
