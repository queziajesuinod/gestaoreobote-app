'use strict';

const { Model, DataTypes } = require('sequelize');

const SCHEMA = (process.env.DB_SCHEMA || 'dev').trim();

module.exports = (sequelize) => {
  class ProcessoCobranca extends Model {
    static associate(models) {
      // Relacionamento LEGADO com Cota (mantido para compatibilidade)
      this.belongsTo(models.Cota, {
        foreignKey: 'cotaId',
        as: 'cota'
      });

      // Relacionamento com CotaProcessoCobranca (NOVO)
      this.hasMany(models.CotaProcessoCobranca, {
        foreignKey: 'processoCobrancaId',
        as: 'cotasProcesso'
      });

      // Relacionamento N:N com Cotas através de CotaProcessoCobranca
      this.belongsToMany(models.Cota, {
        through: models.CotaProcessoCobranca,
        foreignKey: 'processoCobrancaId',
        otherKey: 'cotaId',
        as: 'cotas'
      });

      // Relacionamento com Cobranças Mensais (mantido para compatibilidade)
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
      allowNull: true, // Alterado para permitir processos multi-cota
      references: {
        model: 'cotas',
        key: 'id'
      },
      comment: 'LEGADO: Usado apenas para processos de cota única (tipo=unico)'
    },
    nome: {
      type: DataTypes.STRING(255),
      allowNull: true,
      comment: 'Nome descritivo do processo'
    },
    tipo: {
      type: DataTypes.ENUM('unico', 'multiplo'),
      allowNull: false,
      defaultValue: 'unico',
      comment: 'Tipo do processo (unico = 1 cota, multiplo = N cotas)'
    },
    diaVencimento: {
      type: DataTypes.INTEGER,
      allowNull: true, // Agora opcional (movido para CotaProcessoCobranca)
      validate: {
        min: 1,
        max: 31
      },
      comment: 'LEGADO: Dia do mês para vencimento (usado apenas em tipo=unico)'
    },
    dataInicioCobranca: {
      type: DataTypes.DATEONLY,
      allowNull: true, // Agora opcional (movido para CotaProcessoCobranca)
      comment: 'LEGADO: Data de início (usado apenas em tipo=unico)'
    },
    quantidadeMeses: {
      type: DataTypes.INTEGER,
      allowNull: true,
      validate: {
        min: 1
      },
      comment: 'LEGADO: Quantidade de meses (usado apenas em tipo=unico)'
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
