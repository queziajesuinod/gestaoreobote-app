'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const schema = (process.env.DB_SCHEMA || 'dev').trim();
    const table = { tableName: 'cotas', schema };

    const desc = await queryInterface.describeTable(table);
    if (desc.digito) return; // já existe, segue

    await queryInterface.addColumn(table, 'digito', {
      type: Sequelize.STRING(5),
      allowNull: true,
    });
  },

  async down(queryInterface) {
    const schema = (process.env.DB_SCHEMA || 'dev').trim();
    const table = { tableName: 'cotas', schema };

    const desc = await queryInterface.describeTable(table);
    if (!desc.digito) return; // não existe, nada a remover

    await queryInterface.removeColumn(table, 'digito');
  },
};
