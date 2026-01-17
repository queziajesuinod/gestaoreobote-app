const SCHEMA = (process.env.DB_SCHEMA || 'dev').trim();

const enumSchema = SCHEMA.replace(/"/g, '');
const enumName = 'enum_contemplacoes_tipo';
const enumFullName = `"${enumSchema}"."${enumName}"`;
const enumRegType = `${enumSchema}.${enumName}`;

const addValueIfNotExists = (value) => `
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_enum
    WHERE enumtypid = '${enumRegType}'::regtype
      AND enumlabel = '${value}'
  ) THEN
    ALTER TYPE ${enumFullName} ADD VALUE '${value}';
  END IF;
END $$;
`;

module.exports = {
  async up(queryInterface) {
    const queries = [
      addValueIfNotExists('LANCE_FIXO'),
      addValueIfNotExists('LANCE_LIVRE')
    ];

    for (const query of queries) {
      // eslint-disable-next-line no-await-in-loop
      await queryInterface.sequelize.query(query);
    }
  },

  async down() {
    // Não é trivial remover valores ENUM sem recriar o tipo.
    // Optamos por manter os novos valores caso o down seja executado.
  }
};
