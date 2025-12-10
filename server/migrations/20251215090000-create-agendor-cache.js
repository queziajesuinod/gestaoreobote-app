'use strict';

const SCHEMA = process.env.DB_SCHEMA || 'dev';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`CREATE SCHEMA IF NOT EXISTS ${SCHEMA};`);

    await queryInterface.createTable(
      { schema: SCHEMA, tableName: 'agendor_cache' },
      {
        id: {
          allowNull: false,
          primaryKey: true,
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4
        },
        hashParams: {
          type: Sequelize.STRING,
          allowNull: false,
          unique: true
        },
        tokenSuffix: {
          type: Sequelize.STRING,
          allowNull: true
        },
        tipo: {
          type: Sequelize.STRING,
          allowNull: false
        },
        inicio: {
          type: Sequelize.DATEONLY,
          allowNull: false
        },
        fim: {
          type: Sequelize.DATEONLY,
          allowNull: true
        },
        dealStatus: {
          type: Sequelize.STRING,
          allowNull: true
        },
        payload: {
          type: Sequelize.JSONB || Sequelize.JSON,
          allowNull: false
        },
        expiresAt: {
          type: Sequelize.DATE,
          allowNull: false
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

    await queryInterface.addIndex(
      { schema: SCHEMA, tableName: 'agendor_cache' },
      ['tipo', 'tokenSuffix', 'inicio', 'fim']
    );
  },

  async down(queryInterface) {
    await queryInterface.dropTable({ schema: SCHEMA, tableName: 'agendor_cache' });
  }
};
