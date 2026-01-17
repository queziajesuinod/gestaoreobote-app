'use strict';

const { Model, DataTypes } = require('sequelize');

const SCHEMA = process.env.DB_SCHEMA || 'dev';

module.exports = (sequelize) => {
  class WebhookLog extends Model {
    static associate(models) {
      // Relacionamento com CobrancaMensal
      this.belongsTo(models.CobrancaMensal, {
        foreignKey: 'cobrancaMensalId',
        as: 'cobrancaMensal'
      });
    }
  }

  WebhookLog.init({
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false
    },
    cobrancaMensalId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'cobrancas_mensais',
        key: 'id'
      }
    },
    tipo: {
      type: DataTypes.ENUM('saida', 'entrada'),
      allowNull: false,
      comment: 'saida = webhook enviado, entrada = callback recebido'
    },
    url: {
      type: DataTypes.STRING(500),
      allowNull: false,
      comment: 'URL do webhook'
    },
    payload: {
      type: DataTypes.JSONB,
      allowNull: false,
      comment: 'Dados enviados/recebidos'
    },
    statusCode: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'HTTP status code da resposta'
    },
    resposta: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Resposta recebida'
    },
    erro: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Mensagem de erro (se houver)'
    },
    tentativa: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      comment: 'Número da tentativa (para retry)'
    },
    sucesso: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Se a requisição foi bem-sucedida'
    },
    tempoResposta: {
      type: DataTypes.INTEGER,
      allowNull: true,
      comment: 'Tempo de resposta em milissegundos'
    },
    createdAt: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    sequelize,
    modelName: 'WebhookLog',
    tableName: 'webhooks_log',
    schema: SCHEMA,
    timestamps: false,
    indexes: [
      {
        fields: ['cobrancaMensalId']
      },
      {
        fields: ['tipo']
      },
      {
        fields: ['sucesso']
      },
      {
        fields: ['createdAt']
      }
    ]
  });

  return WebhookLog;
};
