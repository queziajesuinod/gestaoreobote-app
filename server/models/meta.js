'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const SCHEMA = process.env.DB_SCHEMA || 'dev';

  class Meta extends Model {
    static associate() {
      // no associations
    }
  }

  Meta.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    descricao: {
      type: DataTypes.STRING,
      allowNull: true
    },
    valor: {
      type: DataTypes.DECIMAL(15, 2),
      allowNull: false
    },
    dataInicio: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    dataFim: {
      type: DataTypes.DATEONLY,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Meta',
    tableName: 'metas',
    schema: SCHEMA,
    timestamps: true
  });

  return Meta;
};
