'use strict';
require('dotenv').config();

const SCHEMA = (process.env.DB_SCHEMA || 'dev').trim();
const TABLE_NAME = 'assistente_eventos';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`CREATE SCHEMA IF NOT EXISTS "${SCHEMA}";`);

    const [t] = await queryInterface.sequelize.query(
      `SELECT 1 FROM information_schema.tables WHERE table_schema = :schema AND table_name = :table LIMIT 1`,
      { replacements: { schema: SCHEMA, table: TABLE_NAME } }
    );
    if (!(Array.isArray(t) && t.length > 0)) {
      await queryInterface.createTable(
        { schema: SCHEMA, tableName: TABLE_NAME },
        {
          id: { allowNull: false, primaryKey: true, type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4 },
          telefone: { type: Sequelize.STRING, allowNull: true },
          pushName: { type: Sequelize.STRING, allowNull: true },
          tipo: { type: Sequelize.STRING, allowNull: true },       // texto | audio
          texto: { type: Sequelize.TEXT, allowNull: true },        // conteúdo recebido (resumo)
          resultado: { type: Sequelize.STRING, allowNull: false }, // processado | ignorado | erro
          motivo: { type: Sequelize.STRING, allowNull: true },     // from_me, grupo, nao_cadastrado, sem_gatilho, ...
          respondeu: { type: Sequelize.BOOLEAN, allowNull: true, defaultValue: false },
          resposta: { type: Sequelize.TEXT, allowNull: true },
          createdAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
          updatedAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') }
        }
      );
    }

    const INDEX_NAME = 'assistente_eventos_created_idx';
    const [idx] = await queryInterface.sequelize.query(
      `SELECT 1 FROM pg_indexes WHERE schemaname = :schema AND tablename = :table AND indexname = :index LIMIT 1`,
      { replacements: { schema: SCHEMA, table: TABLE_NAME, index: INDEX_NAME } }
    );
    if (!(Array.isArray(idx) && idx.length > 0)) {
      await queryInterface.addIndex({ schema: SCHEMA, tableName: TABLE_NAME }, ['createdAt'], { name: INDEX_NAME });
    }
  },

  async down(queryInterface) {
    const [t] = await queryInterface.sequelize.query(
      `SELECT 1 FROM information_schema.tables WHERE table_schema = :schema AND table_name = :table LIMIT 1`,
      { replacements: { schema: SCHEMA, table: TABLE_NAME } }
    );
    if (Array.isArray(t) && t.length > 0) {
      await queryInterface.dropTable({ schema: SCHEMA, tableName: TABLE_NAME });
    }
  }
};
