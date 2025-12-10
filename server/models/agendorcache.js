'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class AgendorCache extends Model {}

  AgendorCache.init(
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4
      },
      hashParams: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      },
      tokenSuffix: {
        type: DataTypes.STRING,
        allowNull: true
      },
      tipo: {
        type: DataTypes.STRING,
        allowNull: false
      },
      inicio: {
        type: DataTypes.DATEONLY,
        allowNull: false
      },
      fim: {
        type: DataTypes.DATEONLY,
        allowNull: true
      },
      dealStatus: {
        type: DataTypes.STRING,
        allowNull: true
      },
      payload: {
        type: DataTypes.JSONB || DataTypes.JSON,
        allowNull: false
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: false
      }
    },
    {
      sequelize,
      modelName: 'AgendorCache',
      tableName: 'agendor_cache',
      schema: process.env.DB_SCHEMA || 'dev'
    }
  );

  return AgendorCache;
};
