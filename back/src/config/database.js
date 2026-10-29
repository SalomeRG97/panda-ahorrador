const mysql = require('mysql2/promise');
const config = require('./environment');
const logger = require('./logger');

const connectionLimit = config.db.connectionLimit || 4;

const pool = mysql.createPool({
  host: config.db.host,
  port: config.db.port,
  user: config.db.user,
  password: config.db.password,
  database: config.db.database,
  waitForConnections: true,
  connectionLimit,
  maxIdle: connectionLimit,
  enableKeepAlive: true,
  keepAliveInitialDelay: 10000,
  queueLimit: 0,
  dateStrings: true
});

logger.info('[Database] Pool de conexiones MySQL inicializado hacia CleverCloud.');

module.exports = pool;
