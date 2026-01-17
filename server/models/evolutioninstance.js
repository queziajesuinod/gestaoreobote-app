'use strict';

module.exports = (sequelize, DataTypes) => {
  const EvolutionInstance = sequelize.define('EvolutionInstance', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    consultorId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      unique: true
    },
    instanceName: {
      type: DataTypes.STRING(100),
      allowNull: false
    },
    apiUrl: {
      type: DataTypes.STRING(255),
      allowNull: false
    },
    apiKey: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    status: {
      type: DataTypes.ENUM('conectada', 'desconectada', 'erro'),
      defaultValue: 'desconectada',
      allowNull: false
    },
    ultimaConexao: {
      type: DataTypes.DATE,
      allowNull: true
    },
    sincronizarAutomaticamente: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
      allowNull: false
    },
    sincronizarApenas: {
      type: DataTypes.ENUM('nao_lidas', 'todas', 'ultimas_24h'),
      defaultValue: 'nao_lidas',
      allowNull: false
    },
    ultimaSincronizacao: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'evolution_instances',
    timestamps: true
  });

  EvolutionInstance.associate = function(models) {
    EvolutionInstance.belongsTo(models.Consultor, {
      foreignKey: 'consultorId',
      as: 'consultor'
    });
  };

  return EvolutionInstance;
};
