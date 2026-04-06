const SCHEMA = (process.env.DB_SCHEMA || 'dev').trim();

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable({ schema: SCHEMA, tableName: 'metas' }, {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        defaultValue: Sequelize.UUIDV4
      },
      descricao: {
        type: Sequelize.STRING
      },
      valor: {
        type: Sequelize.DECIMAL(15, 2),
        allowNull: false
      },
      dataInicio: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      dataFim: {
        type: Sequelize.DATEONLY,
        allowNull: true
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.fn('NOW')
      }
    });
  },

  async down(queryInterface) {
    await queryInterface.dropTable({ schema: SCHEMA, tableName: 'metas' });
  }
};
