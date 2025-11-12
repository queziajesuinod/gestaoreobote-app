'use strict';
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Cota extends Model {
    static associate(models) {
      Cota.belongsTo(models.Cliente, {
        foreignKey: 'clienteId',
        as: 'cliente'
      });
      Cota.belongsTo(models.Consultor, {
        foreignKey: 'consultorId',
        as: 'consultor'
      });
      Cota.hasOne(models.Contemplacao, {
        foreignKey: 'cotaId',
        as: 'contemplacao',
        onDelete: 'CASCADE'
      });
      if (models.CotaConsultor) {
        Cota.belongsToMany(models.Consultor, {
          through: models.CotaConsultor,
          as: 'consultores',
          foreignKey: 'cotaId',
          otherKey: 'consultorId'
        });
      }
    }
  }

  Cota.init(
    {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
      },
      grupo: {
        type: DataTypes.STRING,
        allowNull: false
      },
      cota: {
        type: DataTypes.STRING
      },
      digito: {
        type: DataTypes.STRING(5),
        allowNull: true
      },
      valor: {
        type: DataTypes.DECIMAL(15, 2)
      },
      valorTotal: {
        type: DataTypes.DECIMAL(15, 2)
      },
      dtaquisicao: {
        type: DataTypes.DATE,
        allowNull: false
      },
      clienteId: {
        type: DataTypes.UUID
      },
      consultorId: {
        type: DataTypes.INTEGER
      },
      idagendor: {
        type: DataTypes.STRING,
        allowNull: false
      },
      administradora: {
        type: DataTypes.STRING,
        allowNull: false
      }
    },
    {
      sequelize,
      modelName: 'Cota',
      tableName: 'cotas',
      schema: process.env.DB_SCHEMA || 'dev'
    }
  );

  return Cota;
};
