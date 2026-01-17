'use strict';

module.exports = (sequelize, DataTypes) => {
  const LeadAgendor = sequelize.define('LeadAgendor', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    leadId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true
    },
    negocioId: {
      type: DataTypes.STRING(50),
      allowNull: false
    },
    negocioNome: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    valorNegocio: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: true
    },
    funilId: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    funilNome: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    estagioId: {
      type: DataTypes.STRING(50),
      allowNull: true
    },
    estagioNome: {
      type: DataTypes.STRING(255),
      allowNull: true
    },
    totalTarefas: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    tarefasPendentes: {
      type: DataTypes.INTEGER,
      defaultValue: 0,
      allowNull: false
    },
    proximaTarefa: {
      type: DataTypes.DATE,
      allowNull: true
    },
    ultimaSincronizacao: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'lead_agendor',
    timestamps: true
  });

  LeadAgendor.associate = function(models) {
    LeadAgendor.belongsTo(models.Lead, {
      foreignKey: 'leadId',
      as: 'lead'
    });
  };

  return LeadAgendor;
};
