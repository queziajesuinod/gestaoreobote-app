const { v4: uuidv4 } = require('uuid');

const SCHEMA = process.env.DB_SCHEMA || 'dev';
const TABLE = { schema: SCHEMA, tableName: 'Permissoes' };
const PERFIS_TABLE = { schema: SCHEMA, tableName: 'Perfis' };

const PERMISSIONS = [
  { nome: 'DASHBOARD', descricao: 'Acesso aos dashboards do sistema' },
  { nome: 'GESTAO', descricao: 'Gerenciar equipes e consultores' },
  { nome: 'CLIENTES_ALL', descricao: 'Gerenciar todos os clientes' },
  { nome: 'CLIENTES_OWN', descricao: 'Visualizar clientes do próprio consultor' },
  { nome: 'USERS_MANAGE', descricao: 'Administrar usuários e perfis' }
];

module.exports = {
  async up(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const [[adminPerfil]] = await queryInterface.sequelize.query(
        `SELECT id FROM "${SCHEMA}"."Perfis" WHERE UPPER(descricao) = 'ADMIN' LIMIT 1`,
        { transaction }
      );

      let adminPerfilId = adminPerfil?.id;

      if (!adminPerfilId) {
        adminPerfilId = uuidv4();
        const now = new Date();
        await queryInterface.bulkInsert(
          PERFIS_TABLE,
          [{
            id: adminPerfilId,
            descricao: 'ADMIN',
            createdAt: now,
            updatedAt: now
          }],
          { transaction }
        );
      }

      const permissionNames = PERMISSIONS.map((permission) => `'${permission.nome}'`).join(',');

      await queryInterface.sequelize.query(
        `DELETE FROM "${SCHEMA}"."Permissoes"
         WHERE "perfilId" = :perfilId
           AND UPPER("nome") IN (${permissionNames})`,
        {
          transaction,
          replacements: { perfilId: adminPerfilId }
        }
      );

      const now = new Date();
      const registros = PERMISSIONS.map((permission) => ({
        id: uuidv4(),
        nome: permission.nome,
        descricao: permission.descricao,
        perfilId: adminPerfilId,
        createdAt: now,
        updatedAt: now
      }));

      await queryInterface.bulkInsert(TABLE, registros, { transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  },

  async down(queryInterface) {
    const transaction = await queryInterface.sequelize.transaction();
    try {
      const permissionNames = PERMISSIONS.map((permission) => `'${permission.nome}'`).join(',');

      await queryInterface.sequelize.query(
        `DELETE FROM "${SCHEMA}"."Permissoes"
         WHERE UPPER("nome") IN (${permissionNames})
           AND "perfilId" IN (
             SELECT id FROM "${SCHEMA}"."Perfis" WHERE UPPER(descricao) = 'ADMIN'
           )`,
        { transaction }
      );

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
};
