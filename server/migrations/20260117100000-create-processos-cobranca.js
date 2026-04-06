'use strict';

const SCHEMA = (process.env.DB_SCHEMA || 'dev').trim();

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const TABLE_NAME = 'processos_cobranca';
    const table = { tableName: TABLE_NAME, schema: SCHEMA };

    // 1) cria tabela só se não existir
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
        TABLE_NAME,
        {
          id: {
            type: Sequelize.UUID,
            defaultValue: Sequelize.UUIDV4,
            primaryKey: true,
            allowNull: false,
          },
          cotaId: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: { tableName: 'cotas', schema: SCHEMA },
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
          },
          diaVencimento: {
            type: Sequelize.INTEGER,
            allowNull: false,
            comment: 'Dia do mês para vencimento (1-31)',
          },
          dataInicioCobranca: {
            type: Sequelize.DATEONLY,
            allowNull: false,
            comment: 'Data a partir da qual começar a gerar cobranças',
          },
          status: {
            type: Sequelize.ENUM('ativo', 'pausado', 'encerrado'),
            allowNull: false,
            defaultValue: 'ativo',
            comment: 'Status do processo de cobrança',
          },
          observacao: {
            type: Sequelize.TEXT,
            allowNull: true,
            comment: 'Observações sobre o processo',
          },
          createdAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
          updatedAt: {
            type: Sequelize.DATE,
            allowNull: false,
            defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
          },
        },
        { schema: SCHEMA }
      );
    }

    // helper para criar index se não existir
    async function ensureIndex(indexName, fields) {
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
          replacements: {
            schema: SCHEMA,
            table: TABLE_NAME,
            index: indexName,
          },
        }
      );

      const exists = Array.isArray(idx) && idx.length > 0;
      if (exists) return;

      await queryInterface.addIndex(table, fields, { name: indexName });
    }

    // 2) cria índices só se não existirem
    await ensureIndex('idx_processos_cobranca_cota_id', ['cotaId']);
    await ensureIndex('idx_processos_cobranca_status', ['status']);
    await ensureIndex('idx_processos_cobranca_data_inicio', ['dataInicioCobranca']);
  },

  down: async (queryInterface) => {
    const TABLE_NAME = 'processos_cobranca';

    // dropTable só se existir (pra não quebrar rollback)
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

    await queryInterface.dropTable({ tableName: TABLE_NAME, schema: SCHEMA });
  },
};
