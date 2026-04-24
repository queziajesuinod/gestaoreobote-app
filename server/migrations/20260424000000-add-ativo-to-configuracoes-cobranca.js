'use strict';

const SCHEMA = (process.env.DB_SCHEMA || 'dev').trim();

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(
      { tableName: 'configuracoes_cobranca', schema: SCHEMA },
      'ativo',
      {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
        comment: 'Ativa ou desativa a execução automática do cron de inadimplência'
      }
    );
  },

  async down(queryInterface) {
    await queryInterface.removeColumn(
      { tableName: 'configuracoes_cobranca', schema: SCHEMA },
      'ativo'
    );
  }
};
