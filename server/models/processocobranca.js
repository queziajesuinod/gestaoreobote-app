'use strict';

const { Model, DataTypes } = require('sequelize');

const SCHEMA = process.env.DB_SCHEMA || 'dev';

module.exports = (sequelize) => {
  class ProcessoCobranca extends Model {
    static associate(models) {
      // Relacionamento com Cota
      this.belongsTo(models.Cota, {
        foreignKey: 'cotaId',
        as: 'cota'
      });

      // Relacionamento com Cobranças Mensais
      this.hasMany(models.CobrancaMensal, {
        foreignKey: 'processoCobrancaId',
        as: 'cobrancas'
      });
    }
  }

  ProcessoCobranca.init({
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      defaultValue: DataTypes.UUIDV4,
      allowNull: false
    },
    cotaId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'cotas',
        key: 'id'
      }
    },
    diaVencimento: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
        max: 31
      },
      comment: 'Dia do mês para vencimento (1-31)'
    },
    dataInicioCobranca: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: 'Data a partir da qual começar a gerar cobranças'
    },
    valorParcela: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Valor fixo da parcela mensal'
    },
    status: {
      type: DataTypes.ENUM('ativo', 'pausado', 'encerrado'),
      allowNull: false,
      defaultValue: 'ativo',
      comment: 'Status do processo de cobrança'
    },
    observacao: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Observações sobre o processo'
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
    modelName: 'ProcessoCobranca',
    tableName: 'processos_cobranca',
    schema: SCHEMA,
    timestamps: true,
    indexes: [
      {
        fields: ['cotaId']
      },
      {
        fields: ['status']
      },
      {
        fields: ['dataInicioCobranca']
      }
    ]
  });

  return ProcessoCobranca;
};
