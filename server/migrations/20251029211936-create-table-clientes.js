'use strict';

/** @type {import('sequelize-cli').Migration} */

const SCHEMA = (process.env.DB_SCHEMA || 'dev').trim();

module.exports = {
  async up (queryInterface, Sequelize) {
    await queryInterface.sequelize.query(`CREATE SCHEMA IF NOT EXISTS ${SCHEMA};`);

    // Cria a tabela "Perfis"
    await queryInterface.createTable(
      { schema: SCHEMA, tableName: 'clientes' },
      {
        id: {
          allowNull: false,
          primaryKey: true,
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4
        },
        nome: {
          type: Sequelize.STRING,
          allowNull: false
        },
         cpf: {
          type: Sequelize.STRING
        },
         cidade: {
          type: Sequelize.STRING
        },
         estado: {
          type: Sequelize.ENUM('AC', 'AL', 'AP', 'AM', 'BA', 'CE', 'DF', 'ES', 'GO', 'MA', 'MT', 'MS', 'MG', 'PA', 'PB', 'PR', 'PE', 'PI', 'RJ', 'RN', 'RS', 'RO', 'RR', 'SC', 'SP', 'SE', 'TO')
        },
         dtnascimento: {
          type: Sequelize.DATE,
          allowNull: false
        },
         profissao: {
          type: Sequelize.STRING
        },
         celular: {
          type: Sequelize.STRING,
          allowNull: false
        },
         email: {
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

  async down (queryInterface, Sequelize) {
    await queryInterface.dropTable({ schema: SCHEMA, tableName: 'clientes' });
  }
};
