'use strict';

module.exports = (sequelize, DataTypes) => {
  const Conversa = sequelize.define('Conversa', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true
    },
    leadId: {
      type: DataTypes.UUID,
      allowNull: false
    },
    consultorId: {
      type: DataTypes.INTEGER,
      allowNull: false
    },
    plataforma: {
      type: DataTypes.ENUM('whatsapp', 'telegram', 'manual'),
      defaultValue: 'whatsapp',
      allowNull: false
    },
    chatId: {
      type: DataTypes.STRING(100),
      allowNull: true
    },
    status: {
      type: DataTypes.ENUM('ativa', 'arquivada'),
      defaultValue: 'ativa',
      allowNull: false
    },
    ultimaMensagem: {
      type: DataTypes.DATE,
      allowNull: true
    }
  }, {
    tableName: 'conversas',
    timestamps: true
  });

  Conversa.associate = function(models) {
    Conversa.belongsTo(models.Lead, {
      foreignKey: 'leadId',
      as: 'lead'
    });
    Conversa.belongsTo(models.Consultor, {
      foreignKey: 'consultorId',
      as: 'consultor'
    });
    Conversa.hasMany(models.Mensagem, {
      foreignKey: 'conversaId',
      as: 'mensagens'
    });
  };

  return Conversa;
};
