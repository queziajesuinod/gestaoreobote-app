'use strict';

/** @type {import('sequelize-cli').Migration} */

const SCHEMA = (process.env.DB_SCHEMA || 'dev').trim();

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`CREATE SCHEMA IF NOT EXISTS ${SCHEMA};`);

    // Cria a tabela "Perfis"
    await queryInterface.createTable(
      { schema: SCHEMA, tableName: 'equipes' },
      {
        id: {
          allowNull: false,
          primaryKey: true,
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4
        },
        descricao: {
          type: Sequelize.STRING
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

    await queryInterface.createTable(
      { schema: SCHEMA, tableName: 'integrantes' },
      {
        id: {
          allowNull: false,
          primaryKey: true,
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4
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
         equipeId: {
          type: Sequelize.UUID,
          references: {
            model: { schema: SCHEMA, tableName: 'equipes' },
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
        },
        funcao: {
          type: Sequelize.ENUM('Lider', 'Integrante'),
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

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable({ schema: SCHEMA, tableName: 'integrantes' });
    await queryInterface.dropTable({ schema: SCHEMA, tableName: 'equipes' });
  }
};
