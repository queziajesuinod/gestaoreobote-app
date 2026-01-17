'use strict';

const { Model, DataTypes } = require('sequelize');

const SCHEMA = process.env.DB_SCHEMA || 'dev';

module.exports = (sequelize) => {
  class ConfiguracaoWebhook extends Model {
    static associate(models) {
      // Sem relacionamentos diretos
    }
  }

  ConfiguracaoWebhook.init({
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false
    },
    nome: {
      type: DataTypes.STRING(100),
      allowNull: false,
      comment: 'Nome da configuração'
    },
    url: {
      type: DataTypes.STRING(500),
      allowNull: false,
      comment: 'URL do webhook'
    },
    metodo: {
      type: DataTypes.ENUM('POST', 'PUT'),
      allowNull: false,
      defaultValue: 'POST',
      comment: 'Método HTTP'
    },
    headers: {
      type: DataTypes.JSONB,
      allowNull: true,
      comment: 'Headers customizados'
    },
    secretKey: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Chave secreta para assinatura HMAC'
    },
    ativo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
      comment: 'Se o webhook está ativo'
    },
    maxTentativas: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 4,
      comment: 'Número máximo de tentativas em caso de falha'
    },
    timeout: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 30000,
      comment: 'Timeout em milissegundos'
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
    modelName: 'ConfiguracaoWebhook',
    tableName: 'configuracoes_webhook',
    schema: SCHEMA,
    timestamps: true,
    indexes: [
      {
        fields: ['ativo']
      }
    ]
  });

  return ConfiguracaoWebhook;
};
