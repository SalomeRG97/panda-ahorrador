const weekService = require('../services/week.service');
const logger = require('../config/logger');

class WeekController {
  async getByMonth(req, res, next) {
    try {
      const { monthId } = req.params;
      logger.info(`[WeekController] GET /api/weeks/month/${monthId}`);
      const weeks = await weekService.getWeeksByMonth(monthId);
      res.json({ success: true, data: weeks });
    } catch (error) {
      next(error);
    }
  }

  async getDetail(req, res, next) {
    try {
      const { id } = req.params;
      logger.info(`[WeekController] GET /api/weeks/${id}`);
      const detail = await weekService.getWeekDetail(id);
      res.json({ success: true, data: detail });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new WeekController();
