'use strict';

const SCHEMA = (process.env.DB_SCHEMA || 'dev').trim();

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const TABLE_NAME = 'processos_cobranca';
    const table = { tableName: TABLE_NAME, schema: SCHEMA };

    const [columns] = await queryInterface.sequelize.query(
      `
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = :schema
        AND table_name = :table
        AND column_name = :column
      LIMIT 1
      `,
      {
        replacements: {
          schema: SCHEMA,
          table: TABLE_NAME,
          column: 'valorParcela'
        }
      }
    );

    const columnExists = Array.isArray(columns) && columns.length > 0;
    if (!columnExists) return;

    await queryInterface.removeColumn(table, 'valorParcela');
  },

  down: async (queryInterface, Sequelize) => {
    const TABLE_NAME = 'processos_cobranca';
    const table = { tableName: TABLE_NAME, schema: SCHEMA };

    const [columns] = await queryInterface.sequelize.query(
      `
      SELECT 1
      FROM information_schema.columns
      WHERE table_schema = :schema
        AND table_name = :table
        AND column_name = :column
      LIMIT 1
      `,
      {
        replacements: {
          schema: SCHEMA,
          table: TABLE_NAME,
          column: 'valorParcela'
        }
      }
    );

    const columnExists = Array.isArray(columns) && columns.length > 0;
    if (columnExists) return;

    await queryInterface.addColumn(
      table,
      'valorParcela',
      {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        comment: 'Valor fixo da parcela mensal'
      }
    );
  }
};
