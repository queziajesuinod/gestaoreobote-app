const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class Perfil extends Model {
    static associate(models) {
      // Define que um perfil tem muitos usuários
      if (models.User) {
        Perfil.hasMany(models.User, { foreignKey: 'perfilId' });
      }
      if (models.Permissao) {
        Perfil.hasMany(models.Permissao, { foreignKey: 'perfilId', as: 'permissoes' });
      }
    }
  }

  Perfil.init({
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
    },
    descricao: DataTypes.STRING,
  }, {
    sequelize,
    modelName: 'Perfil',
    tableName: 'Perfis', // Define explicitamente o nome da tabela
    schema: process.env.DB_SCHEMA || 'dev'
  });

  return Perfil;
};
