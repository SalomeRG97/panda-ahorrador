const logger = require('../config/logger');

const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Autenticación requerida'
      });
    }

    if (!roles.includes(req.user.role)) {
      logger.warn(`[Role] Acceso denegado para usuario ID ${req.user.id} (rol: ${req.user.role}). Roles requeridos: ${roles.join(', ')}`);
      return res.status(403).json({
        success: false,
        message: 'No tienes permisos para realizar esta acción'
      });
    }

    next();
  };
};

module.exports = { authorize };
