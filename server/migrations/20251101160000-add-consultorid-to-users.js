const SCHEMA = process.env.DB_SCHEMA || 'dev';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn(
      { schema: SCHEMA, tableName: 'Users' },
      'consultorId',
      {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: { schema: SCHEMA, tableName: 'consultores' },
          key: 'id'
        },
        onUpdate: 'SET NULL',
        onDelete: 'SET NULL'
      }
    );
  },

  async down(queryInterface) {
    await queryInterface.removeColumn(
      { schema: SCHEMA, tableName: 'Users' },
      'consultorId'
    );
  }
};
