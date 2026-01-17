'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const schema = process.env.DB_SCHEMA || 'dev';
    
    await queryInterface.createTable('lead_agendor', {
      id: {
        type: Sequelize.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true
      },
      leadId: {
        type: Sequelize.UUID,
        allowNull: false,
        unique: true,
        references: {
          model: { tableName: 'leads', schema },
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      negocioId: {
        type: Sequelize.STRING(50),
        allowNull: false
      },
      negocioNome: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      valorNegocio: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: true
      },
      funilId: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      funilNome: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      estagioId: {
        type: Sequelize.STRING(50),
        allowNull: true
      },
      estagioNome: {
        type: Sequelize.STRING(255),
        allowNull: true
      },
      totalTarefas: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false
      },
      tarefasPendentes: {
        type: Sequelize.INTEGER,
        defaultValue: 0,
        allowNull: false
      },
      proximaTarefa: {
        type: Sequelize.DATE,
        allowNull: true
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
      { tableName: 'lead_agendor', schema },
      ['leadId'],
      { name: 'idx_lead_agendor_lead', unique: true }
    );
    
    await queryInterface.addIndex(
      { tableName: 'lead_agendor', schema },
      ['negocioId'],
      { name: 'idx_lead_agendor_negocio' }
    );
  },

  down: async (queryInterface, Sequelize) => {
    const schema = process.env.DB_SCHEMA || 'dev';
    await queryInterface.dropTable({ tableName: 'lead_agendor', schema });
  }
};
