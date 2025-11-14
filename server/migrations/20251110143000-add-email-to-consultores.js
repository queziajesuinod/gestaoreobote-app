'use strict';

const SCHEMA = process.env.DB_SCHEMA || 'dev';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(
      { schema: SCHEMA, tableName: 'consultores' },
      'email',
      {
        type: Sequelize.STRING,
        allowNull: false
      }
    );

    await queryInterface.addConstraint(
      { schema: SCHEMA, tableName: 'consultores' },
      {
        fields: ['email'],
        type: 'unique',
        name: 'consultores_email_unico'
      }
    );
  },

  async down(queryInterface) {
    await queryInterface.removeConstraint(
      { schema: SCHEMA, tableName: 'consultores' },
      'consultores_email_unico'
    );
    await queryInterface.removeColumn(
      { schema: SCHEMA, tableName: 'consultores' },
      'email'
    );
  }
};
