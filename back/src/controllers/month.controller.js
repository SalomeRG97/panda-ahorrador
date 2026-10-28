const monthService = require('../services/month.service');
const logger = require('../config/logger');

class MonthController {
  async getByYear(req, res, next) {
    try {
      const { yearId } = req.params;
      logger.info(`[MonthController] GET /api/months/year/${yearId}`);
      const months = await monthService.getMonthsByYear(yearId);
      res.json({ success: true, data: months });
    } catch (error) {
      next(error);
    }
  }

  async getDetails(req, res, next) {
    try {
      const { id } = req.params;
      logger.info(`[MonthController] GET /api/months/${id}`);
      const details = await monthService.getMonthDetails(id);
      res.json({ success: true, data: details });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new MonthController();
