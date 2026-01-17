'use strict';

const SCHEMA = process.env.DB_SCHEMA || 'dev';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable(
      'webhooks_log',
      {
        id: {
          type: Sequelize.UUID,
          defaultValue: Sequelize.UUIDV4,
          primaryKey: true,
          allowNull: false
        },
        cobrancaMensalId: {
          type: Sequelize.UUID,
          allowNull: false,
          references: {
            model: {
              tableName: 'cobrancas_mensais',
              schema: SCHEMA
            },
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'CASCADE'
        },
        tipo: {
          type: Sequelize.ENUM('saida', 'entrada'),
          allowNull: false,
          comment: 'saida = webhook enviado, entrada = callback recebido'
        },
        url: {
          type: Sequelize.STRING(500),
          allowNull: false,
          comment: 'URL do webhook'
        },
        payload: {
          type: Sequelize.JSONB,
          allowNull: false,
          comment: 'Dados enviados/recebidos'
        },
        statusCode: {
          type: Sequelize.INTEGER,
          allowNull: true,
          comment: 'HTTP status code da resposta'
        },
        resposta: {
          type: Sequelize.JSONB,
          allowNull: true,
          comment: 'Resposta recebida'
        },
        erro: {
          type: Sequelize.TEXT,
          allowNull: true,
          comment: 'Mensagem de erro (se houver)'
        },
        tentativa: {
          type: Sequelize.INTEGER,
          allowNull: false,
          defaultValue: 1,
          comment: 'Número da tentativa (para retry)'
        },
        sucesso: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
          comment: 'Se a requisição foi bem-sucedida'
        },
        tempoResposta: {
          type: Sequelize.INTEGER,
          allowNull: true,
          comment: 'Tempo de resposta em milissegundos'
        },
        createdAt: {
          type: Sequelize.DATE,
          allowNull: false,
          defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
        }
      },
      {
        schema: SCHEMA
      }
    );

    // Criar índices
    await queryInterface.addIndex(
      { tableName: 'webhooks_log', schema: SCHEMA },
      ['cobrancaMensalId'],
      { name: 'idx_webhooks_log_cobranca_id' }
    );

    await queryInterface.addIndex(
      { tableName: 'webhooks_log', schema: SCHEMA },
      ['tipo'],
      { name: 'idx_webhooks_log_tipo' }
    );

    await queryInterface.addIndex(
      { tableName: 'webhooks_log', schema: SCHEMA },
      ['sucesso'],
      { name: 'idx_webhooks_log_sucesso' }
    );

    await queryInterface.addIndex(
      { tableName: 'webhooks_log', schema: SCHEMA },
      ['createdAt'],
      { name: 'idx_webhooks_log_created_at' }
    );
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable({ tableName: 'webhooks_log', schema: SCHEMA });
  }
};
