'use strict';

const SCHEMA = (process.env.DB_SCHEMA || 'dev').trim();
const TABLE_NAME = 'agendor_cache';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1) garante schema (seguro)
    await queryInterface.sequelize.query(
      `CREATE SCHEMA IF NOT EXISTS "${SCHEMA}";`
    );

    // 2) checa se a tabela já existe
    const [t] = await queryInterface.sequelize.query(
      `
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = :schema
        AND table_name = :table
      LIMIT 1
      `,
      { replacements: { schema: SCHEMA, table: TABLE_NAME } }
    );

    const tableExists = Array.isArray(t) && t.length > 0;

    if (!tableExists) {
      await queryInterface.createTable(
        { schema: SCHEMA, tableName: TABLE_NAME },
        {
          id: {
            allowNull: false,
            primaryKey: true,
            type: Sequelize.UUID,
            defaultValue: Sequelize.UUIDV4,
          },
          hashParams: {
            type: Sequelize.STRING,
            allowNull: false,
            unique: true,
          },
          tokenSuffix: {
            type: Sequelize.STRING,
            allowNull: true,
          },
          tipo: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          inicio: {
            type: Sequelize.DATEONLY,
            allowNull: false,
          },
          fim: {
            type: Sequelize.DATEONLY,
            allowNull: true,
          },
          dealStatus: {
            type: Sequelize.STRING,
            allowNull: true,
          },
          payload: {
            type: Sequelize.JSONB || Sequelize.JSON,
            allowNull: false,
          },
          expiresAt: {
            type: Sequelize.DATE,
            allowNull: false,
          },
          createdAt: {
            allowNull: false,
            type: Sequelize.DATE,
            defaultValue: Sequelize.fn('NOW'),
          },
          updatedAt: {
            allowNull: false,
            type: Sequelize.DATE,
            defaultValue: Sequelize.fn('NOW'),
          },
        }
      );
    }

    // 3) index: só cria se não existir
    // nome do index (fixo pra facilitar checagem)
    const INDEX_NAME = 'agendor_cache_tipo_tokenSuffix_inicio_fim_idx';

    const [idx] = await queryInterface.sequelize.query(
      `
      SELECT 1
      FROM pg_indexes
      WHERE schemaname = :schema
        AND tablename = :table
        AND indexname = :index
      LIMIT 1
      `,
      {
        replacements: { schema: SCHEMA, table: TABLE_NAME, index: INDEX_NAME },
      }
    );

    const indexExists = Array.isArray(idx) && idx.length > 0;

    if (!indexExists) {
      await queryInterface.addIndex(
        { schema: SCHEMA, tableName: TABLE_NAME },
        ['tipo', 'tokenSuffix', 'inicio', 'fim'],
        { name: INDEX_NAME }
      );
    }
  },

  async down(queryInterface) {
    // dropTable pode falhar se não existir, então checa antes
    const [t] = await queryInterface.sequelize.query(
      `
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = :schema
        AND table_name = :table
      LIMIT 1
      `,
      { replacements: { schema: SCHEMA, table: TABLE_NAME } }
    );

    const tableExists = Array.isArray(t) && t.length > 0;
    if (!tableExists) return;

    await queryInterface.dropTable({ schema: SCHEMA, tableName: TABLE_NAME });
  },
};
