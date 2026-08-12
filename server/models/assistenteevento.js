'use strict';
const { Model } = require('sequelize');
const resolveSchema = require('../config/schema');
const SCHEMA = resolveSchema('dev');

module.exports = (sequelize, DataTypes) => {
  class AssistenteEvento extends Model {}

  AssistenteEvento.init(
    {
      id: { type: DataTypes.UUID, primaryKey: true, allowNull: false, defaultValue: DataTypes.UUIDV4 },
      telefone: { type: DataTypes.STRING, allowNull: true },
      pushName: { type: DataTypes.STRING, allowNull: true },
      tipo: { type: DataTypes.STRING, allowNull: true },
      texto: { type: DataTypes.TEXT, allowNull: true },
      resultado: { type: DataTypes.STRING, allowNull: false },
      motivo: { type: DataTypes.STRING, allowNull: true },
      respondeu: { type: DataTypes.BOOLEAN, allowNull: true, defaultValue: false },
      resposta: { type: DataTypes.TEXT, allowNull: true }
    },
    { sequelize, modelName: 'AssistenteEvento', tableName: 'assistente_eventos', schema: SCHEMA }
  );

  return AssistenteEvento;
};
