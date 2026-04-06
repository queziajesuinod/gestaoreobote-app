'use strict';

const SCHEMA = (process.env.DB_SCHEMA || 'dev').trim();

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable(
      'configuracoes_webhook',
      {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false
        },
        nome: {
          type: Sequelize.STRING(100),
          allowNull: false,
          comment: 'Nome da configuração'
        },
        url: {
          type: Sequelize.STRING(500),
          allowNull: false,
          comment: 'URL do webhook'
        },
        metodo: {
          type: Sequelize.ENUM('POST', 'PUT'),
          allowNull: false,
          defaultValue: 'POST',
          comment: 'Método HTTP'
        },
        headers: {
          type: Sequelize.JSONB,
          allowNull: true,
          comment: 'Headers customizados'
        },
        secretKey: {
          type: Sequelize.STRING(255),
          allowNull: true,
          comment: 'Chave secreta para assinatura HMAC'
        },
        ativo: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: true,
          comment: 'Se o webhook está ativo'
        },
        maxTentativas: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 4,
          comment: 'Número máximo de tentativas em caso de falha'
        },
        timeout: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 30000,
          comment: 'Timeout em milissegundos'
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        },
        updatedAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        }
      },
      {
        schema: SCHEMA
      }
    );

    // Criar índice
    await queryInterface.addIndex(
      { tableName: 'configuracoes_webhook', schema: SCHEMA },
      ['ativo'],
      { name: 'idx_configuracoes_webhook_ativo' }
    );
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable({ tableName: 'configuracoes_webhook', schema: SCHEMA });
  }
};
