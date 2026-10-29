const categoryService = require('../services/category.service');
const logger = require('../config/logger');

class CategoryController {
  async getAll(req, res, next) {
    try {
      const userId = req.effectiveUserId || (req.user ? req.user.id : null);
      logger.info(`[CategoryController] GET /api/categories - User: ${userId || 'anon'}`);
      const categories = await categoryService.getAllCategories(userId);
      res.json({ success: true, data: categories });
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const { name, color, icon } = req.body;
      const userId = req.effectiveUserId || req.user.id;
      logger.info(`[CategoryController] POST /api/categories - User: ${userId}`);
      const category = await categoryService.createCategory(name, color, icon, userId);
      res.status(201).json({ success: true, data: category });
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const { name, color, icon } = req.body;
      const userId = req.effectiveUserId || req.user.id;
      const userRole = req.user ? req.user.role : null;
      logger.info(`[CategoryController] PUT /api/categories/${id} - User: ${userId}`);
      const category = await categoryService.updateCategory(parseInt(id, 10), { name, color, icon }, userId, userRole);
      res.json({ success: true, data: category });
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.effectiveUserId || req.user.id;
      logger.info(`[CategoryController] DELETE /api/categories/${id} - User: ${userId}`);
      await categoryService.deleteCategory(parseInt(id, 10), userId);
      res.json({ success: true, message: 'Categoría eliminada exitosamente' });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CategoryController();
