const SCHEMA = process.env.DB_SCHEMA || 'dev';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const table = { tableName: 'Permissoes', schema: SCHEMA };

    await queryInterface.addColumn(table, 'perfilId', {
        type: Sequelize.UUID,
          references: {
            model: { schema: SCHEMA, tableName: 'Perfis' },
            key: 'id'
          },
          onUpdate: 'CASCADE',
          onDelete: 'SET NULL'
    });



   },

  down: async (queryInterface) => {
    const table = { tableName: 'Permissoes', schema: SCHEMA };

    await queryInterface.removeColumn(table, 'perfilId');
   }
};
