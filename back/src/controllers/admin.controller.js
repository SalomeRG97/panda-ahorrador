const authService = require('../services/auth.service');
const logger = require('../config/logger');

class AdminController {
  async getAllUsers(req, res, next) {
    try {
      logger.info('[AdminController] GET /api/admin/users');
      const users = await authService.getAllUsers();
      res.json({ success: true, data: users });
    } catch (error) {
      next(error);
    }
  }

  async createUser(req, res, next) {
    try {
      const { email, username, name, role, password } = req.body;
      logger.info(`[AdminController] POST /api/admin/users -> ${email} (${role})`);
      const user = await authService.adminCreateUser(email, username, name, role, password);
      res.status(201).json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }

  async updateUser(req, res, next) {
    try {
      const { id } = req.params;
      logger.info(`[AdminController] PUT /api/admin/users/${id}`);
      const user = await authService.adminUpdateUser(parseInt(id), req.body);
      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }

  async deleteUser(req, res, next) {
    try {
      const { id } = req.params;
      logger.info(`[AdminController] DELETE /api/admin/users/${id}`);
      await authService.adminDeleteUser(parseInt(id));
      res.json({ success: true, message: 'Usuario desactivado' });
    } catch (error) {
      next(error);
    }
  }

  async toggleStatus(req, res, next) {
    try {
      const { id } = req.params;
      const { isActive } = req.body;
      logger.info(`[AdminController] PUT /api/admin/users/${id}/status -> active: ${isActive}`);
      const user = await authService.toggleUserStatus(parseInt(id, 10), isActive);
      res.json({ success: true, data: user });
    } catch (error) {
      next(error);
    }
  }

  async getRoles(req, res, next) {
    try {
      logger.info('[AdminController] GET /api/admin/roles');
      const roles = await authService.getAllRoles();
      res.json({ success: true, data: roles });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new AdminController();
