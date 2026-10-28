const authService = require('../services/auth.service');
const logger = require('../config/logger');

class AuthController {
  async register(req, res, next) {
    try {
      const { email, username, password, name } = req.body;
      logger.info(`[AuthController] POST /api/auth/register -> ${email}`);
      const result = await authService.register(email, username, password, name);
      res.status(201).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async login(req, res, next) {
    try {
      const { email, password } = req.body;
      logger.info(`[AuthController] POST /api/auth/login -> ${email}`);
      const result = await authService.login(email, password);
      res.json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }

  async refresh(req, res, next) {
    try {
      const { refreshToken } = req.body;
      logger.info('[AuthController] POST /api/auth/refresh');
      const result = await authService.refreshToken(refreshToken);
      res.json({ success: true, data: result });
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

module.exports = new AuthController();
