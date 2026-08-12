'use strict';
const { Model } = require('sequelize');
const resolveSchema = require('../config/schema');
const SCHEMA = resolveSchema('dev');

module.exports = (sequelize, DataTypes) => {
  class AssistenteAcao extends Model {
    static associate(models) {
      if (models.Consultor) {
        AssistenteAcao.belongsTo(models.Consultor, { foreignKey: 'consultorId', as: 'consultor' });
      }
    }
  }

  AssistenteAcao.init(
    {
      id: { type: DataTypes.UUID, primaryKey: true, allowNull: false, defaultValue: DataTypes.UUIDV4 },
      consultorId: { type: DataTypes.INTEGER, allowNull: true },
      consultorNome: { type: DataTypes.STRING, allowNull: true },
      telefone: { type: DataTypes.STRING, allowNull: true },
      clienteNome: { type: DataTypes.STRING, allowNull: true },
      dealId: { type: DataTypes.BIGINT, allowNull: true },
      taskId: { type: DataTypes.BIGINT, allowNull: true },
      acao: { type: DataTypes.STRING, allowNull: false },
      tarefaTipo: { type: DataTypes.STRING, allowNull: true },
      detalhe: { type: DataTypes.JSONB || DataTypes.JSON, allowNull: true }
    },
    { sequelize, modelName: 'AssistenteAcao', tableName: 'assistente_acoes', schema: SCHEMA }
  );

  return AssistenteAcao;
};
