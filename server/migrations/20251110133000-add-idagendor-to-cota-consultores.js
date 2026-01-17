'use strict';

const SCHEMA = (process.env.DB_SCHEMA || 'dev').trim();

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = { schema: SCHEMA, tableName: 'cota_consultores' };

    const desc = await queryInterface.describeTable(table);

    // cria a coluna só se não existir
    if (!desc.idagendor) {
      await queryInterface.addColumn(table, 'idagendor', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }

    // update pode rodar sempre (é idempotente do jeito que está)
    await queryInterface.sequelize.query(`
      UPDATE "${SCHEMA}"."cota_consultores" cc
         SET idagendor = c.idagendor
        FROM "${SCHEMA}"."cotas" c
       WHERE cc."cotaId" = c.id
         AND (cc.idagendor IS NULL OR cc.idagendor = '')
         AND c.idagendor IS NOT NULL
    `);
  },

  async down(queryInterface) {
    const table = { schema: SCHEMA, tableName: 'cota_consultores' };

    const desc = await queryInterface.describeTable(table);

    // remove só se existir
    if (!desc.idagendor) return;

    await queryInterface.removeColumn(table, 'idagendor');
  },
};
