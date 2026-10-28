const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '../../.env') });
const logger = require('./logger');

function validateEnv() {
  const nodeEnv = process.env.NODE_ENV || 'development';

  // En development se permite usar JWT_SECRET como fallback de ambos secretos
  if (
    nodeEnv === 'development' &&
    (!process.env.JWT_ACCESS_SECRET || !process.env.JWT_REFRESH_SECRET) &&
    process.env.JWT_SECRET
  ) {
    logger.warn(
      '[Config] Usando JWT_SECRET como fallback para JWT_ACCESS_SECRET y JWT_REFRESH_SECRET en development. Define ambos secretos explícitamente.'
    );
    if (!process.env.JWT_ACCESS_SECRET) {
      process.env.JWT_ACCESS_SECRET = process.env.JWT_SECRET;
    }
    if (!process.env.JWT_REFRESH_SECRET) {
      process.env.JWT_REFRESH_SECRET = process.env.JWT_SECRET;
    }
  }

  const requiredVars = [
    'DB_HOST',
    'DB_USER',
    'DB_PASSWORD',
    'DB_NAME',
    'JWT_ACCESS_SECRET',
    'JWT_REFRESH_SECRET',
  ];

  const missingVars = requiredVars.filter(
    (key) => !process.env[key] || String(process.env[key]).trim() === ''
  );

  if (missingVars.length > 0) {
    const errorMessage = `[Config] Error fatal: Faltan variables de entorno obligatorias: ${missingVars.join(', ')}. La aplicación no puede iniciar.`;
    logger.error(errorMessage);
    console.error(errorMessage);
    process.exit(1);
  }
}

validateEnv();

const accessSecret = process.env.JWT_ACCESS_SECRET;
const refreshSecret = process.env.JWT_REFRESH_SECRET;
const accessExpiresIn =
  process.env.JWT_ACCESS_EXPIRES_IN || process.env.JWT_EXPIRES_IN || '15m';
const refreshExpiresIn = process.env.JWT_REFRESH_EXPIRES_IN || '7d';

module.exports = {
  port: Number(process.env.PORT || 3000),
  nodeEnv: process.env.NODE_ENV || 'development',
  clientUrl: process.env.CLIENT_URL || 'http://localhost:4200',
  db: {
    host: process.env.DB_HOST,
    port: Number(process.env.DB_PORT || 3306),
    user: process.env.DB_USER,
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME,
    connectionLimit: Number(process.env.DB_CONNECTION_LIMIT || 4),
  },
  jwt: {
    secret: accessSecret,
    accessSecret,
    refreshSecret,
    expiresIn: accessExpiresIn,
    accessExpiresIn,
    refreshExpiresIn,
  },
  validateEnv,
};
