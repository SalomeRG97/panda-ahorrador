const weekRepository = require('../repositories/week.repository');
const expenseRepository = require('../repositories/expense.repository');
const categoryRepository = require('../repositories/category.repository');
const logger = require('../config/logger');

class WeekService {
  async getWeeksByMonth(monthId) {
    return await weekRepository.getByMonthId(monthId);
  }

  async getWeekDetail(weekId) {
    logger.info(`[WeekService] Obteniendo resumen completo de semana ID ${weekId}`);
    const week = await weekRepository.getById(weekId);
    if (!week) {
      throw { statusCode: 404, message: 'Semana no encontrada' };
    }

    const budgetExpenses = await expenseRepository.getBudgetExpensesByWeek(weekId);
    const extraExpenses = await expenseRepository.getExtraExpensesByWeek(weekId);
    const categories = await categoryRepository.getAll();

    // Calcular totales por categoría
    const categoryTotals = categories.map(cat => {
      const catBudget = budgetExpenses.filter(e => e.category_id === cat.id);
      const catExtra = extraExpenses.filter(e => e.category_id === cat.id);

      const totalBudget = catBudget.reduce((sum, e) => sum + parseFloat(e.budget_amount || 0), 0);
      const totalRealBudget = catBudget.reduce((sum, e) => sum + parseFloat(e.real_amount || 0), 0);
      const totalExtra = catExtra.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
      const totalSpent = totalRealBudget + totalExtra;

      return {
        categoryId: cat.id,
        categoryName: cat.name,
        categoryColor: cat.color,
        categoryIcon: cat.icon,
        totalBudget,
        totalRealBudget,
        totalExtra,
        totalSpent
      };
    });

    // Agregar total para gastos sin categoría (category_id NULL o eliminada)
    const validCatIds = new Set(categories.map(c => c.id));
    const uncatBudget = budgetExpenses.filter(e => !e.category_id || !validCatIds.has(e.category_id));
    const uncatExtra = extraExpenses.filter(e => !e.category_id || !validCatIds.has(e.category_id));

    if (uncatBudget.length > 0 || uncatExtra.length > 0) {
      const totalBudget = uncatBudget.reduce((sum, e) => sum + parseFloat(e.budget_amount || 0), 0);
      const totalRealBudget = uncatBudget.reduce((sum, e) => sum + parseFloat(e.real_amount || 0), 0);
      const totalExtra = uncatExtra.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
      const totalSpent = totalRealBudget + totalExtra;

      categoryTotals.push({
        categoryId: 0,
        categoryName: 'Sin Categorizar',
        categoryColor: '#FFFFFF',
        categoryIcon: '🏷️',
        totalBudget,
        totalRealBudget,
        totalExtra,
        totalSpent
      });
    }

    // Calcular totales por medio de pago
    const paymentMap = new Map();

    const addExpenseToMap = (pmRaw, budgetAmt, realAmt, extraAmt) => {
      const pm = (pmRaw && pmRaw.trim()) ? pmRaw.trim() : 'Sin especificar';
      if (!paymentMap.has(pm)) {
        paymentMap.set(pm, {
          paymentMethod: pm,
          totalBudget: 0,
          totalRealBudget: 0,
          totalExtra: 0,
          totalSpent: 0
        });
      }
      const item = paymentMap.get(pm);
      item.totalBudget += budgetAmt;
      item.totalRealBudget += realAmt;
      item.totalExtra += extraAmt;
      item.totalSpent += (realAmt + extraAmt);
    };

    budgetExpenses.forEach(e => {
      addExpenseToMap(e.payment_method, parseFloat(e.budget_amount || 0), parseFloat(e.real_amount || 0), 0);
    });

    extraExpenses.forEach(e => {
      addExpenseToMap(e.payment_method, 0, 0, parseFloat(e.amount || 0));
    });

    const paymentMethodTotals = Array.from(paymentMap.values());

    return {
      week,
      budgetExpenses,
      extraExpenses,
      categoryTotals,
      paymentMethodTotals
    };
  }
}

module.exports = new WeekService();
