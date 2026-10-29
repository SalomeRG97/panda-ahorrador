const ownershipRepository = require('../repositories/ownership.repository');
const logger = require('../config/logger');

/**
 * Fábrica de middleware para verificar que un recurso pertenece al usuario efectivo.
 * @param {string} resourceType - Tipo de recurso ('year', 'month', 'week', 'income', 'budgetExpense', 'extraExpense', 'monthChallenge')
 * @param {Function|string} getId - Función que extrae el ID del recurso desde req (params o body)
 * @param {object} [options]
 * @param {boolean} [options.write=false] - Si es true, bloquea con 403 a usuarios con rol 'viewer' o req.isViewer
 */
const assertOwnership = (resourceType, getId, { write = false } = {}) => {
  return async (req, res, next) => {
    try {
      if (write && (req.isViewer || req.user?.role === 'viewer')) {
        return res.status(403).json({
          success: false,
          message: 'No tienes permisos para realizar esta acción'
        });
      }

      const rawId = typeof getId === 'function' ? getId(req) : req.params?.[getId] ?? req.body?.[getId];
      if (rawId === undefined || rawId === null || rawId === '' || isNaN(Number(rawId))) {
        return res.status(404).json({
          success: false,
          message: 'Recurso no encontrado'
        });
      }

      const ownerId = await ownershipRepository.getOwnerId(resourceType, rawId);
      if (ownerId === null || ownerId === undefined) {
        return res.status(404).json({
          success: false,
          message: 'Recurso no encontrado'
        });
      }

      const effectiveUserId = req.effectiveUserId ?? req.user?.id;
      const isAdmin = req.user?.role === 'admin';

      if (Number(ownerId) !== Number(effectiveUserId) && !isAdmin) {
        logger.warn(
          `[ResourceOwnership] Acceso denegado a ${resourceType}#${rawId} (owner=${ownerId}) por usuario efectivo ${effectiveUserId}`
        );
        return res.status(404).json({
          success: false,
          message: 'Recurso no encontrado'
        });
      }

      req.resourceOwnerId = Number(ownerId);
      if (isAdmin && !req.query?.viewAs) {
        req.effectiveUserId = Number(ownerId);
      }
      next();
    } catch (error) {
      logger.error(`[ResourceOwnership] Error verificando ${resourceType}: ${error.message}`);
      next(error);
    }
  };
};

module.exports = { assertOwnership };

