'use strict';

module.exports = (sequelize, DataTypes) => {
  const AnaliseIA = sequelize.define('AnaliseIA', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    mensagemId: {
      type: DataTypes.UUID,
      allowNull: false,
      unique: true
    },
    topicos: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
      allowNull: false
    },
    objecoes: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
      allowNull: false
    },
    sinaisCompra: {
      type: DataTypes.ARRAY(DataTypes.STRING),
      defaultValue: [],
      allowNull: false
    },
    intencao: {
      type: DataTypes.ENUM('compra', 'informacao', 'reclamacao', 'outro'),
      defaultValue: 'informacao',
      allowNull: false
    },
    sentimento: {
      type: DataTypes.ENUM('positivo', 'neutro', 'negativo'),
      defaultValue: 'neutro',
      allowNull: false
    },
    scoreConfianca: {
      type: DataTypes.DECIMAL(3, 2),
      defaultValue: 0.5,
      allowNull: false
    },
    respostaJSON: {
      type: DataTypes.JSONB,
      allowNull: true
    }
  }, {
    tableName: 'analises_ia',
    timestamps: true
  });

  AnaliseIA.associate = function(models) {
    AnaliseIA.belongsTo(models.Mensagem, {
      foreignKey: 'mensagemId',
      as: 'mensagem'
    });
  };

  return AnaliseIA;
};
