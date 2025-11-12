'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const schema = process.env.DB_SCHEMA || 'dev';
    await queryInterface.addColumn(
      { tableName: 'cotas', schema },
      'digito',
      {
        type: Sequelize.STRING(5),
        allowNull: true
      }
    );
  },

  async down(queryInterface) {
    const schema = process.env.DB_SCHEMA || 'dev';
    await queryInterface.removeColumn({ tableName: 'cotas', schema }, 'digito');
  }
};
