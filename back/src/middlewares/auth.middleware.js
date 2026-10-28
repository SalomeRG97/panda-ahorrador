const jwt = require('jsonwebtoken');
const config = require('../config/environment');
const logger = require('../config/logger');

const authenticate = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Token de autenticación requerido'
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, config.jwt.secret);
    req.user = {
      id: decoded.id,
      email: decoded.email,
      role: decoded.role
    };
    next();
  } catch (error) {
    logger.warn(`[Auth] Token inválido: ${error.message}`);
    return res.status(401).json({
      success: false,
      message: 'Token inválido o expirado'
    });
  }
};

module.exports = { authenticate };
