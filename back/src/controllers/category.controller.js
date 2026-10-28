const categoryService = require('../services/category.service');
const logger = require('../config/logger');

class CategoryController {
  async getAll(req, res, next) {
    try {
      logger.info(`[CategoryController] GET /api/categories - User: ${req.user ? req.user.id : 'anon'}`);
      const userId = req.user ? req.user.id : null;
      const categories = await categoryService.getAllCategories(userId);
      res.json({ success: true, data: categories });
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const { name, color, icon } = req.body;
      logger.info(`[CategoryController] POST /api/categories - User: ${req.user.id}`);
      const category = await categoryService.createCategory(name, color, icon, req.user.id);
      res.status(201).json({ success: true, data: category });
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const { name, color, icon } = req.body;
      logger.info(`[CategoryController] PUT /api/categories/${id} - User: ${req.user.id}`);
      const category = await categoryService.updateCategory(parseInt(id, 10), { name, color, icon }, req.user.id);
      res.json({ success: true, data: category });
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const { id } = req.params;
      logger.info(`[CategoryController] DELETE /api/categories/${id} - User: ${req.user.id}`);
      await categoryService.deleteCategory(parseInt(id, 10), req.user.id);
      res.json({ success: true, message: 'Categoría eliminada exitosamente' });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new CategoryController();
