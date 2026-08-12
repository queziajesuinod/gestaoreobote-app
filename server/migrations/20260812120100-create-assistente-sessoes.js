'use strict';
require('dotenv').config();

const SCHEMA = (process.env.DB_SCHEMA || 'dev').trim();
const TABLE_NAME = 'assistente_sessoes';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(
      `CREATE SCHEMA IF NOT EXISTS "${SCHEMA}";`
    );

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
          // telefone (whatsapp) do remetente, só dígitos
          telefone: {
            type: Sequelize.STRING,
            allowNull: false,
          },
          consultorId: {
            type: Sequelize.INTEGER,
            allowNull: true,
          },
          // aguardando_confirmacao | aguardando_cliente | aguardando_criar_cliente | concluido | cancelado
          status: {
            type: Sequelize.STRING,
            allowNull: false,
            defaultValue: 'aguardando_confirmacao',
          },
          // intenção extraída pela IA + ids resolvidos no Agendor
          payload: {
            type: Sequelize.JSONB || Sequelize.JSON,
            allowNull: true,
          },
          // candidatos de cliente quando o nome é ambíguo
          candidatos: {
            type: Sequelize.JSONB || Sequelize.JSON,
            allowNull: true,
          },
          mensagemOriginal: {
            type: Sequelize.TEXT,
            allowNull: true,
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

    // index para achar rápido a sessão ativa de um telefone
    const INDEX_NAME = 'assistente_sessoes_telefone_status_idx';
    const [idx] = await queryInterface.sequelize.query(
      `
      SELECT 1
      FROM pg_indexes
      WHERE schemaname = :schema
        AND tablename = :table
        AND indexname = :index
      LIMIT 1
      `,
      { replacements: { schema: SCHEMA, table: TABLE_NAME, index: INDEX_NAME } }
    );

    const indexExists = Array.isArray(idx) && idx.length > 0;
    if (!indexExists) {
      await queryInterface.addIndex(
        { schema: SCHEMA, tableName: TABLE_NAME },
        ['telefone', 'status'],
        { name: INDEX_NAME }
      );
    }
  },

  async down(queryInterface) {
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
