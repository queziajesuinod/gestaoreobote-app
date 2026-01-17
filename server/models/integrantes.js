'use strict';
const { Model, DataTypes } = require('sequelize');
const resolveSchema = require('../config/schema');
const SCHEMA = resolveSchema('dev');

module.exports = (sequelize) => {
    class Integrante extends Model {
        static associate(models) {
            Integrante.belongsTo(models.Equipe, { foreignKey: 'equipeId', as: 'equipe' });
            Integrante.belongsTo(models.Consultor, { foreignKey: 'consultorId', as: 'consultor' });

        }
    }

    Integrante.init({
        id: {
            type: DataTypes.UUID,
            defaultValue: DataTypes.UUIDV4,
            primaryKey: true
        },
        funcao: DataTypes.ENUM('Lider', 'Integrante'),

        equipeId: {
            type: DataTypes.UUID,
            allowNull: false,
        },
        consultorId: {
            type: DataTypes.INTEGER,
            allowNull: false,
        }

    }, {
        sequelize,
        modelName: 'Integrante',
        tableName: 'integrantes',
        schema: SCHEMA
    });

    return Integrante;
};
