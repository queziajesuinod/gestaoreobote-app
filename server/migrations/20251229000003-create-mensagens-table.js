'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const schema = process.env.DB_SCHEMA || 'dev';
    
    await queryInterface.createTable('mensagens', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      conversaId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: { tableName: 'conversas', schema },
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      remetente: {
        type: Sequelize.ENUM('consultor', 'lead'),
        allowNull: false
      },
      conteudo: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      tipoMidia: {
        type: Sequelize.ENUM('texto', 'audio', 'imagem', 'documento', 'video'),
        defaultValue: 'texto',
        allowNull: false
      },
      urlMidia: {
        type: Sequelize.STRING(500),
        allowNull: true
      },
      transcricao: {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Transcrição de áudio'
      },
      analisadaPorIA: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },
      evolutionMessageId: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'ID da mensagem no Evolution API'
      },
      timestamp: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.NOW
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
      { tableName: 'mensagens', schema },
      ['conversaId', 'timestamp'],
      { name: 'idx_mensagens_conversa_timestamp' }
    );
    
    await queryInterface.addIndex(
      { tableName: 'mensagens', schema },
      ['evolutionMessageId'],
      { name: 'idx_mensagens_evolution_id', unique: true }
    );
    
    await queryInterface.addIndex(
      { tableName: 'mensagens', schema },
      ['analisadaPorIA'],
      { name: 'idx_mensagens_analisada' }
    );
  },

  down: async (queryInterface, Sequelize) => {
    const schema = process.env.DB_SCHEMA || 'dev';
    await queryInterface.dropTable({ tableName: 'mensagens', schema });
  }
};
