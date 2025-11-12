'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class CotaConsultor extends Model {
    static associate(models) {
      CotaConsultor.belongsTo(models.Cota, {
        foreignKey: 'cotaId',
        as: 'cota',
        onDelete: 'CASCADE'
      });
      CotaConsultor.belongsTo(models.Consultor, {
        foreignKey: 'consultorId',
        as: 'consultor',
        onDelete: 'CASCADE'
      });
    }
  }

  CotaConsultor.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      cotaId: {
        type: DataTypes.UUID,
        allowNull: false
      },
      consultorId: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      idagendor: {
        type: DataTypes.STRING,
        allowNull: true
      }
    },
    {
      sequelize,
      modelName: 'CotaConsultor',
      tableName: 'cota_consultores',
      schema: process.env.DB_SCHEMA || 'dev'
    }
  );

  return CotaConsultor;
};
