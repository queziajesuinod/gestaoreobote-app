'use strict';

const { Model, DataTypes } = require('sequelize');

const SCHEMA = (process.env.DB_SCHEMA || 'dev').trim();

module.exports = (sequelize) => {
  class CotaProcessoCobranca extends Model {
    static associate(models) {
      // Relacionamento com ProcessoCobranca
      this.belongsTo(models.ProcessoCobranca, {
        foreignKey: 'processoCobrancaId',
        as: 'processoCobranca'
      });

      // Relacionamento com Cota
      this.belongsTo(models.Cota, {
        foreignKey: 'cotaId',
        as: 'cota'
      });

      // Relacionamento com Cobranças Mensais
      this.hasMany(models.CobrancaMensal, {
        foreignKey: 'cotaProcessoId',
        as: 'cobrancas'
      });
    }
  }

  CotaProcessoCobranca.init({
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
    cotaId: {
      type: DataTypes.UUID,
      allowNull: false,
      references: {
        model: 'cotas',
        key: 'id'
      }
    },
    valor: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Valor da cobrança mensal desta cota'
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
    quantidadeMeses: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1
      },
      comment: 'Quantidade de meses do processo (null = ilimitado)'
    },
    mesesPagosRetroativo: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0
      },
      comment: 'Quantidade de meses já pagos (histórico retroativo)'
    },
    dataInicioCobranca: {
      type: DataTypes.DATEONLY,
      allowNull: false,
      comment: 'Data a partir da qual começar a gerar cobranças'
    },
    status: {
      type: DataTypes.ENUM('ativo', 'pausado', 'encerrado'),
      allowNull: false,
      defaultValue: 'ativo',
      comment: 'Status da cota no processo'
    },
    observacao: {
      type: DataTypes.TEXT,
      allowNull: true,
      comment: 'Observações específicas desta cota'
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
    modelName: 'CotaProcessoCobranca',
    tableName: 'cotas_processo_cobranca',
    schema: SCHEMA,
    timestamps: true,
    indexes: [
      {
        fields: ['processoCobrancaId']
      },
      {
        fields: ['cotaId']
      },
      {
        fields: ['status']
      },
      {
        unique: true,
        fields: ['processoCobrancaId', 'cotaId'],
        name: 'idx_cotas_processo_unique'
      }
    ]
  });

  return CotaProcessoCobranca;
};
