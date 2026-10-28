const db = require('../config/database');
const logger = require('../config/logger');

class SummaryRepository {
  async getAnnualSummary(yearId) {
    logger.debug(`[SummaryRepository] Generando resumen anual para el año ID ${yearId}`);
    
    // Obtenemos los meses del año
    const [months] = await db.query(
      'SELECT id, month_number, month_name FROM months WHERE year_id = ? ORDER BY month_number ASC',
      [yearId]
    );

    const summaryByMonth = [];

    for (const m of months) {
      // Ingresos
      const [[inc]] = await db.query(
        'SELECT COALESCE(SUM(amount), 0) as total FROM incomes WHERE month_id = ?',
        [m.id]
      );

      // Ahorro
      const [[sav]] = await db.query(
        'SELECT COALESCE(SUM(amount), 0) as total FROM savings WHERE month_id = ?',
        [m.id]
      );

      // Gastos Reales Presupuestados
      const [[budExp]] = await db.query(
        'SELECT COALESCE(SUM(real_amount), 0) as real_total, COALESCE(SUM(budget_amount), 0) as budget_total FROM budget_expenses WHERE month_id = ?',
        [m.id]
      );

      // Gastos Extra
      const [[extExp]] = await db.query(
        'SELECT COALESCE(SUM(amount), 0) as total FROM extra_expenses WHERE month_id = ?',
        [m.id]
      );

      // Gastos pagados con ahorros (retiros)
      const [[wd]] = await db.query(
        `SELECT
          (SELECT COALESCE(SUM(real_amount), 0) FROM budget_expenses WHERE month_id = ? AND LOWER(TRIM(payment_method)) = 'retiro de ahorros') +
          (SELECT COALESCE(SUM(amount), 0) FROM extra_expenses WHERE month_id = ? AND LOWER(TRIM(payment_method)) = 'retiro de ahorros') AS total`,
        [m.id, m.id]
      );
      const savingsWithdrawn = parseFloat(wd?.total || 0);

      const totalIncome = parseFloat(inc?.total || 0);
      const totalSaving = parseFloat(sav?.total || 0);
      const totalFixedBudget = parseFloat(budExp?.budget_total || 0);
      const totalRealBudget = parseFloat(budExp?.real_total || 0);
      const totalExtra = parseFloat(extExp?.total || 0);
      const totalExpenses = totalRealBudget + totalExtra;
      const remaining = totalIncome - (totalExpenses - savingsWithdrawn) - totalSaving;

      summaryByMonth.push({
        monthId: m.id,
        monthNumber: m.month_number,
        monthName: m.month_name,
        income: totalIncome,
        expenses: totalExpenses,
        savings: totalSaving,
        savingsWithdrawn,
        fixed: totalFixedBudget,
        remaining
      });
    }

    return summaryByMonth;
  }

  async getCategoryExpensesByYear(yearId) {
    logger.debug(`[SummaryRepository] Generando desglose anual por categoría para año ID ${yearId}`);

    const [rows] = await db.query(
      `SELECT 
        m.month_number,
        m.month_name,
        c.id as category_id,
        c.name as category_name,
        c.color as category_color,
        (
          COALESCE((SELECT SUM(be.real_amount) FROM budget_expenses be WHERE be.month_id = m.id AND be.category_id = c.id), 0) +
          COALESCE((SELECT SUM(ee.amount) FROM extra_expenses ee WHERE ee.month_id = m.id AND ee.category_id = c.id), 0)
        ) as total_spent
       FROM months m
       CROSS JOIN categories c
       WHERE m.year_id = ?
       ORDER BY m.month_number ASC, c.id ASC`,
      [yearId]
    );

    return rows;
  }

  async getMonthCategoryWeeklyBreakdown(monthId) {
    logger.debug(`[SummaryRepository] Generando desglose mensual por categoría y semana para mes ID ${monthId}`);

    const [categories] = await db.query('SELECT * FROM categories ORDER BY id ASC');
    const [weeks] = await db.query('SELECT * FROM weeks WHERE month_id = ? ORDER BY week_number ASC', [monthId]);

    const result = [];

    for (const cat of categories) {
      const catWeekly = {
        categoryId: cat.id,
        categoryName: cat.name,
        categoryColor: cat.color,
        categoryIcon: cat.icon,
        weeks: [],
        monthTotal: 0
      };

      let categoryMonthTotal = 0;

      for (const w of weeks) {
        const [[bud]] = await db.query(
          'SELECT COALESCE(SUM(real_amount), 0) as total FROM budget_expenses WHERE month_id = ? AND week_id = ? AND category_id = ?',
          [monthId, w.id, cat.id]
        );
        const [[ext]] = await db.query(
          'SELECT COALESCE(SUM(amount), 0) as total FROM extra_expenses WHERE month_id = ? AND week_id = ? AND category_id = ?',
          [monthId, w.id, cat.id]
        );

        const weekTotal = parseFloat(bud?.total || 0) + parseFloat(ext?.total || 0);
        categoryMonthTotal += weekTotal;

        catWeekly.weeks.push({
          weekId: w.id,
          weekNumber: w.week_number,
          total: weekTotal
        });
      }

      catWeekly.monthTotal = categoryMonthTotal;
      result.push(catWeekly);
    }

    return result;
  }
}

module.exports = new SummaryRepository();
