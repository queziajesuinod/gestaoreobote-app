'use strict';

const SCHEMA = (process.env.DB_SCHEMA || 'dev').trim();
const TABLE_NAME = 'processos_cobranca';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const [rows] = await queryInterface.sequelize.query(
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
          column: 'quantidadeMeses'
        }
      }
    );

    const columnExists = Array.isArray(rows) && rows.length > 0;
    if (columnExists) return;

    await queryInterface.addColumn(
      { tableName: TABLE_NAME, schema: SCHEMA },
      'quantidadeMeses',
      {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Quantidade de meses do processo (null = ilimitado)'
      }
    );
  },

  down: async (queryInterface) => {
    const [rows] = await queryInterface.sequelize.query(
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
          column: 'quantidadeMeses'
        }
      }
    );

    const columnExists = Array.isArray(rows) && rows.length > 0;
    if (!columnExists) return;

    await queryInterface.removeColumn({ tableName: TABLE_NAME, schema: SCHEMA }, 'quantidadeMeses');
  }
};
