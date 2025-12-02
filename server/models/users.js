const { Model, DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  class User extends Model {
    static associate(models) {
      User.belongsTo(models.Perfil, { foreignKey: 'perfilId' });
      if (models.Consultor) {
        User.belongsTo(models.Consultor, { foreignKey: 'consultorId', as: 'consultor' });
      }
    }
  }

  User.init({
    id: {
      type: DataTypes.UUID,
      primaryKey: true,
      allowNull: false,
      defaultValue: DataTypes.UUIDV4,
    },
    name: DataTypes.STRING,
    email: DataTypes.STRING,
    active: {
      type: DataTypes.BOOLEAN,
      defaultValue: true,
    },
    perfilId: {
      type: DataTypes.UUID,
      allowNull: true,
    },
    consultorId: {
      type: DataTypes.INTEGER,
      allowNull: true
    },
    passwordHash: DataTypes.STRING,
    salt: DataTypes.STRING,
    image: DataTypes.STRING,
    username: DataTypes.STRING,
    agendorToken: {
      type: DataTypes.STRING,
      allowNull: true
    }
  }, {
    sequelize,
    modelName: 'User',
    tableName: 'Users',
    schema: process.env.DB_SCHEMA || 'dev'
  });

  return User;
};
