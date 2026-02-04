'use strict';

const SCHEMA = (process.env.DB_SCHEMA || 'dev').trim();

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const TABLE_NAME = 'processos_cobranca';

    // 1) Adicionar coluna 'nome' se não existir
    const [nomeColumn] = await queryInterface.sequelize.query(
      `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = :schema
        AND table_name = :table
        AND column_name = 'nome'
      `,
      { replacements: { schema: SCHEMA, table: TABLE_NAME } }
    );

    if (!Array.isArray(nomeColumn) || nomeColumn.length === 0) {
      console.log('[Migration] Adicionando coluna nome em processos_cobranca...');

      await queryInterface.addColumn(
        { tableName: TABLE_NAME, schema: SCHEMA },
        'nome',
        {
          type: Sequelize.STRING(255),
          allowNull: true,
          comment: 'Nome descritivo do processo',
        }
      );

      console.log('[Migration] Coluna nome adicionada com sucesso!');
    } else {
      console.log('[Migration] Coluna nome já existe. Pulando...');
    }

    // 2) Adicionar coluna 'tipo' se não existir
    const [tipoColumn] = await queryInterface.sequelize.query(
      `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = :schema
        AND table_name = :table
        AND column_name = 'tipo'
      `,
      { replacements: { schema: SCHEMA, table: TABLE_NAME } }
    );

    if (!Array.isArray(tipoColumn) || tipoColumn.length === 0) {
      console.log('[Migration] Adicionando coluna tipo em processos_cobranca...');

      // Primeiro criar o ENUM type se não existir
      await queryInterface.sequelize.query(
        `
        DO $$ BEGIN
          CREATE TYPE "${SCHEMA}"."enum_processos_cobranca_tipo" AS ENUM ('unico', 'multiplo');
        EXCEPTION
          WHEN duplicate_object THEN null;
        END $$;
        `
      );

      await queryInterface.addColumn(
        { tableName: TABLE_NAME, schema: SCHEMA },
        'tipo',
        {
          type: Sequelize.ENUM('unico', 'multiplo'),
          allowNull: false,
          defaultValue: 'unico',
          comment: 'Tipo do processo (unico = 1 cota, multiplo = N cotas)',
        }
      );

      console.log('[Migration] Coluna tipo adicionada com sucesso!');
    } else {
      console.log('[Migration] Coluna tipo já existe. Pulando...');
    }

    // 3) Atualizar processos existentes com nome padrão
    console.log('[Migration] Atualizando processos existentes com nome padrão...');

    await queryInterface.sequelize.query(
      `
      UPDATE "${SCHEMA}"."processos_cobranca" p
      SET nome = CONCAT('Processo - Cota ', c.cota)
      FROM "${SCHEMA}"."cotas" c
      WHERE p."cotaId" = c.id
      AND (p.nome IS NULL OR p.nome = '')
      `
    );

    console.log('[Migration] Processos atualizados com sucesso!');
  },

  down: async (queryInterface) => {
    const TABLE_NAME = 'processos_cobranca';

    // Remover coluna tipo
    const [tipoColumn] = await queryInterface.sequelize.query(
      `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = :schema
        AND table_name = :table
        AND column_name = 'tipo'
      `,
      { replacements: { schema: SCHEMA, table: TABLE_NAME } }
    );

    if (Array.isArray(tipoColumn) && tipoColumn.length > 0) {
      await queryInterface.removeColumn(
        { tableName: TABLE_NAME, schema: SCHEMA },
        'tipo'
      );

      // Remover ENUM type
      await queryInterface.sequelize.query(
        `DROP TYPE IF EXISTS "${SCHEMA}"."enum_processos_cobranca_tipo"`
      );
    }

    // Remover coluna nome
    const [nomeColumn] = await queryInterface.sequelize.query(
      `
      SELECT column_name
      FROM information_schema.columns
      WHERE table_schema = :schema
        AND table_name = :table
        AND column_name = 'nome'
      `,
      { replacements: { schema: SCHEMA, table: TABLE_NAME } }
    );

    if (Array.isArray(nomeColumn) && nomeColumn.length > 0) {
      await queryInterface.removeColumn(
        { tableName: TABLE_NAME, schema: SCHEMA },
        'nome'
      );
    }
  },
};
