'use strict';

module.exports = (sequelize, DataTypes) => {
  const Lead = sequelize.define('Lead', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    consultorId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    nome: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    telefone: {
      type: DataTypes.STRING(20),
      allowNull: false
    },
    email: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    origem: {
      type: DataTypes.ENUM('whatsapp', 'manual', 'importacao'),
      defaultValue: 'manual',
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('novo', 'em_contato', 'qualificado', 'perdido', 'convertido'),
      defaultValue: 'novo',
      allowNull: false
    },
    temperaturaLead: {
      type: DataTypes.INTEGER,
      defaultValue: 50,
      allowNull: false
    },
    sentimentoGeral: {
      type: DataTypes.ENUM('positivo', 'neutro', 'negativo'),
      defaultValue: 'neutro',
      allowNull: false
    },
    resumoIA: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    interesseEm: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    valorDesejado: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true
    },
    prazoDesejado: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    clienteId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    negocioAgendorId: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    evolutionInstanceId: {
      type: DataTypes.UUID,
      allowNull: true
    },
    evolutionSyncEnabled: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    ultimaSincronizacao: {
      type: DataTypes.DATE,
      allowNull: true
    },
    ultimaMensagem: {
      type: DataTypes.DATE,
      allowNull: true
    },
    totalMensagens: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    instrucoesPersonalizadas: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Instruções personalizadas para análise de IA'
    }
  }, {
    tableName: 'leads',
    timestamps: true
  });

  Lead.associate = function(models) {
    Lead.belongsTo(models.Consultor, {
      foreignKey: 'consultorId',
      as: 'consultor'
    });
    Lead.belongsTo(models.Cliente, {
      foreignKey: 'clienteId',
      as: 'cliente'
    });
    Lead.hasMany(models.Conversa, {
      foreignKey: 'leadId',
      as: 'conversas'
    });
    Lead.hasOne(models.LeadAgendor, {
      foreignKey: 'leadId',
      as: 'agendor'
    });
  };

  return Lead;
};
