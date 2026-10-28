const logger = require('../config/logger');

const errorHandler = (err, req, res, next) => {
  logger.error(`[ErrorHandler] Error en ${req.method} ${req.originalUrl}: ${err.message}`, { stack: err.stack });
  
  const statusCode = err.statusCode || 500;
  res.status(statusCode).json({
    success: false,
    message: err.message || 'Error interno del servidor',
    error: process.env.NODE_ENV === 'development' ? err.stack : undefined
  });
};

module.exports = errorHandler;
