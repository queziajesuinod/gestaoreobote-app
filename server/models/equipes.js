'use strict';
const { Model, DataTypes } = require('sequelize');
const resolveSchema = require('../config/schema');
const SCHEMA = resolveSchema('dev');

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
      schema: SCHEMA,
    }
  );

  return Equipe;
};
