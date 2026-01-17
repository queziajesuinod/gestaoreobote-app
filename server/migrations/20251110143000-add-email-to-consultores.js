'use strict';

const SCHEMA = (process.env.DB_SCHEMA || 'dev').trim();
const CONSTRAINT_NAME = 'consultores_email_unico';

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = { schema: SCHEMA, tableName: 'consultores' };

    // 1) coluna: só cria se não existir
    const desc = await queryInterface.describeTable(table);

    if (!desc.email) {
      // mais seguro criar como NULL primeiro para não quebrar em tabelas já populadas
      await queryInterface.addColumn(table, 'email', {
        type: Sequelize.STRING,
        allowNull: true,
      });
    }

    // (opcional) Se você QUISER forçar NOT NULL, faça depois de garantir que não há null:
    // await queryInterface.sequelize.query(
    //   `UPDATE "${SCHEMA}"."consultores" SET email = '' WHERE email IS NULL;`
    // );
    // await queryInterface.changeColumn(table, 'email', {
    //   type: Sequelize.STRING,
    //   allowNull: false,
    // });

    // 2) constraint UNIQUE: só cria se não existir
    const [rows] = await queryInterface.sequelize.query(
      `
      SELECT 1
      FROM information_schema.table_constraints
      WHERE constraint_schema = :schema
        AND table_name = :table
        AND constraint_name = :constraint
      LIMIT 1
      `,
      {
        replacements: {
          schema: SCHEMA,
          table: 'consultores',
          constraint: CONSTRAINT_NAME,
        },
      }
    );

    const exists = Array.isArray(rows) && rows.length > 0;

    if (!exists) {
      await queryInterface.addConstraint(table, {
        fields: ['email'],
        type: 'unique',
        name: CONSTRAINT_NAME,
      });
    }
  },

  async down(queryInterface) {
    const table = { schema: SCHEMA, tableName: 'consultores' };

    const desc = await queryInterface.describeTable(table);

    // remove constraint se existir
    const [rows] = await queryInterface.sequelize.query(
      `
      SELECT 1
      FROM information_schema.table_constraints
      WHERE constraint_schema = :schema
        AND table_name = :table
        AND constraint_name = :constraint
      LIMIT 1
      `,
      {
        replacements: {
          schema: SCHEMA,
          table: 'consultores',
          constraint: CONSTRAINT_NAME,
        },
      }
    );

    if (Array.isArray(rows) && rows.length > 0) {
      await queryInterface.removeConstraint(table, CONSTRAINT_NAME);
    }

    // remove coluna se existir
    if (desc.email) {
      await queryInterface.removeColumn(table, 'email');
    }
  },
};
