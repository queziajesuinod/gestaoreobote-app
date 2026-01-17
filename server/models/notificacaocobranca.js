'use strict';

const { Model, DataTypes } = require('sequelize');

const SCHEMA = process.env.DB_SCHEMA || 'dev';

module.exports = (sequelize) => {
  class NotificacaoCobranca extends Model {
    static associate(models) {
      // Relacionamento com CobrancaMensal
      this.belongsTo(models.CobrancaMensal, {
        foreignKey: 'cobrancaMensalId',
        as: 'cobrancaMensal'
      });

      // Relacionamento com Usuario (responsável pela anotação manual)
      this.belongsTo(models.User, {
        foreignKey: 'usuarioId',
        as: 'usuario'
      });
    }
  }

  NotificacaoCobranca.init({
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
      type: DataTypes.ENUM('automatica', 'manual', 'sistema'),
      allowNull: false,
      comment: 'Tipo de notificação: automatica (webhook), manual (usuário), sistema (ações do sistema)'
    },
    canal: {
      type: DataTypes.ENUM('webhook', 'ligacao', 'whatsapp_manual', 'email', 'observacao', 'sistema'),
      allowNull: false,
      comment: 'Canal de comunicação utilizado'
    },
    status: {
      type: DataTypes.ENUM('enviando', 'enviada', 'falha', 'lido', 'respondido', 'pago'),
      allowNull: false,
      comment: 'Status da notificação'
    },
    mensagemId: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'ID retornado pelo sistema externo (webhook callback)'
    },
    mensagem: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Texto da anotação (se manual) ou mensagem de erro'
    },
    usuarioId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'users',
        key: 'id'
      },
      comment: 'Responsável pela anotação (se manual)'
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
    modelName: 'NotificacaoCobranca',
    tableName: 'notificacoes_cobranca',
    schema: SCHEMA,
    timestamps: true,
    indexes: [
      {
        fields: ['cobrancaMensalId']
      },
      {
        fields: ['tipo']
      },
      {
        fields: ['status']
      },
      {
        fields: ['createdAt']
      }
    ]
  });

  return NotificacaoCobranca;
};
