const authRepository = require('../repositories/auth.repository');
const logger = require('../config/logger');

/**
 * Middleware para verificar propiedad de datos.
 * - Admin: acceso total
 * - Regular: solo sus propios datos (via user_id en years)
 * - Viewer: solo datos de usuarios que le compartieron (query param ?viewAs=userId)
 * 
 * Resuelve el userId efectivo y lo adjunta como req.effectiveUserId
 */
const resolveOwnership = async (req, res, next) => {
  try {
    const { role, id: userId } = req.user;

    if (role === 'admin') {
      // Admin puede ver cualquier dato; si envía viewAs, lo usa; si no, ve sus propios datos
      req.effectiveUserId = req.query.viewAs ? parseInt(req.query.viewAs) : userId;
      return next();
    }

    if (role === 'viewer') {
      // Viewer DEBE especificar viewAs y debe ser alguien que le compartió
      const viewAs = req.query.viewAs ? parseInt(req.query.viewAs) : null;
      
      if (!viewAs) {
        // Sin viewAs, buscar si tiene algún owner compartido
        const shares = await authRepository.findSharesByViewer(userId);
        if (shares.length === 0) {
          return res.status(403).json({
            success: false,
            message: 'No tienes acceso a ningún dato. Pide a un usuario Regular que comparta contigo.'
          });
        }
        // Usar el primer owner por defecto
        req.effectiveUserId = shares[0].owner_id;
        req.availableOwners = shares.map(s => s.owner_id);
        return next();
      }

      const hasAccess = await authRepository.shareExists(viewAs, userId);
      if (!hasAccess) {
        return res.status(403).json({
          success: false,
          message: 'No tienes acceso a los datos de este usuario'
        });
      }

      req.effectiveUserId = viewAs;
      req.isViewer = true;
      return next();
    }

    // Regular: solo sus propios datos
    req.effectiveUserId = userId;
    next();
  } catch (error) {
    logger.error(`[Ownership] Error verificando propiedad: ${error.message}`);
    next(error);
  }
};

module.exports = { resolveOwnership };
