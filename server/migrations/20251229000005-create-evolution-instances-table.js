'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const schema = process.env.DB_SCHEMA || 'dev';
    
    await queryInterface.createTable('evolution_instances', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      consultorId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: {
          model: { tableName: 'consultores', schema },
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      instanceName: {
        type: Sequelize.STRING(100),
        allowNull: false
      },
      apiUrl: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      apiKey: {
        type: Sequelize.TEXT,
        allowNull: false,
        comment: 'API Key criptografada'
      },
      status: {
        type: Sequelize.ENUM('conectada', 'desconectada', 'erro'),
        defaultValue: 'desconectada',
        allowNull: false
      },
      ultimaConexao: {
        type: Sequelize.DATE,
        allowNull: true
      },
      sincronizarAutomaticamente: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
        allowNull: false
      },
      sincronizarApenas: {
        type: Sequelize.ENUM('nao_lidas', 'todas', 'ultimas_24h'),
        defaultValue: 'nao_lidas',
        allowNull: false
      },
      ultimaSincronizacao: {
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
      { tableName: 'evolution_instances', schema },
      ['consultorId'],
      { name: 'idx_evolution_consultor', unique: true }
    );
  },

  down: async (queryInterface, Sequelize) => {
    const schema = process.env.DB_SCHEMA || 'dev';
    await queryInterface.dropTable({ tableName: 'evolution_instances', schema });
  }
};
