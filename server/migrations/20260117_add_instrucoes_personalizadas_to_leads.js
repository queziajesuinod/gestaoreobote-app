'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Obter schema do ambiente
    const schema = process.env.DB_SCHEMA || (process.env.NODE_ENV === 'production' ? 'public' : 'dev');
    
    await queryInterface.addColumn(
      { tableName: 'leads', schema },
      'instrucoesPersonalizadas',
      {
        type: Sequelize.TEXT,
        allowNull: true,
        comment: 'Instruções personalizadas para análise de IA'
      }
    );
  },

  down: async (queryInterface, Sequelize) => {
    // Obter schema do ambiente
    const schema = process.env.DB_SCHEMA || (process.env.NODE_ENV === 'production' ? 'public' : 'dev');
    
    await queryInterface.removeColumn(
      { tableName: 'leads', schema },
      'instrucoesPersonalizadas'
    );
  }
};
