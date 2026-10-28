const yearService = require('../services/year.service');
const logger = require('../config/logger');

class YearController {
  async getAll(req, res, next) {
    try {
      const userId = req.effectiveUserId || req.user.id;
      logger.info(`[YearController] GET /api/years (userId: ${userId})`);
      const years = await yearService.getAllYears(userId);
      res.json({ success: true, data: years });
    } catch (error) {
      next(error);
    }
  }

  async getById(req, res, next) {
    try {
      const { id } = req.params;
      logger.info(`[YearController] GET /api/years/${id}`);
      const year = await yearService.getYearById(id);
      res.json({ success: true, data: year });
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const { year, startMonth } = req.body;
      const userId = req.user.id;
      logger.info(`[YearController] POST /api/years -> Year: ${year}, StartMonth: ${startMonth}, userId: ${userId}`);
      if (!year || !startMonth) {
        return res.status(400).json({ success: false, message: 'Año y mes de inicio son requeridos' });
      }
      const newYear = await yearService.createYear(year, startMonth, userId);
      res.status(201).json({ success: true, data: newYear });
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.user.id;
      logger.info(`[YearController] DELETE /api/years/${id}`);
      await yearService.deleteYear(id, userId);
      res.json({ success: true, message: 'Año eliminado correctamente' });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new YearController();
