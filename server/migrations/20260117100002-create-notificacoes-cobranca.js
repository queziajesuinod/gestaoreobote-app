'use strict';

const SCHEMA = process.env.DB_SCHEMA || 'dev';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable(
      'notificacoes_cobranca',
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
          type: Sequelize.ENUM('automatica', 'manual', 'sistema'),
          allowNull: false,
          comment: 'Tipo de notificação'
        },
        canal: {
          type: Sequelize.ENUM('webhook', 'ligacao', 'whatsapp_manual', 'email', 'observacao', 'sistema'),
          allowNull: false,
          comment: 'Canal de comunicação utilizado'
        },
        status: {
          type: Sequelize.ENUM('enviando', 'enviada', 'falha', 'lido', 'respondido', 'pago'),
          allowNull: false,
          comment: 'Status da notificação'
        },
        mensagemId: {
          type: Sequelize.STRING(255),
          allowNull: true,
          comment: 'ID retornado pelo sistema externo'
        },
        mensagem: {
          type: Sequelize.TEXT,
          allowNull: true,
          comment: 'Texto da anotação ou mensagem de erro'
        },
        usuarioId: {
          type: Sequelize.INTEGER,
          allowNull: true,
          references: {
            model: {
              tableName: 'users',
              schema: SCHEMA
            },
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL',
          comment: 'Responsável pela anotação (se manual)'
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

    // Criar índices
    await queryInterface.addIndex(
      { tableName: 'notificacoes_cobranca', schema: SCHEMA },
      ['cobrancaMensalId'],
      { name: 'idx_notificacoes_cobranca_cobranca_id' }
    );

    await queryInterface.addIndex(
      { tableName: 'notificacoes_cobranca', schema: SCHEMA },
      ['tipo'],
      { name: 'idx_notificacoes_cobranca_tipo' }
    );

    await queryInterface.addIndex(
      { tableName: 'notificacoes_cobranca', schema: SCHEMA },
      ['status'],
      { name: 'idx_notificacoes_cobranca_status' }
    );

    await queryInterface.addIndex(
      { tableName: 'notificacoes_cobranca', schema: SCHEMA },
      ['createdAt'],
      { name: 'idx_notificacoes_cobranca_created_at' }
    );
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable({ tableName: 'notificacoes_cobranca', schema: SCHEMA });
  }
};
