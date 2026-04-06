const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '..', '.env') });
const resolveSchema = require('./schema');

module.exports = {
  development: {
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || 'kZ7oYab65fQITbyPPV6CLgrL5NIONpwZ',
    database: process.env.DB_NAME || 'reoboteconsorcios',
    host: process.env.DB_HOST || '62.72.63.137',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    dialectOptions: {
      searchPath: resolveSchema('dev')
    }
  },
  production: {
    username: process.env.DB_USER || 'root',
    password: process.env.DB_PASS || 'kZ7oYab65fQITbyPPV6CLgrL5NIONpwZ',
    database: process.env.DB_NAME || 'reoboteconsorcios',
    host: process.env.DB_HOST || '62.72.63.137',
    port: process.env.DB_PORT || 5432,
    dialect: 'postgres',
    dialectOptions: {
      searchPath: resolveSchema('public')
    }
  }
};
