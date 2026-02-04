'use strict';

const SCHEMA = (process.env.DB_SCHEMA || 'dev').trim();

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const TABLE_NAME = 'cotas_processo_cobranca';
    const table = { tableName: TABLE_NAME, schema: SCHEMA };

    // 1) Criar tabela se não existir
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
          processoCobrancaId: {
            type: Sequelize.UUID,
            allowNull: false,
            references: {
              model: { tableName: 'processos_cobranca', schema: SCHEMA },
              key: 'id',
            },
            onUpdate: 'CASCADE',
            onDelete: 'CASCADE',
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
          valor: {
            type: Sequelize.DECIMAL(10, 2),
            allowNull: false,
            comment: 'Valor da cobrança mensal desta cota',
          },
          diaVencimento: {
            type: Sequelize.INTEGER,
            allowNull: false,
            comment: 'Dia do mês para vencimento (1-31)',
          },
          quantidadeMeses: {
            type: Sequelize.INTEGER,
            allowNull: true,
            comment: 'Quantidade de meses do processo (null = ilimitado)',
          },
          mesesPagosRetroativo: {
            type: Sequelize.INTEGER,
            allowNull: false,
            defaultValue: 0,
            comment: 'Quantidade de meses já pagos (histórico retroativo)',
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
            comment: 'Status da cota no processo',
          },
          observacao: {
            type: Sequelize.TEXT,
            allowNull: true,
            comment: 'Observações específicas desta cota',
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

    // Helper para criar index se não existir
    async function ensureIndex(indexName, fields, options = {}) {
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

      await queryInterface.addIndex(table, fields, { name: indexName, ...options });
    }

    // 2) Criar índices
    await ensureIndex('idx_cotas_processo_processo_id', ['processoCobrancaId']);
    await ensureIndex('idx_cotas_processo_cota_id', ['cotaId']);
    await ensureIndex('idx_cotas_processo_status', ['status']);
    await ensureIndex('idx_cotas_processo_unique', ['processoCobrancaId', 'cotaId'], { unique: true });
  },

  down: async (queryInterface) => {
    const TABLE_NAME = 'cotas_processo_cobranca';

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
