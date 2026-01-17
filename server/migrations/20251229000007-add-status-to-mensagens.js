'use strict';

'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const schema = process.env.DB_SCHEMA || 'dev';
    await queryInterface.addColumn(
      { tableName: 'mensagens', schema },
      'status',
      {
        type: Sequelize.STRING(30),
        allowNull: true,
        defaultValue: null,
        comment: 'Status da mensagem conforme Evolution (sent, delivered, read, etc.)'
      }
    );
  },

  async down(queryInterface) {
    const schema = process.env.DB_SCHEMA || 'dev';
    await queryInterface.removeColumn({ tableName: 'mensagens', schema }, 'status');
  }
};
