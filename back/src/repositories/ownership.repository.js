const db = require('../config/database');
const logger = require('../config/logger');

class OwnershipRepository {
  async getYearOwnerId(yearId) {
    if (!yearId || isNaN(Number(yearId))) return null;
    const [rows] = await db.query('SELECT user_id FROM years WHERE id = ?', [yearId]);
    return rows[0] ? rows[0].user_id : null;
  }

  async getMonthOwnerId(monthId) {
    if (!monthId || isNaN(Number(monthId))) return null;
    const [rows] = await db.query(
      `SELECT y.user_id
       FROM months m
       JOIN years y ON m.year_id = y.id
       WHERE m.id = ?`,
      [monthId]
    );
    return rows[0] ? rows[0].user_id : null;
  }

  async getWeekOwnerId(weekId) {
    if (!weekId || isNaN(Number(weekId))) return null;
    const [rows] = await db.query(
      `SELECT y.user_id
       FROM weeks w
       JOIN months m ON w.month_id = m.id
       JOIN years y ON m.year_id = y.id
       WHERE w.id = ?`,
      [weekId]
    );
    return rows[0] ? rows[0].user_id : null;
  }

  async getIncomeOwnerId(incomeId) {
    if (!incomeId || isNaN(Number(incomeId))) return null;
    const [rows] = await db.query(
      `SELECT y.user_id
       FROM incomes i
       JOIN months m ON i.month_id = m.id
       JOIN years y ON m.year_id = y.id
       WHERE i.id = ?`,
      [incomeId]
    );
    return rows[0] ? rows[0].user_id : null;
  }

  async getSavingOwnerId(savingId) {
    if (!savingId || isNaN(Number(savingId))) return null;
    const [rows] = await db.query(
      `SELECT y.user_id
       FROM savings s
       JOIN months m ON s.month_id = m.id
       JOIN years y ON m.year_id = y.id
       WHERE s.id = ?`,
      [savingId]
    );
    return rows[0] ? rows[0].user_id : null;
  }

  async getBudgetExpenseOwnerId(expenseId) {
    if (!expenseId || isNaN(Number(expenseId))) return null;
    const [rows] = await db.query(
      `SELECT y.user_id
       FROM budget_expenses be
       JOIN months m ON be.month_id = m.id
       JOIN years y ON m.year_id = y.id
       WHERE be.id = ?`,
      [expenseId]
    );
    return rows[0] ? rows[0].user_id : null;
  }

  async getExtraExpenseOwnerId(expenseId) {
    if (!expenseId || isNaN(Number(expenseId))) return null;
    const [rows] = await db.query(
      `SELECT y.user_id
       FROM extra_expenses ee
       JOIN months m ON ee.month_id = m.id
       JOIN years y ON m.year_id = y.id
       WHERE ee.id = ?`,
      [expenseId]
    );
    return rows[0] ? rows[0].user_id : null;
  }

  async getMonthChallengeOwnerId(monthChallengeId) {
    if (!monthChallengeId || isNaN(Number(monthChallengeId))) return null;
    const [rows] = await db.query(
      `SELECT y.user_id
       FROM month_challenges mc
       JOIN months m ON mc.month_id = m.id
       JOIN years y ON m.year_id = y.id
       WHERE mc.id = ?`,
      [monthChallengeId]
    );
    return rows[0] ? rows[0].user_id : null;
  }

  async getOwnerId(resourceType, id) {
    switch (resourceType) {
      case 'year':
        return this.getYearOwnerId(id);
      case 'month':
        return this.getMonthOwnerId(id);
      case 'week':
        return this.getWeekOwnerId(id);
      case 'income':
        return this.getIncomeOwnerId(id);
      case 'saving':
        return this.getSavingOwnerId(id);
      case 'budgetExpense':
      case 'budget_expense':
        return this.getBudgetExpenseOwnerId(id);
      case 'extraExpense':
      case 'extra_expense':
        return this.getExtraExpenseOwnerId(id);
      case 'monthChallenge':
      case 'month_challenge':
        return this.getMonthChallengeOwnerId(id);
      default:
        logger.warn(`[OwnershipRepository] Tipo de recurso desconocido: ${resourceType}`);
        return null;
    }
  }
}

module.exports = new OwnershipRepository();

