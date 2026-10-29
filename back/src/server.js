const app = require('./app');
const config = require('./config/environment');
const logger = require('./config/logger');
const pool = require('./config/database');

const server = app.listen(config.port, '0.0.0.0', () => {
  logger.info(`===========================================================`);
  logger.info(`🌸 熊猫理财 El panda ahorrador - Backend API corriendo en puerto ${config.port}`);
  logger.info(`🗄️ Base de datos: MySQL CleverCloud (${config.db.database})`);
  logger.info(`🔐 Autenticación: JWT habilitado`);
  logger.info(`===========================================================`);
});

let isShuttingDown = false;

const gracefulShutdown = (signal) => {
  if (isShuttingDown) return;
  isShuttingDown = true;

  logger.info(`[Server] Señal ${signal} recibida. Cerrando servidor HTTP...`);

  server.close(async (err) => {
    if (err) {
      logger.error(`[Server] Error al cerrar el servidor HTTP: ${err.message}`);
    } else {
      logger.info('[Server] Servidor HTTP cerrado.');
    }

    try {
      await pool.end();
      logger.info('[Database] Pool de conexiones MySQL cerrado correctamente.');
      process.exit(err ? 1 : 0);
    } catch (dbErr) {
      logger.error(`[Database] Error al cerrar el pool de conexiones: ${dbErr.message}`);
      process.exit(1);
    }
  });
};

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

module.exports = server;

