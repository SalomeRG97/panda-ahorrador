const authService = require('../services/auth.service');
const logger = require('../config/logger');
const path = require('path');
const fs = require('fs');

class ProfileController {
  async getProfile(req, res, next) {
    try {
      logger.info(`[ProfileController] GET /api/profile`);
      const user = await authService.getProfile(req.user.id);
      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }

  async updateProfile(req, res, next) {
    try {
      const { name, email, username } = req.body;
      logger.info(`[ProfileController] PUT /api/profile`);
      const user = await authService.updateProfile(req.user.id, { name, email, username });
      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }

  async changePassword(req, res, next) {
    try {
      const { oldPassword, newPassword } = req.body;
      logger.info(`[ProfileController] PUT /api/profile/password`);
      await authService.changePassword(req.user.id, oldPassword, newPassword);
      res.json({ success: true, message: 'Contraseña actualizada correctamente' });
    } catch (error) {
      next(error);
    }
  }

  async uploadAvatar(req, res, next) {
    try {
      logger.info(`[ProfileController] POST /api/profile/avatar`);
      
      if (!req.file) {
        return res.status(400).json({ success: false, message: 'No se envió ninguna imagen' });
      }

      const avatarUrl = `/uploads/avatars/${req.file.filename}`;
      const user = await authService.updateAvatar(req.user.id, avatarUrl);
      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ProfileController();
