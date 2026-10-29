const expenseRepository = require('../repositories/expense.repository');
const monthRepository = require('../repositories/month.repository');
const weekRepository = require('../repositories/week.repository');
const ownershipRepository = require('../repositories/ownership.repository');
const categoryRepository = require('../repositories/category.repository');
const paymentMethodRepository = require('../repositories/payment-method.repository');
const logger = require('../config/logger');
const AppError = require('../utils/app-error');

const RESERVED_PAYMENT_METHOD = 'retiro de ahorros';

class ExpenseService {
  async assertDateInMonth(dateStr, monthId) {
    const month = await monthRepository.getById(monthId);
    if (!month) {
      throw new AppError(404, 'Mes no encontrado');
    }

    const cleanDate = String(dateStr).slice(0, 10);
    const [yStr, mStr] = cleanDate.split('-');
    const dateYear = Number(yStr);
    const dateMonth = Number(mStr);

    if (
      month.year !== undefined &&
      month.month_number !== undefined &&
      (dateYear !== Number(month.year) || dateMonth !== Number(month.month_number))
    ) {
      throw new AppError(400, 'La fecha del gasto no corresponde al mes indicado');
    }

    return month;
  }

  async assertValidCategoryForUser(categoryId, userId) {
    if (categoryId === undefined || categoryId === null) {
      throw new AppError(400, 'La categoría es obligatoria');
    }

    const category = await categoryRepository.getById(categoryId);
    if (!category) {
      throw new AppError(400, 'Categoría inválida o no encontrada');
    }

    const isGlobal =
      category.user_id === null ||
      category.user_id === undefined ||
      Boolean(category.isGlobal);

    if (!isGlobal && Number(category.user_id) !== Number(userId)) {
      throw new AppError(400, 'La categoría seleccionada no pertenece al usuario');
    }
  }

  async assertValidPaymentMethodForUser(paymentMethod, userId, currentPaymentMethod = null) {
    if (paymentMethod === undefined || paymentMethod === null) {
      return;
    }

    if (typeof paymentMethod === 'number') {
      const pmById = await paymentMethodRepository.getById(paymentMethod);
      if (!pmById || Number(pmById.user_id) !== Number(userId)) {
        throw new AppError(400, 'El medio de pago no es válido o no pertenece al usuario');
      }
      return;
    }

    const trimmed = String(paymentMethod).trim();
    if (!trimmed) {
      return;
    }

    if (trimmed.toLowerCase() === RESERVED_PAYMENT_METHOD) {
      return;
    }

    if (
      currentPaymentMethod &&
      String(currentPaymentMethod).trim().toLowerCase() === trimmed.toLowerCase()
    ) {
      return;
    }

    const pmByName = await paymentMethodRepository.findByName(userId, trimmed);
    if (pmByName && Number(pmByName.user_id) === Number(userId)) {
      return;
    }

    if (/^\d+$/.test(trimmed)) {
      const pmById = await paymentMethodRepository.getById(Number(trimmed));
      if (pmById && Number(pmById.user_id) === Number(userId)) {
        return;
      }
    }

    throw new AppError(400, 'El medio de pago no es válido o no pertenece al usuario');
  }

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
    const { month_id, category_id, date, payment_method, payment_method_id } = expenseData;

    const ownerId = await ownershipRepository.getMonthOwnerId(month_id);
    if (!ownerId || (userId != null && Number(ownerId) !== Number(userId))) {
      throw new AppError(404, 'Mes no encontrado');
    }

    await this.assertDateInMonth(date, month_id);

    const effectiveUserId = userId != null ? userId : ownerId;
    await this.assertValidCategoryForUser(category_id, effectiveUserId);
    if (payment_method_id !== undefined && payment_method_id !== null) {
      await this.assertValidPaymentMethodForUser(Number(payment_method_id), effectiveUserId);
    }
    await this.assertValidPaymentMethodForUser(payment_method, effectiveUserId);

