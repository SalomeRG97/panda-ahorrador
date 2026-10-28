const summaryRepository = require('../repositories/summary.repository');
const logger = require('../config/logger');

class SummaryService {
  async getAnnualDashboardSummary(yearId) {
    logger.info(`[SummaryService] Obteniendo resumen de dashboard para el año ID ${yearId}`);
    const monthSummaries = await summaryRepository.getAnnualSummary(yearId);

    // Totales del año
    const totals = monthSummaries.reduce(
      (acc, m) => {
        acc.income += m.income;
        acc.expenses += m.expenses;
        acc.savings += m.savings;
        acc.fixed += m.fixed;
        acc.remaining += m.remaining;
        return acc;
      },
      { income: 0, expenses: 0, savings: 0, fixed: 0, remaining: 0 }
    );

    return {
      totals,
      months: monthSummaries
    };
  }

  async getAnnualCategoryChartData(yearId) {
    logger.info(`[SummaryService] Obteniendo datos para gráfico anual por categorías del año ID ${yearId}`);
    const rows = await summaryRepository.getCategoryExpensesByYear(yearId);

    // Organizar por categoría
    const categoriesMap = {};

    rows.forEach(r => {
      if (!categoriesMap[r.category_id]) {
        categoriesMap[r.category_id] = {
          categoryId: r.category_id,
          categoryName: r.category_name,
          categoryColor: r.category_color,
          monthlyData: Array(12).fill(0)
        };
      }
      categoriesMap[r.category_id].monthlyData[r.month_number - 1] = parseFloat(r.total_spent);
    });

    return Object.values(categoriesMap);
  }

  async getMonthCategoryWeeklyBreakdown(monthId) {
    return await summaryRepository.getMonthCategoryWeeklyBreakdown(monthId);
  }
}

module.exports = new SummaryService();
