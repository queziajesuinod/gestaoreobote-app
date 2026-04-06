'use strict';

const SCHEMA = (process.env.DB_SCHEMA || 'dev').trim();

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const TABLE_NAME = 'cobrancas_mensais';

    // 1) Verificar se a coluna já existe
    const [columns] = await queryInterface.sequelize.query(
      `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = :schema
        AND table_name = :table
        AND column_name = 'cotaProcessoId'
      `,
      { replacements: { schema: SCHEMA, table: TABLE_NAME } }
    );

    const columnExists = Array.isArray(columns) && columns.length > 0;

    if (!columnExists) {
      console.log('[Migration] Adicionando coluna cotaProcessoId em cobrancas_mensais...');

      await queryInterface.addColumn(
        { tableName: TABLE_NAME, schema: SCHEMA },
        'cotaProcessoId',
        {
          type: Sequelize.UUID,
          allowNull: true,
          references: {
            model: { tableName: 'cotas_processo_cobranca', schema: SCHEMA },
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        }
      );

      console.log('[Migration] Coluna cotaProcessoId adicionada com sucesso!');
    } else {
      console.log('[Migration] Coluna cotaProcessoId já existe. Pulando...');
    }

    // 2) Criar índice se não existir
    const indexName = 'idx_cobrancas_mensais_cota_processo_id';
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

    const indexExists = Array.isArray(idx) && idx.length > 0;

    if (!indexExists) {
      console.log('[Migration] Criando índice idx_cobrancas_mensais_cota_processo_id...');

      await queryInterface.addIndex(
        { tableName: TABLE_NAME, schema: SCHEMA },
        ['cotaProcessoId'],
        { name: indexName }
      );

      console.log('[Migration] Índice criado com sucesso!');
    } else {
      console.log('[Migration] Índice já existe. Pulando...');
    }

    // 3) Criar índice único composto (cotaProcessoId, mesReferencia)
    const uniqueIndexName = 'unique_cota_processo_mes';
    const [uniqueIdx] = await queryInterface.sequelize.query(
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
          index: uniqueIndexName,
        },
      }
    );

    const uniqueIndexExists = Array.isArray(uniqueIdx) && uniqueIdx.length > 0;

    if (!uniqueIndexExists) {
      console.log('[Migration] Criando índice único unique_cota_processo_mes...');

      await queryInterface.addIndex(
        { tableName: TABLE_NAME, schema: SCHEMA },
        ['cotaProcessoId', 'mesReferencia'],
        { name: uniqueIndexName, unique: true }
      );

      console.log('[Migration] Índice único criado com sucesso!');
    } else {
      console.log('[Migration] Índice único já existe. Pulando...');
    }
  },

  down: async (queryInterface) => {
    const TABLE_NAME = 'cobrancas_mensais';

    // Remover índice único
    const uniqueIndexName = 'unique_cota_processo_mes';
    const [uniqueIdx] = await queryInterface.sequelize.query(
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
          index: uniqueIndexName,
        },
      }
    );

    if (Array.isArray(uniqueIdx) && uniqueIdx.length > 0) {
      await queryInterface.removeIndex(
        { tableName: TABLE_NAME, schema: SCHEMA },
        uniqueIndexName
      );
    }

    // Remover índice simples
    const indexName = 'idx_cobrancas_mensais_cota_processo_id';
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

    if (Array.isArray(idx) && idx.length > 0) {
      await queryInterface.removeIndex(
        { tableName: TABLE_NAME, schema: SCHEMA },
        indexName
      );
    }

    // Remover coluna
    const [columns] = await queryInterface.sequelize.query(
      `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = :schema
        AND table_name = :table
        AND column_name = 'cotaProcessoId'
      `,
      { replacements: { schema: SCHEMA, table: TABLE_NAME } }
    );

    if (Array.isArray(columns) && columns.length > 0) {
      await queryInterface.removeColumn(
        { tableName: TABLE_NAME, schema: SCHEMA },
        'cotaProcessoId'
      );
    }
  },
};
