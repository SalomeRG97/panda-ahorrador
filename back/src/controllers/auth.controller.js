const authService = require('../services/auth.service');
const config = require('../config/environment');
const logger = require('../config/logger');

const REFRESH_COOKIE_NAME = 'refreshToken';
const REFRESH_COOKIE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 días

function getRefreshCookieOptions() {
  const isProd = config.nodeEnv === 'production';
  return {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? 'none' : 'lax',
    path: '/api/auth',
    maxAge: REFRESH_COOKIE_MAX_AGE_MS,
  };
}

function setRefreshCookie(res, token) {
  res.cookie(REFRESH_COOKIE_NAME, token, getRefreshCookieOptions());
}

function clearRefreshCookie(res) {
  const { maxAge, ...clearOpts } = getRefreshCookieOptions();
  res.clearCookie(REFRESH_COOKIE_NAME, clearOpts);
}

function getRequestMeta(req) {
  return {
    userAgent: req.headers?.['user-agent'] || null,
    ip: req.ip || req.socket?.remoteAddress || null,
  };
}

class AuthController {
  async register(req, res, next) {
    try {
      const { email, username, password, name } = req.body;
      logger.info(`[AuthController] POST /api/auth/register -> ${logger.maskEmail(email)}`);
      const result = await authService.register(email, username, password, name, getRequestMeta(req));
      setRefreshCookie(res, result.refreshToken);
      res.status(201).json({
        success: true,
        data: {
          user: result.user,
          accessToken: result.accessToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      logger.info(`[AuthController] POST /api/auth/login -> ${logger.maskEmail(email)}`);
      const result = await authService.login(email, password, getRequestMeta(req));
      setRefreshCookie(res, result.refreshToken);
      res.json({
        success: true,
        data: {
          user: result.user,
          accessToken: result.accessToken,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  async refresh(req, res, next) {
    try {
      const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
      logger.info('[AuthController] POST /api/auth/refresh');
      const result = await authService.refreshToken(refreshToken, getRequestMeta(req));
      setRefreshCookie(res, result.refreshToken);
      res.json({
        success: true,
        data: {
          user: result.user,
          accessToken: result.accessToken,
        },
      });
    } catch (error) {
      clearRefreshCookie(res);
      next(error);
    }
  }

  async logout(req, res, next) {
    try {
      const refreshToken = req.cookies?.[REFRESH_COOKIE_NAME];
      logger.info('[AuthController] POST /api/auth/logout');
      await authService.logout(refreshToken);
      clearRefreshCookie(res);
      res.json({
        success: true,
        message: 'Sesión cerrada correctamente',
      });
    } catch (error) {
      clearRefreshCookie(res);
      next(error);
    }
  }

  async logoutAll(req, res, next) {
    try {
      logger.info(`[AuthController] POST /api/auth/logout-all -> User ID ${req.user.id}`);
      await authService.logoutAll(req.user.id);
      clearRefreshCookie(res);
      res.json({
        success: true,
        message: 'Sesiones cerradas en todos los dispositivos',
      });
    } catch (error) {
      next(error);
    }
  }

  async getMe(req, res, next) {
    try {
      logger.info(`[AuthController] GET /api/auth/me -> User ID ${req.user.id}`);
      const user = await authService.getProfile(req.user.id);
      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }
}

const controller = new AuthController();
controller.REFRESH_COOKIE_NAME = REFRESH_COOKIE_NAME;
controller.getRefreshCookieOptions = getRefreshCookieOptions;

module.exports = controller;
