const crypto = require('crypto');
const multer = require('multer');
const logger = require('../config/logger');
const AppError = require('../utils/app-error');
const requestIdMiddleware = require('./request-id.middleware');

const errorHandler = (err, req, res, next) => {
  const requestId =
    req.id ||
    (typeof req.headers?.['x-request-id'] === 'string' && req.headers['x-request-id'].trim()) ||
    crypto.randomUUID();

  req.id = requestId;
  if (!res.headersSent) {
    res.setHeader('X-Request-Id', requestId);
  }

  const isDev = process.env.NODE_ENV === 'development';

  // 1. Errores de Multer
  if (err instanceof multer.MulterError || err?.name === 'MulterError' || err?.code === 'LIMIT_FILE_SIZE') {
    const message =
      err.code === 'LIMIT_FILE_SIZE'
        ? 'El archivo excede el tamaño máximo permitido'
        : err.message || 'Error al subir el archivo';

    logger.warn(
      `[ErrorHandler] [${requestId}] MulterError en ${req.method} ${logger.maskEmailsInText(req.originalUrl)}: ${message}`
    );

    const payload = {
      success: false,
      message,
      requestId,
    };
    if (isDev && err.stack) payload.error = err.stack;
    return res.status(400).json(payload);
  }

  // 2. Errores de CORS
  if (
    err?.code === 'CORS_NOT_ALLOWED' ||
    (typeof err?.message === 'string' && err.message.toLowerCase().includes('cors'))
  ) {
    logger.warn(
      `[ErrorHandler] [${requestId}] Bloqueo CORS en ${req.method} ${logger.maskEmailsInText(req.originalUrl)}: ${err.message}`
    );

    const payload = {
      success: false,
      message: 'Origen no permitido por CORS',
      requestId,
    };
    if (isDev && err.stack) payload.error = err.stack;
    return res.status(403).json(payload);
  }

  // 3. Errores de payload demasiado grande o JSON malformado (express.json)
  if (err?.type === 'entity.too.large' || err?.status === 413) {
    const payload = {
      success: false,
      message: 'El cuerpo de la petición excede el límite permitido (100kb)',
      requestId,
    };
    if (isDev && err.stack) payload.error = err.stack;
    return res.status(413).json(payload);
  }

  if (err instanceof SyntaxError && err.status === 400 && 'body' in err) {
    const payload = {
      success: false,
      message: 'JSON inválido en el cuerpo de la petición',
      requestId,
    };
    if (isDev && err.stack) payload.error = err.stack;
    return res.status(400).json(payload);
  }

  // 4. AppError con status < 500
  const isAppError = err instanceof AppError || err?.name === 'AppError';
  const statusCode = Number(err?.statusCode) || 500;

  if (isAppError && statusCode >= 400 && statusCode < 500) {
    logger.warn(
      `[ErrorHandler] [${requestId}] AppError (${statusCode}) en ${req.method} ${logger.maskEmailsInText(req.originalUrl)}: ${logger.maskEmailsInText(err.message)}`
    );

    const payload = {
      success: false,
      message: err.message,
      requestId,
    };
    if (err.code) payload.code = err.code;
    if (isDev && err.stack) payload.error = err.stack;
    return res.status(statusCode).json(payload);
  }

  // 5. Cualquier otro error o 5xx: ocultar detalles internos y registrar stack con requestId
  const finalStatus = statusCode >= 500 && statusCode < 600 ? statusCode : 500;

  logger.error(
    `[ErrorHandler] [${requestId}] Error interno (${finalStatus}) en ${req.method} ${logger.maskEmailsInText(req.originalUrl)}: ${logger.maskEmailsInText(err?.message || 'Error desconocido')}`,
    {
      requestId,
      stack: err?.stack,
    }
  );

  const payload = {
    success: false,
    message: 'Error interno del servidor',
    requestId,
  };
  if (isDev && err?.stack) {
    payload.error = err.stack;
  }

  return res.status(finalStatus).json(payload);
};

errorHandler.requestId = requestIdMiddleware;
module.exports = errorHandler;
