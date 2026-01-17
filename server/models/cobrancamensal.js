'use strict';

const { Model, DataTypes } = require('sequelize');

const SCHEMA = process.env.DB_SCHEMA || 'dev';

module.exports = (sequelize) => {
  class CobrancaMensal extends Model {
    static associate(models) {
      // Relacionamento com ProcessoCobranca
      this.belongsTo(models.ProcessoCobranca, {
        foreignKey: 'processoCobrancaId',
        as: 'processoCobranca'
      });

      // Relacionamento com Notificações
      this.hasMany(models.NotificacaoCobranca, {
        foreignKey: 'cobrancaMensalId',
        as: 'notificacoes'
      });
    }
  }

  CobrancaMensal.init({
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false
    },
    processoCobrancaId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'processos_cobranca',
        key: 'id'
      }
    },
    mesReferencia: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: 'Primeiro dia do mês de referência (ex: 2024-01-01)'
    },
    valor: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Valor da parcela'
    },
    dataVencimento: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: 'Data de vencimento da parcela'
    },
    status: {
      type: DataTypes.ENUM('pendente', 'atrasado', 'pago', 'cancelado'),
      allowNull: false,
      defaultValue: 'pendente',
      comment: 'Status da cobrança'
    },
    dataPagamento: {
      type: DataTypes.DATEONLY,
      allowNull: true,
      comment: 'Data em que foi pago'
    },
    observacao: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Observações sobre o pagamento'
    },
    ultimaNotificacaoEm: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Data/hora da última notificação enviada'
    },
    totalNotificacoes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      comment: 'Total de notificações enviadas'
    },
    historicoRetroativo: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Flag para identificar se é histórico retroativo'
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
    modelName: 'CobrancaMensal',
    tableName: 'cobrancas_mensais',
    schema: SCHEMA,
    timestamps: true,
    indexes: [
      {
        fields: ['processoCobrancaId']
      },
      {
        fields: ['status']
      },
      {
        fields: ['dataVencimento']
      },
      {
        fields: ['mesReferencia']
      },
      {
        unique: true,
        fields: ['processoCobrancaId', 'mesReferencia'],
        name: 'unique_processo_mes'
      }
    ]
  });

  return CobrancaMensal;
};
