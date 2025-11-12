'use strict';

const SCHEMA = process.env.DB_SCHEMA || 'dev';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(
      { schema: SCHEMA, tableName: 'cota_consultores' },
      'idagendor',
      {
        type: Sequelize.STRING,
        allowNull: true
      }
    );

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
    await queryInterface.removeColumn({ schema: SCHEMA, tableName: 'cota_consultores' }, 'idagendor');
  }
};
