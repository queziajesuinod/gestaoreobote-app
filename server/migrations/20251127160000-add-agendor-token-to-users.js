'use strict';
require('dotenv').config();

const SCHEMA = (process.env.DB_SCHEMA || 'dev').trim();

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = { schema: SCHEMA, tableName: 'Users' };

    const desc = await queryInterface.describeTable(table);
    if (desc.agendorToken) return;

    await queryInterface.addColumn(table, 'agendorToken', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    const table = { schema: SCHEMA, tableName: 'Users' };

    const desc = await queryInterface.describeTable(table);
    if (!desc.agendorToken) return;

    await queryInterface.removeColumn(table, 'agendorToken');
  },
};
