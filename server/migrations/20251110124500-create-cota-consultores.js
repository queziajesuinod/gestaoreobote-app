'use strict';

const { randomUUID } = require('crypto');

const SCHEMA = (process.env.DB_SCHEMA || 'dev').trim();
const TABLE = { schema: SCHEMA, tableName: 'cota_consultores' };
const CONSTRAINT_NAME = 'cota_consultores_cota_consultor_unique';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1) Se a tabela já existe, não recria
    const tableExistsSql = `
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = :schema
        AND table_name = :table
      LIMIT 1
    `;

    const [existsRows] = await queryInterface.sequelize.query(tableExistsSql, {
      replacements: { schema: SCHEMA, table: 'cota_consultores' },
    });

    const tableExists = Array.isArray(existsRows) && existsRows.length > 0;

    if (!tableExists) {
      await queryInterface.createTable(TABLE, {
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
            model: { schema: SCHEMA, tableName: 'cotas' },
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
        },
        consultorId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: { schema: SCHEMA, tableName: 'consultores' },
            key: 'id',
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE',
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
      });
    }

    // 2) Criar constraint UNIQUE só se não existir
    const constraintExistsSql = `
      SELECT 1
      FROM information_schema.table_constraints
      WHERE constraint_schema = :schema
        AND table_name = :table
        AND constraint_name = :constraint
      LIMIT 1
    `;

    const [constraintRows] = await queryInterface.sequelize.query(constraintExistsSql, {
      replacements: { schema: SCHEMA, table: 'cota_consultores', constraint: CONSTRAINT_NAME },
    });

    const constraintExists = Array.isArray(constraintRows) && constraintRows.length > 0;

    if (!constraintExists) {
      await queryInterface.addConstraint(TABLE, {
        fields: ['cotaId', 'consultorId'],
        type: 'unique',
        name: CONSTRAINT_NAME,
      });
    }

    // 3) Migrar dados: inserir e ignorar duplicados (ON CONFLICT DO NOTHING)
    // Isso evita quebrar se já rodou antes.
    await queryInterface.sequelize.query(
      `
      INSERT INTO "${SCHEMA}"."cota_consultores" ("id","cotaId","consultorId","createdAt","updatedAt")
      SELECT gen_random_uuid(), c."id", c."consultorId", NOW(), NOW()
      FROM "${SCHEMA}"."cotas" c
      WHERE c."consultorId" IS NOT NULL
      ON CONFLICT ("cotaId","consultorId") DO NOTHING
      `
    );
  },

  async down(queryInterface) {
    // dropTable já é “tranquilo” se existir; mas o Sequelize pode falhar se não existir.
    // Então checa antes:
    const [existsRows] = await queryInterface.sequelize.query(
      `
      SELECT 1
      FROM information_schema.tables
      WHERE table_schema = :schema
        AND table_name = :table
      LIMIT 1
      `,
      { replacements: { schema: SCHEMA, table: 'cota_consultores' } }
    );

    if (Array.isArray(existsRows) && existsRows.length > 0) {
      await queryInterface.dropTable(TABLE);
    }
  },
};
