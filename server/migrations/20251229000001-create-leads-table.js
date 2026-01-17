'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const schema = process.env.DB_SCHEMA || 'dev';
    
    await queryInterface.createTable('leads', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
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
      nome: {
        type: Sequelize.STRING(255),
        allowNull: false
      },
      telefone: {
        type: Sequelize.STRING(20),
        allowNull: false
      },
      email: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      origem: {
        type: Sequelize.ENUM('whatsapp', 'manual', 'importacao'),
        defaultValue: 'manual',
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('novo', 'em_contato', 'qualificado', 'perdido', 'convertido'),
        defaultValue: 'novo',
        allowNull: false
      },
      temperaturaLead: {
        type: Sequelize.INTEGER,
        defaultValue: 50,
        allowNull: false
      },
      sentimentoGeral: {
        type: Sequelize.ENUM('positivo', 'neutro', 'negativo'),
        defaultValue: 'neutro',
        allowNull: false
      },
      resumoIA: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      interesseEm: {
        type: Sequelize.STRING(100),
        allowNull: true,
        comment: 'imovel, automovel, servico'
      },
      valorDesejado: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      prazoDesejado: {
        type: Sequelize.INTEGER,
        allowNull: true,
        comment: 'Prazo em meses'
      },
      clienteId: {
        type: Sequelize.UUID,
        allowNull: true,
        references: {
          model: { tableName: 'clientes', schema },
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      negocioAgendorId: {
        type: Sequelize.STRING(50),
        allowNull: true,
        comment: 'ID do negócio no Agendor'
      },
      evolutionInstanceId: {
        type: Sequelize.UUID,
        allowNull: true
      },
      evolutionSyncEnabled: {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
        allowNull: false
      },
      ultimaSincronizacao: {
        type: Sequelize.DATE,
        allowNull: true
      },
      ultimaMensagem: {
        type: Sequelize.DATE,
        allowNull: true
      },
      totalMensagens: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false
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
    
    // Índices para performance
    await queryInterface.addIndex(
      { tableName: 'leads', schema },
      ['consultorId', 'status'],
      { name: 'idx_leads_consultor_status' }
    );
    
    await queryInterface.addIndex(
      { tableName: 'leads', schema },
      ['telefone', 'consultorId'],
      { name: 'idx_leads_telefone_consultor', unique: true }
    );
    
    await queryInterface.addIndex(
      { tableName: 'leads', schema },
      ['temperaturaLead'],
      { name: 'idx_leads_temperatura' }
    );
    
    await queryInterface.addIndex(
      { tableName: 'leads', schema },
      ['ultimaMensagem'],
      { name: 'idx_leads_ultima_mensagem' }
    );
  },

  down: async (queryInterface, Sequelize) => {
    const schema = process.env.DB_SCHEMA || 'dev';
    await queryInterface.dropTable({ tableName: 'leads', schema });
  }
};
