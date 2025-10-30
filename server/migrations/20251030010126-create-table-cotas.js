'use strict';

/** @type {import('sequelize-cli').Migration} */

const SCHEMA = process.env.DB_SCHEMA || 'dev';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`CREATE SCHEMA IF NOT EXISTS ${SCHEMA};`);

    // Cria a tabela "Perfis"
    await queryInterface.createTable(
      { schema: SCHEMA, tableName: 'cotas' },
      {
        id: {
          allowNull: false,
          primaryKey: true,
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4
        },
        grupo: {
          type: Sequelize.STRING,
          allowNull: false
        },
        cota: {
          type: Sequelize.STRING
        },
        valor: {
          type: Sequelize.NUMERIC
        },
        valorTotal: {
          type: Sequelize.NUMERIC
        },
        dtaquisicao: {
          type: Sequelize.DATE,
          allowNull: false
        },
        clienteId: {
          type: Sequelize.UUID,
          references: {
            model: { schema: SCHEMA, tableName: 'clientes' },
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        consultorId: {
          type: Sequelize.INTEGER,
          references: {
            model: { schema: SCHEMA, tableName: 'consultores' },
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        idagendor: {
          type: Sequelize.STRING,
          allowNull: false
        },
        administradora: {
          type: Sequelize.STRING,
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
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable({ schema: SCHEMA, tableName: 'clientes' });
  }
};
