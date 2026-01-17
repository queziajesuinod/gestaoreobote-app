'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const schema = process.env.DB_SCHEMA || 'dev';
    
    await queryInterface.createTable('conversas', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      leadId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: { tableName: 'leads', schema },
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      consultorId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: { tableName: 'consultores', schema },
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'RESTRICT'
      },
      plataforma: {
        type: Sequelize.ENUM('whatsapp', 'telegram', 'manual'),
        defaultValue: 'whatsapp',
        allowNull: false
      },
      chatId: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'ID do chat no WhatsApp/Telegram'
      },
      status: {
        type: Sequelize.ENUM('ativa', 'arquivada'),
        defaultValue: 'ativa',
        allowNull: false
      },
      ultimaMensagem: {
        type: Sequelize.DATE,
        allowNull: true
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
      }
    }, { schema });
    
    // Índices
    await queryInterface.addIndex(
      { tableName: 'conversas', schema },
      ['leadId'],
      { name: 'idx_conversas_lead' }
    );
    
    await queryInterface.addIndex(
      { tableName: 'conversas', schema },
      ['consultorId'],
      { name: 'idx_conversas_consultor' }
    );
    
    await queryInterface.addIndex(
      { tableName: 'conversas', schema },
      ['chatId'],
      { name: 'idx_conversas_chatid' }
    );
  },

  down: async (queryInterface, Sequelize) => {
    const schema = process.env.DB_SCHEMA || 'dev';
    await queryInterface.dropTable({ tableName: 'conversas', schema });
  }
};
