const expenseRepository = require('../repositories/expense.repository');
const weekRepository = require('../repositories/week.repository');
const logger = require('../config/logger');

class ExpenseService {
  async getBudgetExpensesByMonth(monthId) {
    return await expenseRepository.getBudgetExpensesByMonth(monthId);
  }

  async getExtraExpensesByMonth(monthId) {
    return await expenseRepository.getExtraExpensesByMonth(monthId);
  }

  async getWeekExpenses(weekId) {
    logger.info(`[ExpenseService] Obteniendo gastos para la semana ID ${weekId}`);
    const budgetExpenses = await expenseRepository.getBudgetExpensesByWeek(weekId);
    const extraExpenses = await expenseRepository.getExtraExpensesByWeek(weekId);
    return { budgetExpenses, extraExpenses };
  }

  async createBudgetExpense(expenseData) {
    let { month_id, category_id, date, concept, budget_amount } = expenseData;
    if (!month_id || !category_id || !date || !concept || budget_amount == null) {
      throw { statusCode: 400, message: 'Faltan campos obligatorios para el gasto presupuestado' };
    }

    if (date) {
      const matchedWeek = await weekRepository.findWeekByDate(date, month_id);
      if (matchedWeek) {
        expenseData.week_id = matchedWeek.id;
        expenseData.month_id = matchedWeek.month_id;
      }
    }

    return await expenseRepository.createBudgetExpense(expenseData);
  }

  async updateBudgetExpense(id, expenseData) {
    const { date, month_id } = expenseData;
    if (date) {
      const matchedWeek = await weekRepository.findWeekByDate(date, month_id);
      if (matchedWeek) {
        expenseData.week_id = matchedWeek.id;
        expenseData.month_id = matchedWeek.month_id;
      }
    }
    return await expenseRepository.updateBudgetExpense(id, expenseData);
  }

  async deleteBudgetExpense(id) {
    return await expenseRepository.deleteBudgetExpense(id);
  }

  async createExtraExpense(expenseData) {
    let { month_id, category_id, date, concept, amount } = expenseData;
    if (!month_id || !category_id || !date || !concept || amount == null) {
      throw { statusCode: 400, message: 'Faltan campos obligatorios para el gasto extra' };
    }

    if (date) {
      const matchedWeek = await weekRepository.findWeekByDate(date, month_id);
      if (matchedWeek) {
        expenseData.week_id = matchedWeek.id;
        expenseData.month_id = matchedWeek.month_id;
      }
    }

    return await expenseRepository.createExtraExpense(expenseData);
  }

  async updateExtraExpense(id, expenseData) {
    const { date, month_id } = expenseData;
    if (date) {
      const matchedWeek = await weekRepository.findWeekByDate(date, month_id);
      if (matchedWeek) {
        expenseData.week_id = matchedWeek.id;
        expenseData.month_id = matchedWeek.month_id;
      }
    }
    return await expenseRepository.updateExtraExpense(id, expenseData);
  }

  async deleteExtraExpense(id) {
    return await expenseRepository.deleteExtraExpense(id);
  }

  async _findWeekIdForDate(monthId, dateStr) {
    const matchedWeek = await weekRepository.findWeekByDate(dateStr, monthId);
    return matchedWeek ? matchedWeek.id : null;
  }

  async getPendingBudgetExpenses(userId) {
    logger.info(`[ExpenseService] Obteniendo gastos pendientes para usuario ${userId}`);
    return await expenseRepository.getPendingBudgetExpenses(userId);
  }
}

module.exports = new ExpenseService();
