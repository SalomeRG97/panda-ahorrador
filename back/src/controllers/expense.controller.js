const expenseService = require('../services/expense.service');
const logger = require('../config/logger');
const recurrenceService = require('../services/recurrence.service');

class ExpenseController {
  // GASTOS PRESUPUESTADOS
  async createBudget(req, res, next) {
    try {
      logger.info('[ExpenseController] POST /api/expenses/budget');
      if (req.body.recurrence && req.body.recurrence.frequency) {
        const { date, concept, budget_amount, category_id, month_id } = req.body;
        if (!month_id || !category_id || !date || !concept || budget_amount == null) {
          throw { statusCode: 400, message: 'Faltan campos obligatorios para el gasto presupuestado' };
        }
        const result = await recurrenceService.createSeries(req.user.id, req.body);
        return res.status(201).json({ success: true, data: { id: null, ...req.body, ...result } });
      }
      const id = await expenseService.createBudgetExpense(req.body);
      res.status(201).json({ success: true, data: { id, ...req.body } });
    } catch (error) {
      next(error);
    }
  }

  async deleteBudgetSeries(req, res, next) {
    try {
      const { id } = req.params;
      logger.info(`[ExpenseController] DELETE /api/expenses/budget/${id}/series`);
      await recurrenceService.deleteSeriesFromExpense(req.user.id, parseInt(id, 10));
      res.json({ success: true, message: 'Serie eliminada desde esta fecha' });
    } catch (error) {
      next(error);
    }
  }

  async updateBudget(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.effectiveUserId || req.user.id;
      const scope = req.body.scope || 'single';
      logger.info(`[ExpenseController] PUT /api/expenses/budget/${id} (scope: ${scope})`);
      await recurrenceService.updateBudgetWithScope(userId, parseInt(id, 10), req.body, scope);
      res.json({ success: true, message: 'Gasto presupuestado actualizado' });
    } catch (error) {
      next(error);
    }
  }

  async deleteBudget(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.effectiveUserId || req.user.id;
      const scope = req.query.scope || req.body?.scope || 'single';
      logger.info(`[ExpenseController] DELETE /api/expenses/budget/${id} (scope: ${scope})`);
      await recurrenceService.deleteBudgetWithScope(userId, parseInt(id, 10), scope);
      res.json({ success: true, message: 'Gasto presupuestado eliminado' });
    } catch (error) {
      next(error);
    }
  }

  // GASTOS EXTRA
  async createExtra(req, res, next) {
    try {
      logger.info('[ExpenseController] POST /api/expenses/extra');
      const id = await expenseService.createExtraExpense(req.body);
      res.status(201).json({ success: true, data: { id, ...req.body } });
    } catch (error) {
      next(error);
    }
  }

  async updateExtra(req, res, next) {
    try {
      const { id } = req.params;
      logger.info(`[ExpenseController] PUT /api/expenses/extra/${id}`);
      await expenseService.updateExtraExpense(id, req.body);
      res.json({ success: true, message: 'Gasto extra actualizado' });
    } catch (error) {
      next(error);
    }
  }

  async deleteExtra(req, res, next) {
    try {
      const { id } = req.params;
      logger.info(`[ExpenseController] DELETE /api/expenses/extra/${id}`);
      await expenseService.deleteExtraExpense(id);
      res.json({ success: true, message: 'Gasto extra eliminado' });
    } catch (error) {
      next(error);
    }
  }

  // GASTOS PENDIENTES
  async getPendingBudget(req, res, next) {
    try {
      const userId = req.effectiveUserId || req.user.id;
      logger.info(`[ExpenseController] GET /api/expenses/pending (userId: ${userId})`);
      const data = await expenseService.getPendingBudgetExpenses(userId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ExpenseController();
