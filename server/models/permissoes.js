const { Model } = require('sequelize');
const resolveSchema = require('../config/schema');
const SCHEMA = resolveSchema('dev');

module.exports = (sequelize, DataTypes) => {
  class Permissao extends Model {
    static associate(models) {
      if (models.Perfil) {
        Permissao.belongsTo(models.Perfil, {
          foreignKey: 'perfilId',
          as: 'perfil'
        });
      }
    }
  }

  Permissao.init({
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
    },
    nome: DataTypes.STRING,
    descricao: DataTypes.STRING
  }, {
    sequelize, // Usa a instância passada como parâmetro
    modelName: 'Permissao',
    tableName: 'Permissoes',
    schema: SCHEMA
  });

  return Permissao;
};
