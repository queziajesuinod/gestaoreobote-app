'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('leads', 'instrucoesPersonalizadas', {
      type: Sequelize.TEXT,
      allowNull: true,
      comment: 'Instruções personalizadas para análise de IA'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('leads', 'instrucoesPersonalizadas');
  }
};
