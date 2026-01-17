'use strict';

const SCHEMA = (process.env.DB_SCHEMA || 'dev').trim();

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = { schema: SCHEMA, tableName: 'cotas' };

    const desc = await queryInterface.describeTable(table);
    if (desc.consultorLegado) return;

    await queryInterface.addColumn(table, 'consultorLegado', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  async down(queryInterface) {
    const table = { schema: SCHEMA, tableName: 'cotas' };

    const desc = await queryInterface.describeTable(table);
    if (!desc.consultorLegado) return;

    await queryInterface.removeColumn(table, 'consultorLegado');
  },
};
