'use strict';
const { Model } = require('sequelize');
const resolveSchema = require('../config/schema');
const SCHEMA = resolveSchema('dev');

module.exports = (sequelize, DataTypes) => {
  class AssistenteSessao extends Model {
    static associate(models) {
      if (models.Consultor) {
        AssistenteSessao.belongsTo(models.Consultor, { foreignKey: 'consultorId', as: 'consultor' });
      }
    }
  }

  AssistenteSessao.init(
    {
      id: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: DataTypes.UUIDV4
      },
      telefone: {
        type: DataTypes.STRING,
        allowNull: false
      },
      consultorId: {
        type: DataTypes.INTEGER,
        allowNull: true
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'aguardando_confirmacao'
      },
      payload: {
        type: DataTypes.JSONB || DataTypes.JSON,
        allowNull: true
      },
      candidatos: {
        type: DataTypes.JSONB || DataTypes.JSON,
        allowNull: true
      },
      mensagemOriginal: {
        type: DataTypes.TEXT,
        allowNull: true
      },
      expiresAt: {
        type: DataTypes.DATE,
        allowNull: false
      }
    },
    {
      sequelize,
      modelName: 'AssistenteSessao',
      tableName: 'assistente_sessoes',
      schema: SCHEMA
    }
  );

  return AssistenteSessao;
};
