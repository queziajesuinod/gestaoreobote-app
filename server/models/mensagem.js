'use strict';

module.exports = (sequelize, DataTypes) => {
  const Mensagem = sequelize.define('Mensagem', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    conversaId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    remetente: {
      type: DataTypes.ENUM('consultor', 'lead'),
      allowNull: false
    },
    conteudo: {
      type: DataTypes.TEXT,
      allowNull: false
    },
    tipoMidia: {
      type: DataTypes.ENUM('texto', 'audio', 'imagem', 'documento', 'video'),
      defaultValue: 'texto',
      allowNull: false
    },
    urlMidia: {
      type: DataTypes.STRING(500),
      allowNull: true
    },
    transcricao: {
      type: DataTypes.TEXT,
      allowNull: true
    },
    analisadaPorIA: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      allowNull: false
    },
    status: {
      type: DataTypes.STRING(30),
      allowNull: true
    },
    evolutionMessageId: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    timestamp: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'mensagens',
    timestamps: true
  });

  Mensagem.associate = function(models) {
    Mensagem.belongsTo(models.Conversa, {
      foreignKey: 'conversaId',
      as: 'conversa'
    });
    Mensagem.hasOne(models.AnaliseIA, {
      foreignKey: 'mensagemId',
      as: 'analise'
    });
  };

  return Mensagem;
};
