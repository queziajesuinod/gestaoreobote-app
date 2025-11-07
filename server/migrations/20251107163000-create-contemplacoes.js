const SCHEMA = process.env.DB_SCHEMA || 'dev';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable({ schema: SCHEMA, tableName: 'contemplacoes' }, {
      id: {
        type: Sequelize.UUID,
        primaryKey: true,
        allowNull: false,
        defaultValue: Sequelize.UUIDV4
      },
      cotaId: {
        type: Sequelize.UUID,
        allowNull: false,
        references: {
          model: {
            tableName: 'cotas',
            schema: SCHEMA
          },
          key: 'id'
        },
        onDelete: 'CASCADE',
        onUpdate: 'CASCADE'
      },
      dataContemplacao: {
        type: Sequelize.DATEONLY,
        allowNull: false
      },
      tipo: {
        type: Sequelize.ENUM('LANCE', 'SORTEIO'),
        allowNull: false
      },
      observacao: {
        type: Sequelize.STRING,
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

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable({ schema: SCHEMA, tableName: 'contemplacoes' });
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_contemplacoes_tipo";');
  }
};
