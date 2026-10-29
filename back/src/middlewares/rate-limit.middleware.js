const rateLimit = require('express-rate-limit');
const { ipKeyGenerator } = rateLimit;

const RATE_LIMIT_RESPONSE = {
  success: false,
  message: 'Demasiados intentos, intenta más tarde',
};

const createLimiter = (options) =>
  rateLimit({
    standardHeaders: true,
    legacyHeaders: false,
    validate: false,
    message: RATE_LIMIT_RESPONSE,
    handler: (req, res, next, opts) => {
      res.status(opts.statusCode || 429).json(RATE_LIMIT_RESPONSE);
    },
    ...options,
  });

const getNormalizedIp = (req) => {
  const rawIp = req.ip || req.socket?.remoteAddress || 'unknown';
  if (typeof ipKeyGenerator === 'function') {
    try {
      return ipKeyGenerator(rawIp);
    } catch (_) {
      return rawIp;
    }
  }
  return rawIp;
};

// /api/auth/login: 5 intentos por 15 min por IP+email (keyGenerator con el email del body en minúsculas)
const loginLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => {
    const ip = getNormalizedIp(req);
    const email =
      typeof req.body?.email === 'string'
        ? req.body.email.trim().toLowerCase()
        : '';
    return `${ip}:${email}`;
  },
});

// /api/auth/register: 5 por hora por IP
const registerLimiter = createLimiter({
  windowMs: 60 * 60 * 1000,
  max: 5,
  keyGenerator: (req) => getNormalizedIp(req),
});

// /api/auth/refresh: 30 por 15 min
const refreshLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 30,
  keyGenerator: (req) => getNormalizedIp(req),
});

// Global /api: 300 por 15 min
const apiLimiter = createLimiter({
  windowMs: 15 * 60 * 1000,
  max: 300,
  keyGenerator: (req) => getNormalizedIp(req),
});

module.exports = {
  loginLimiter,
  registerLimiter,
  refreshLimiter,
  apiLimiter,
};

