const jwt = require('jsonwebtoken');
const config = require('../config/environment');
const logger = require('../config/logger');
const authRepository = require('../repositories/auth.repository');

const USER_CACHE_TTL_MS = 60 * 1000; // 60 segundos
const userCache = new Map();

function invalidateUserCache(userId) {
  if (userId !== undefined && userId !== null) {
    userCache.delete(Number(userId));
  }
}

function clearUserCache() {
  userCache.clear();
}

async function getUserWithCache(userId) {
  const numericId = Number(userId);
  const now = Date.now();
  const cached = userCache.get(numericId);

  if (cached && now < cached.expiresAt) {
    return cached.user;
  }

  const dbUser = await authRepository.findUserById(numericId);
  if (!dbUser) {
    userCache.delete(numericId);
    return null;
  }

  const normalizedUser = {
    id: dbUser.id,
    email: dbUser.email,
    role: dbUser.role_name || dbUser.role,
    is_active: Boolean(dbUser.is_active),
  };

  userCache.set(numericId, {
    user: normalizedUser,
    expiresAt: now + USER_CACHE_TTL_MS,
  });

  return normalizedUser;
}

const authenticate = async (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      message: 'Token de autenticación requerido',
    });
  }

  const token = authHeader.split(' ')[1];

  let decoded;
  try {
    decoded = jwt.verify(token, config.jwt.accessSecret);
  } catch (error) {
    logger.warn(`[Auth] Token inválido: ${error.message}`);
    return res.status(401).json({
      success: false,
      message: 'Token inválido o expirado',
    });
  }

  if (!decoded || decoded.typ !== 'access' || decoded.sub === undefined || decoded.sub === null) {
    logger.warn('[Auth] Token rechazado: claim typ !== access o sin sub');
    return res.status(401).json({
      success: false,
      message: 'Token inválido o expirado',
    });
  }

  try {
    const user = await getUserWithCache(decoded.sub);

    if (!user || !user.is_active) {
      logger.warn(`[Auth] Acceso denegado para usuario inactivo o inexistente (ID: ${decoded.sub})`);
      return res.status(401).json({
        success: false,
        message: 'Usuario inactivo o sesión inválida',
      });
    }

    req.user = {
      id: user.id,
      email: user.email,
      role: user.role,
    };

    next();
  } catch (error) {
    logger.error(`[Auth] Error verificando usuario en BD: ${error.message}`);
    next(error);
  }
};

module.exports = {
  authenticate,
  invalidateUserCache,
  clearUserCache,
  USER_CACHE_TTL_MS,
};
