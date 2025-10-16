'use strict';
const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class Equipe extends Model {
    static associate(models) {
      if (models.Integrante) {
        Equipe.hasMany(models.Integrante, { foreignKey: 'equipeId' });
      }
    }
  }

  Equipe.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4, // 🔥 Gera automaticamente o ID
        allowNull: false,
        primaryKey: true,
      },
      descricao: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    },
    {
      sequelize,
      modelName: 'Equipe',
      tableName: 'equipes',
      schema: process.env.DB_SCHEMA || 'dev',
    }
  );

  return Equipe;
};
