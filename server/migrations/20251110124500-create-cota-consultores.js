'use strict';

const { randomUUID } = require('crypto');

const SCHEMA = process.env.DB_SCHEMA || 'dev';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      { schema: SCHEMA, tableName: 'cota_consultores' },
      {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false
        },
        cotaId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: { schema: SCHEMA, tableName: 'cotas' },
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        consultorId: {
          type: Sequelize.INTEGER,
          allowNull: false,
          references: {
            model: { schema: SCHEMA, tableName: 'consultores' },
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        createdAt: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.fn('NOW')
        },
        updatedAt: {
          allowNull: false,
          type: Sequelize.DATE,
          defaultValue: Sequelize.fn('NOW')
        }
      }
    );

    await queryInterface.addConstraint(
      { schema: SCHEMA, tableName: 'cota_consultores' },
      {
        fields: ['cotaId', 'consultorId'],
        type: 'unique',
        name: 'cota_consultores_cota_consultor_unique'
      }
    );

    const [cotas] = await queryInterface.sequelize.query(
      `SELECT id, "consultorId" as "consultorId" FROM "${SCHEMA}"."cotas" WHERE "consultorId" IS NOT NULL`
    );

    if (Array.isArray(cotas) && cotas.length > 0) {
      const registros = cotas.map((cota) => ({
        id: randomUUID(),
        cotaId: cota.id,
        consultorId: cota.consultorId,
        createdAt: new Date(),
        updatedAt: new Date()
      }));
      await queryInterface.bulkInsert({ schema: SCHEMA, tableName: 'cota_consultores' }, registros);
    }
  },

  async down(queryInterface) {
    await queryInterface.dropTable({ schema: SCHEMA, tableName: 'cota_consultores' });
  }
};
