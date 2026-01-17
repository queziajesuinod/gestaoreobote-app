const SCHEMA = (process.env.DB_SCHEMA || 'dev').trim();

module.exports = {
  up: async (queryInterface, Sequelize) => {
    const table = { tableName: 'Permissoes', schema: SCHEMA };

    // descreve colunas atuais da tabela (no schema certo)
    const desc = await queryInterface.describeTable(table);

    // se já existe, não faz nada (segue para a próxima migration)
    if (desc.perfilId) return;

    await queryInterface.addColumn(table, 'perfilId', {
      type: Sequelize.UUID,
      allowNull: true,
      references: {
        model: { tableName: 'Perfis', schema: SCHEMA },
        key: 'id',
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL',
    });
  },

  down: async (queryInterface) => {
    const table = { tableName: 'Permissoes', schema: SCHEMA };

    const desc = await queryInterface.describeTable(table);

    // só remove se existir
    if (!desc.perfilId) return;

    await queryInterface.removeColumn(table, 'perfilId');
  },
};
