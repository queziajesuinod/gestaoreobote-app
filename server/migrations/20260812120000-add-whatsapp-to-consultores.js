'use strict';
require('dotenv').config();

const SCHEMA = (process.env.DB_SCHEMA || 'dev').trim();

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = { schema: SCHEMA, tableName: 'consultores' };

    const desc = await queryInterface.describeTable(table);
    if (desc.whatsapp) return;

    await queryInterface.addColumn(table, 'whatsapp', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    const table = { schema: SCHEMA, tableName: 'consultores' };

    const desc = await queryInterface.describeTable(table);
    if (!desc.whatsapp) return;

    await queryInterface.removeColumn(table, 'whatsapp');
  },
};
