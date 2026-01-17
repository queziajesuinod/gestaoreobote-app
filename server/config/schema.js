const resolveSchema = (fallback = 'dev') => {
  const rawSchema = process.env.DB_SCHEMA;
  if (typeof rawSchema === 'string') {
    const trimmed = rawSchema.trim();
    if (trimmed.length) {
      return trimmed;
    }
  }
  return fallback;
};

module.exports = resolveSchema;
