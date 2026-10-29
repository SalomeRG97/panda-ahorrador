const incomeService = require('../services/income.service');
const logger = require('../config/logger');

class IncomeController {
  async getByMonth(req, res, next) {
    try {
      const { monthId } = req.params;
      logger.info(`[IncomeController] GET /api/incomes/month/${monthId}`);
      const incomes = await incomeService.getIncomesByMonth(monthId);
      res.json({ success: true, data: incomes });
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const monthId = req.body.monthId || req.body.month_id;
      const { date, concept, amount } = req.body;
      const userId = req.effectiveUserId || req.user.id;
      logger.info(`[IncomeController] POST /api/incomes -> Mes: ${monthId}, Concepto: ${concept}, userId: ${userId}`);
      const insertId = await incomeService.createIncome(monthId, date, concept, amount, userId);
      res.status(201).json({ success: true, data: { id: insertId, month_id: monthId, monthId, date, concept, amount } });
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const { id } = req.params;
      const { date, concept, amount } = req.body;
      const monthId = req.body.monthId || req.body.month_id;
      const userId = req.effectiveUserId || req.user.id;
      logger.info(`[IncomeController] PUT /api/incomes/${id} (userId: ${userId})`);
      await incomeService.updateIncome(id, date, concept, amount, userId, monthId);
      res.json({ success: true, message: 'Ingreso actualizado' });
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const { id } = req.params;
      const userId = req.effectiveUserId || req.user.id;
      logger.info(`[IncomeController] DELETE /api/incomes/${id} (userId: ${userId})`);
      await incomeService.deleteIncome(id, userId);
      res.json({ success: true, message: 'Ingreso eliminado' });
    } catch (error) {
      next(error);
    }
  }

  async setSaving(req, res, next) {
    try {
      const monthId = req.body.monthId || req.body.month_id;
      const { amount } = req.body;
      const userId = req.effectiveUserId || req.user.id;
      logger.info(`[IncomeController] POST /api/incomes/saving -> Mes ${monthId}, Ahorro: ${amount}, userId: ${userId}`);
      await incomeService.setMonthSaving(monthId, amount, userId);
      res.json({ success: true, message: 'Ahorro actualizado correctamente' });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new IncomeController();