    if (date) {
      const matchedWeek = await weekRepository.findWeekByDate(date, month_id, ownerId);
      if (matchedWeek) {
        const newMonthOwnerId = await ownershipRepository.getMonthOwnerId(matchedWeek.month_id);
        if (!newMonthOwnerId || Number(newMonthOwnerId) !== Number(ownerId)) {
          throw new AppError(404, 'Mes no encontrado');
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
      throw new AppError(404, 'Gasto presupuestado no encontrado');
    }

    const effectiveUserId = userId != null ? userId : ownerId;
    const currentExpense = await expenseRepository.getBudgetExpenseById(id);

    if (expenseData.category_id !== undefined && expenseData.category_id !== null) {
      await this.assertValidCategoryForUser(expenseData.category_id, effectiveUserId);
    }
    if (expenseData.payment_method_id !== undefined && expenseData.payment_method_id !== null) {
      await this.assertValidPaymentMethodForUser(Number(expenseData.payment_method_id), effectiveUserId);
    }
    if (expenseData.payment_method !== undefined) {
      await this.assertValidPaymentMethodForUser(
        expenseData.payment_method,
        effectiveUserId,
        currentExpense?.payment_method
      );
    }

    const { date, month_id } = expenseData;
    if (month_id != null) {
      const monthOwnerId = await ownershipRepository.getMonthOwnerId(month_id);
      if (!monthOwnerId || Number(monthOwnerId) !== Number(ownerId)) {
        throw new AppError(404, 'Mes no encontrado');
      }
      const effectiveDate = date || currentExpense?.date;
      if (effectiveDate) {
        await this.assertDateInMonth(effectiveDate, month_id);
      }
    }

    if (date) {
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
            throw new AppError(404, 'Mes no encontrado');
          }
          expenseData.week_id = matchedWeek.id;
          expenseData.month_id = matchedWeek.month_id;
        } else if (baseMonthId != null) {
          await this.assertDateInMonth(date, baseMonthId);
        }
      }
    }

    return await expenseRepository.updateBudgetExpense(id, expenseData);
  }

  async deleteBudgetExpense(id, userId = null) {
    const ownerId = await ownershipRepository.getBudgetExpenseOwnerId(id);
    if (!ownerId || (userId != null && Number(ownerId) !== Number(userId))) {
      throw new AppError(404, 'Gasto presupuestado no encontrado');
    }
    return await expenseRepository.deleteBudgetExpense(id);
  }

  async createExtraExpense(expenseData, userId = null) {
    const { month_id, category_id, date, payment_method, payment_method_id } = expenseData;

    const ownerId = await ownershipRepository.getMonthOwnerId(month_id);
    if (!ownerId || (userId != null && Number(ownerId) !== Number(userId))) {
      throw new AppError(404, 'Mes no encontrado');
    }

    await this.assertDateInMonth(date, month_id);

    const effectiveUserId = userId != null ? userId : ownerId;
    await this.assertValidCategoryForUser(category_id, effectiveUserId);
    if (payment_method_id !== undefined && payment_method_id !== null) {
      await this.assertValidPaymentMethodForUser(Number(payment_method_id), effectiveUserId);
    }
    await this.assertValidPaymentMethodForUser(payment_method, effectiveUserId);

    if (date) {
      const matchedWeek = await weekRepository.findWeekByDate(date, month_id, ownerId);
      if (matchedWeek) {
        const newMonthOwnerId = await ownershipRepository.getMonthOwnerId(matchedWeek.month_id);
        if (!newMonthOwnerId || Number(newMonthOwnerId) !== Number(ownerId)) {
          throw new AppError(404, 'Mes no encontrado');
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
      throw new AppError(404, 'Gasto extra no encontrado');
    }

    const effectiveUserId = userId != null ? userId : ownerId;
    const currentExpense = await expenseRepository.getExtraExpenseById(id);

    if (expenseData.category_id !== undefined && expenseData.category_id !== null) {
      await this.assertValidCategoryForUser(expenseData.category_id, effectiveUserId);
    }
    if (expenseData.payment_method_id !== undefined && expenseData.payment_method_id !== null) {
      await this.assertValidPaymentMethodForUser(Number(expenseData.payment_method_id), effectiveUserId);
    }
    if (expenseData.payment_method !== undefined) {
      await this.assertValidPaymentMethodForUser(
        expenseData.payment_method,
        effectiveUserId,
        currentExpense?.payment_method
      );
    }

    const { date, month_id } = expenseData;
    if (month_id != null) {
      const monthOwnerId = await ownershipRepository.getMonthOwnerId(month_id);
      if (!monthOwnerId || Number(monthOwnerId) !== Number(ownerId)) {
        throw new AppError(404, 'Mes no encontrado');
      }
      const effectiveDate = date || currentExpense?.date;
      if (effectiveDate) {
        await this.assertDateInMonth(effectiveDate, month_id);
      }
    }

    if (date) {
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
            throw new AppError(404, 'Mes no encontrado');
          }
          expenseData.week_id = matchedWeek.id;
          expenseData.month_id = matchedWeek.month_id;
        } else if (baseMonthId != null) {
          await this.assertDateInMonth(date, baseMonthId);
        }
      }
    }

    return await expenseRepository.updateExtraExpense(id, expenseData);
  }

  async deleteExtraExpense(id, userId = null) {
    const ownerId = await ownershipRepository.getExtraExpenseOwnerId(id);
    if (!ownerId || (userId != null && Number(ownerId) !== Number(userId))) {
      throw new AppError(404, 'Gasto extra no encontrado');
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
