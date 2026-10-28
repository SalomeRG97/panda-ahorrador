const summaryService = require('../services/summary.service');
const logger = require('../config/logger');

class SummaryController {
  async getAnnualSummary(req, res, next) {
    try {
      const { yearId } = req.params;
      logger.info(`[SummaryController] GET /api/summary/year/${yearId}`);
      const summary = await summaryService.getAnnualDashboardSummary(yearId);
      res.json({ success: true, data: summary });
    } catch (error) {
      next(error);
    }
  }

  async getCategoryCharts(req, res, next) {
    try {
      const { yearId } = req.params;
      logger.info(`[SummaryController] GET /api/summary/year/${yearId}/categories`);
      const chartData = await summaryService.getAnnualCategoryChartData(yearId);
      res.json({ success: true, data: chartData });
    } catch (error) {
      next(error);
    }
  }

  async getMonthWeeklyCategoryBreakdown(req, res, next) {
    try {
      const { monthId } = req.params;
      logger.info(`[SummaryController] GET /api/summary/month/${monthId}/categories-weekly`);
      const breakdown = await summaryService.getMonthCategoryWeeklyBreakdown(monthId);
      res.json({ success: true, data: breakdown });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new SummaryController();
