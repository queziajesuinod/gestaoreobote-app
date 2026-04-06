'use strict';

const { Model, DataTypes } = require('sequelize');

const SCHEMA = (process.env.DB_SCHEMA || 'dev').trim();

module.exports = (sequelize) => {
  class ConfiguracaoCobranca extends Model {
    static associate(models) {
      // Nenhum relacionamento específico ainda
    }
  }

  ConfiguracaoCobranca.init({
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false
    },
    nome: {
      type: DataTypes.STRING(150),
      allowNull: false,
      defaultValue: 'Configuração de Cobrança'
    },
    modo: {
      type: DataTypes.ENUM('diaria', 'semanal', 'dia_sim_dia_nao'),
      allowNull: false,
      defaultValue: 'diaria',
      comment: 'Define a cadência de detecção'
    },
    diasSemana: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Dias em que a detecção roda quando o modo é semanal'
    },
    ultimaExecucao: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Última execução da detecção automática'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    },
    updatedAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'ConfiguracaoCobranca',
    tableName: 'configuracoes_cobranca',
    schema: SCHEMA,
    timestamps: true
  });

  return ConfiguracaoCobranca;
};
