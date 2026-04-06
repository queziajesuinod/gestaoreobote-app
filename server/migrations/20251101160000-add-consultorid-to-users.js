const SCHEMA = (process.env.DB_SCHEMA || 'dev').trim();

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = { schema: SCHEMA, tableName: 'Users' };

    const desc = await queryInterface.describeTable(table);

    // se já existe, segue para a próxima migration
    if (desc.consultorId) return;

    await queryInterface.addColumn(table, 'consultorId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: { schema: SCHEMA, tableName: 'consultores' },
        key: 'id',
      },
      onUpdate: 'SET NULL',
      onDelete: 'SET NULL',
    });
  },

  async down(queryInterface) {
    const table = { schema: SCHEMA, tableName: 'Users' };

    const desc = await queryInterface.describeTable(table);

    // só remove se existir
    if (!desc.consultorId) return;

    await queryInterface.removeColumn(table, 'consultorId');
  },
};
