const expenseRepository = require('../repositories/expense.repository');
const weekRepository = require('../repositories/week.repository');
const ownershipRepository = require('../repositories/ownership.repository');
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

  async createBudgetExpense(expenseData, userId = null) {
    let { month_id, category_id, date, concept, budget_amount } = expenseData;
    if (!month_id || !category_id || !date || !concept || budget_amount == null) {
      throw { statusCode: 400, message: 'Faltan campos obligatorios para el gasto presupuestado' };
    }

    const ownerId = await ownershipRepository.getMonthOwnerId(month_id);
    if (!ownerId || (userId != null && Number(ownerId) !== Number(userId))) {
      throw { statusCode: 404, message: 'Mes no encontrado' };
    }

    if (date) {
      const matchedWeek = await weekRepository.findWeekByDate(date, month_id, ownerId);
      if (matchedWeek) {
        const newMonthOwnerId = await ownershipRepository.getMonthOwnerId(matchedWeek.month_id);
        if (!newMonthOwnerId || Number(newMonthOwnerId) !== Number(ownerId)) {
          throw { statusCode: 404, message: 'Mes no encontrado' };
        }
        expenseData.week_id = matchedWeek.id;
        expenseData.month_id = matchedWeek.month_id;
      }
    }

    return await expenseRepository.createBudgetExpense(expenseData);
  }

  async updateBudgetExpense(id, expenseData, userId = null) {
    const ownerId = await ownershipRepository.getBudgetExpenseOwnerId(id);
    if (!ownerId || (userId != null && Number(ownerId) !== Number(userId))) {
      throw { statusCode: 404, message: 'Gasto presupuestado no encontrado' };
    }

    const { date, month_id } = expenseData;
    if (month_id != null) {
      const monthOwnerId = await ownershipRepository.getMonthOwnerId(month_id);
      if (!monthOwnerId || Number(monthOwnerId) !== Number(ownerId)) {
        throw { statusCode: 404, message: 'Mes no encontrado' };
      }
    }

    if (date) {
      const currentExpense = await expenseRepository.getBudgetExpenseById(id);
      const currentDateStr = currentExpense?.date ? String(currentExpense.date).slice(0, 10) : null;
      const newDateStr = String(date).slice(0, 10);
      const dateChanged = !currentDateStr || currentDateStr !== newDateStr;
      const monthChanged = month_id != null && currentExpense && Number(month_id) !== Number(currentExpense.month_id);

      if (dateChanged || monthChanged || !currentExpense?.week_id) {
        const baseMonthId = month_id || currentExpense?.month_id;
        const matchedWeek = await weekRepository.findWeekByDate(date, baseMonthId, ownerId);
        if (matchedWeek) {
          const newMonthOwnerId = await ownershipRepository.getMonthOwnerId(matchedWeek.month_id);
          if (!newMonthOwnerId || Number(newMonthOwnerId) !== Number(ownerId)) {
            throw { statusCode: 404, message: 'Mes no encontrado' };
          }
          expenseData.week_id = matchedWeek.id;
          expenseData.month_id = matchedWeek.month_id;
        }
      }
    }

    return await expenseRepository.updateBudgetExpense(id, expenseData);
  }

  async deleteBudgetExpense(id, userId = null) {
    const ownerId = await ownershipRepository.getBudgetExpenseOwnerId(id);
    if (!ownerId || (userId != null && Number(ownerId) !== Number(userId))) {
      throw { statusCode: 404, message: 'Gasto presupuestado no encontrado' };
    }
    return await expenseRepository.deleteBudgetExpense(id);
  }

  async createExtraExpense(expenseData, userId = null) {
    let { month_id, category_id, date, concept, amount } = expenseData;
    if (!month_id || !category_id || !date || !concept || amount == null) {
      throw { statusCode: 400, message: 'Faltan campos obligatorios para el gasto extra' };
    }

    const ownerId = await ownershipRepository.getMonthOwnerId(month_id);
    if (!ownerId || (userId != null && Number(ownerId) !== Number(userId))) {
      throw { statusCode: 404, message: 'Mes no encontrado' };
    }

    if (date) {
      const matchedWeek = await weekRepository.findWeekByDate(date, month_id, ownerId);
      if (matchedWeek) {
        const newMonthOwnerId = await ownershipRepository.getMonthOwnerId(matchedWeek.month_id);
        if (!newMonthOwnerId || Number(newMonthOwnerId) !== Number(ownerId)) {
          throw { statusCode: 404, message: 'Mes no encontrado' };
        }
        expenseData.week_id = matchedWeek.id;
        expenseData.month_id = matchedWeek.month_id;
      }
    }

    return await expenseRepository.createExtraExpense(expenseData);
  }

  async updateExtraExpense(id, expenseData, userId = null) {
    const ownerId = await ownershipRepository.getExtraExpenseOwnerId(id);
    if (!ownerId || (userId != null && Number(ownerId) !== Number(userId))) {
      throw { statusCode: 404, message: 'Gasto extra no encontrado' };
    }

    const { date, month_id } = expenseData;
    if (month_id != null) {
      const monthOwnerId = await ownershipRepository.getMonthOwnerId(month_id);
      if (!monthOwnerId || Number(monthOwnerId) !== Number(ownerId)) {
        throw { statusCode: 404, message: 'Mes no encontrado' };
      }
    }

    if (date) {
      const currentExpense = await expenseRepository.getExtraExpenseById(id);
      const currentDateStr = currentExpense?.date ? String(currentExpense.date).slice(0, 10) : null;
      const newDateStr = String(date).slice(0, 10);
      const dateChanged = !currentDateStr || currentDateStr !== newDateStr;
      const monthChanged = month_id != null && currentExpense && Number(month_id) !== Number(currentExpense.month_id);

      if (dateChanged || monthChanged || !currentExpense?.week_id) {
        const baseMonthId = month_id || currentExpense?.month_id;
        const matchedWeek = await weekRepository.findWeekByDate(date, baseMonthId, ownerId);
        if (matchedWeek) {
          const newMonthOwnerId = await ownershipRepository.getMonthOwnerId(matchedWeek.month_id);
          if (!newMonthOwnerId || Number(newMonthOwnerId) !== Number(ownerId)) {
            throw { statusCode: 404, message: 'Mes no encontrado' };
          }
          expenseData.week_id = matchedWeek.id;
          expenseData.month_id = matchedWeek.month_id;
        }
      }
    }

    return await expenseRepository.updateExtraExpense(id, expenseData);
  }

  async deleteExtraExpense(id, userId = null) {
    const ownerId = await ownershipRepository.getExtraExpenseOwnerId(id);
    if (!ownerId || (userId != null && Number(ownerId) !== Number(userId))) {
      throw { statusCode: 404, message: 'Gasto extra no encontrado' };
    }
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
