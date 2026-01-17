'use strict';

const SCHEMA = (process.env.DB_SCHEMA || 'dev').trim();

module.exports = {
  async up(queryInterface, Sequelize) {
    const table = { schema: SCHEMA, tableName: 'cotas' };

    const desc = await queryInterface.describeTable(table);
    if (!desc.idagendor) return; // se não existe, não faz nada

    // (opcional) só muda se realmente precisar
    // se já é allowNull true, ok.
    await queryInterface.changeColumn(table, 'idagendor', {
      type: Sequelize.STRING,
      allowNull: true,
    });
  },

  async down(queryInterface, Sequelize) {
    const table = { schema: SCHEMA, tableName: 'cotas' };

    const desc = await queryInterface.describeTable(table);
    if (!desc.idagendor) return;

    // Se você for voltar pra NOT NULL, precisa garantir que não tem null.
    // Aqui eu escolhi: se tiver NULL, não aplica o NOT NULL (pra não quebrar o rollback).
    const [rows] = await queryInterface.sequelize.query(
      `SELECT COUNT(*)::int AS n
       FROM "${SCHEMA}"."cotas"
       WHERE "idagendor" IS NULL`
    );

    const nullCount = rows?.[0]?.n ?? 0;
    if (nullCount > 0) return;

    await queryInterface.changeColumn(table, 'idagendor', {
      type: Sequelize.STRING,
      allowNull: false,
    });
  },
};
