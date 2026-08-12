'use strict';
require('dotenv').config();

const SCHEMA = (process.env.DB_SCHEMA || 'dev').trim();
const TABLE_NAME = 'assistente_acoes';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`CREATE SCHEMA IF NOT EXISTS "${SCHEMA}";`);

    const [t] = await queryInterface.sequelize.query(
      `SELECT 1 FROM information_schema.tables WHERE table_schema = :schema AND table_name = :table LIMIT 1`,
      { replacements: { schema: SCHEMA, table: TABLE_NAME } }
    );
    const tableExists = Array.isArray(t) && t.length > 0;

    if (!tableExists) {
      await queryInterface.createTable(
        { schema: SCHEMA, tableName: TABLE_NAME },
        {
          id: { allowNull: false, primaryKey: true, type: Sequelize.UUID, defaultValue: Sequelize.UUIDV4 },
          consultorId: { type: Sequelize.INTEGER, allowNull: true },
          consultorNome: { type: Sequelize.STRING, allowNull: true },
          telefone: { type: Sequelize.STRING, allowNull: true },
          clienteNome: { type: Sequelize.STRING, allowNull: true },
          dealId: { type: Sequelize.BIGINT, allowNull: true },     // id do negócio no Agendor
          taskId: { type: Sequelize.BIGINT, allowNull: true },     // id da tarefa no Agendor
          // negocio_criado | tarefa_criada_concluida | tarefa_concluida | tarefa_agendada | etapa_movida
          acao: { type: Sequelize.STRING, allowNull: false },
          tarefaTipo: { type: Sequelize.STRING, allowNull: true }, // VISITA/REUNIAO/...
          detalhe: { type: Sequelize.JSONB || Sequelize.JSON, allowNull: true },
          createdAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') },
          updatedAt: { allowNull: false, type: Sequelize.DATE, defaultValue: Sequelize.fn('NOW') }
        }
      );
    }

    const INDEX_NAME = 'assistente_acoes_consultor_cliente_idx';
    const [idx] = await queryInterface.sequelize.query(
      `SELECT 1 FROM pg_indexes WHERE schemaname = :schema AND tablename = :table AND indexname = :index LIMIT 1`,
      { replacements: { schema: SCHEMA, table: TABLE_NAME, index: INDEX_NAME } }
    );
    if (!(Array.isArray(idx) && idx.length > 0)) {
      await queryInterface.addIndex({ schema: SCHEMA, tableName: TABLE_NAME }, ['consultorId', 'clienteNome', 'createdAt'], { name: INDEX_NAME });
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
