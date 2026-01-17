'use strict';

const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  const SCHEMA = (process.env.DB_SCHEMA || 'dev').trim();

  class Contemplacao extends Model {
    static associate(models) {
      Contemplacao.belongsTo(models.Cota, {
        foreignKey: 'cotaId',
        as: 'cota'
      });
    }
  }

  Contemplacao.init({
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    cotaId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    dataContemplacao: {
      type: DataTypes.DATEONLY,
      allowNull: false
    },
    tipo: {
      type: DataTypes.ENUM('LANCE', 'SORTEIO'),
      allowNull: false
    },
    observacao: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'Contemplacao',
    tableName: 'contemplacoes',
    schema: SCHEMA,
    timestamps: true
  });

  return Contemplacao;
};
