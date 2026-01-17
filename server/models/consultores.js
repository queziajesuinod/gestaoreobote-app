'use strict';
const { Model, DataTypes } = require('sequelize');
const resolveSchema = require('../config/schema');
const SCHEMA = resolveSchema('dev');

module.exports = (sequelize) => {
    class Consultor extends Model {
        static associate(models) {
            // Define que um consultor tem muitos integrantes
            if (models.Integrante) {
                Consultor.hasMany(models.Integrante, { foreignKey: 'consultorId' });
            }
            if (models.Cota && models.CotaConsultor) {
                Consultor.belongsToMany(models.Cota, {
                    through: models.CotaConsultor,
                    as: 'cotas',
                    foreignKey: 'consultorId',
                    otherKey: 'cotaId'
                });
            }
        }
    }

    Consultor.init({
        id: {
            type: DataTypes.INTEGER,
            autoIncrement: true,
            primaryKey: true
        },
        nome: DataTypes.STRING,
        id_agendor: DataTypes.STRING,
        ativo: {
            type: DataTypes.BOOLEAN,
            defaultValue: true,
        },
        email: {
            type: DataTypes.STRING,
            allowNull: false,
            unique: true,
            validate: {
                isEmail: true
            }
        },
        imagem_base64: DataTypes.STRING

    }, {
        sequelize,
        modelName: 'Consultor',
        tableName: 'consultores',
        schema: SCHEMA
    });

    return Consultor;
};
