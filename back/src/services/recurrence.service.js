const repo = require('../repositories/recurrence.repository');
const expenseRepository = require('../repositories/expense.repository');
const expenseService = require('./expense.service');
const logger = require('../config/logger');

const FREQUENCIES = ['daily', 'weekly', 'biweekly', 'monthly', 'yearly'];
const DAY_MS = 24 * 60 * 60 * 1000;

const pad = (n) => String(n).padStart(2, '0');
const toStr = (d) => `${d.getUTCFullYear()}-${pad(d.getUTCMonth() + 1)}-${pad(d.getUTCDate())}`;
const parse = (s) => {
  const [y, m, d] = String(s).slice(0, 10).split('-').map(Number);
  return new Date(Date.UTC(y, m - 1, d));
};
const daysInMonth = (year, month) => new Date(Date.UTC(year, month, 0)).getUTCDate();

/**
 * Fechas (YYYY-MM-DD) en las que la regla cae dentro del mes dado.
 * Mensual/anual: si el día no existe en ese mes (ej. 31), se usa el último día.
 */
function occurrencesInMonth(rule, year, month) {
  const start = String(rule.start_date).slice(0, 10);
  const end = rule.end_date ? String(rule.end_date).slice(0, 10) : null;
  const firstDay = `${year}-${pad(month)}-01`;
  const lastDay = `${year}-${pad(month)}-${pad(daysInMonth(year, month))}`;
  const dates = [];

  const push = (d) => {
    if (d >= start && (!end || d <= end) && d >= firstDay && d <= lastDay) dates.push(d);
  };

  const startDate = parse(start);

  switch (rule.frequency) {
    case 'daily':
    case 'weekly':
    case 'biweekly': {
      const step = rule.frequency === 'daily' ? 1 : rule.frequency === 'weekly' ? 7 : 14;
      const first = parse(firstDay);
      const last = parse(lastDay);
      let cursor = startDate;
      if (cursor < first) {
        const diffDays = Math.floor((first - cursor) / DAY_MS);
        cursor = new Date(cursor.getTime() + Math.floor(diffDays / step) * step * DAY_MS);
        while (cursor < first) cursor = new Date(cursor.getTime() + step * DAY_MS);
      }
      while (cursor <= last) {
        push(toStr(cursor));
        cursor = new Date(cursor.getTime() + step * DAY_MS);
      }
      break;
    }
    case 'monthly': {
      const day = Math.min(startDate.getUTCDate(), daysInMonth(year, month));
      push(`${year}-${pad(month)}-${pad(day)}`);
      break;
    }
    case 'yearly': {
      if (month === startDate.getUTCMonth() + 1) {
        const day = Math.min(startDate.getUTCDate(), daysInMonth(year, month));
        push(`${year}-${pad(month)}-${pad(day)}`);
      }
      break;
    }
    default:
      break;
  }
  return dates;
}

class RecurrenceService {
  async materializeForMonth(rule, monthRow) {
    const dates = occurrencesInMonth(rule, monthRow.year, monthRow.month_number);
    if (!dates.length) return 0;
    const existing = await repo.getExistingDates(rule.id, monthRow.id);
    let created = 0;
    for (const date of dates) {
      if (existing.has(date)) continue;
      const weekId = await repo.findWeekId(monthRow.id, date);
      await repo.insertOccurrence(rule, monthRow.id, weekId, date);
      created++;
    }
    return created;
  }

  /** Crea la regla y genera los gastos en todos los meses ya creados del usuario. */
  async createSeries(userId, data) {
    const { frequency, recurrence } = { frequency: data.recurrence?.frequency, recurrence: data.recurrence };
    if (!FREQUENCIES.includes(frequency)) {
      throw { statusCode: 400, message: 'Frecuencia de repetici\u00f3n no v\u00e1lida' };
    }
    const startDate = String(data.date).slice(0, 10);
    const endDate = recurrence.end_date ? String(recurrence.end_date).slice(0, 10) : null;
    if (endDate && endDate < startDate) {
      throw { statusCode: 400, message: 'La fecha final no puede ser anterior a la fecha del gasto' };
    }

    const ruleId = await repo.create(userId, {
      category_id: data.category_id,
      concept: data.concept,
      budget_amount: data.budget_amount,
      payment_method: data.payment_method,
      frequency,
      start_date: startDate,
      end_date: endDate,
    });
    const rule = await repo.getById(ruleId);

    const months = await repo.getMonthsForUser(userId);
    let total = 0;
    for (const m of months) total += await this.materializeForMonth(rule, m);
    logger.info(`[RecurrenceService] Serie ${ruleId} (${frequency}) cre\u00f3 ${total} gastos`);
    return { ruleId, created: total };
  }

  /** Al crear un a\u00f1o nuevo, aplica las series activas del usuario a sus meses. */
  async materializeForYear(userId, yearId) {
    const rules = await repo.getAllForUser(userId);
    if (!rules.length) return;
    const months = await repo.getMonthsForYear(yearId);
    let total = 0;
    for (const rule of rules) {
      for (const m of months) total += await this.materializeForMonth(rule, m);
    }
    logger.info(`[RecurrenceService] A\u00f1o ${yearId}: ${total} gastos recurrentes generados`);
  }

  async deleteSeriesFromExpense(userId, expenseId) {
    return await this.deleteBudgetWithScope(userId, expenseId, 'future');
  }

  /**
   * Elimina un gasto presupuestado respetando el alcance elegido:
   * - 'single': Borra solo este gasto puntual.
   * - 'future': Borra este gasto y las ocurrencias futuras (conservando las pasadas).
   * - 'all': Borra toda la serie (todas las ocurrencias pasadas y futuras) y la regla recurrente.
   */
  async deleteBudgetWithScope(userId, expenseId, scope = 'single') {
    const exp = await expenseRepository.getBudgetExpenseById(expenseId);
    if (!exp) {
      throw { statusCode: 404, message: 'Gasto presupuestado no encontrado' };
    }

    if (!exp.recurrence_id || scope === 'single') {
      logger.info(`[RecurrenceService] Eliminando gasto individual ID ${expenseId}`);
      await expenseRepository.deleteBudgetExpense(expenseId);
      return true;
    }

    if (scope === 'all') {
      logger.info(`[RecurrenceService] Eliminando toda la serie recurrente ID ${exp.recurrence_id}`);
      const rule = await repo.getById(exp.recurrence_id);
      if (rule && rule.user_id === userId) {
        await repo.deleteAllOccurrences(exp.recurrence_id);
        await repo.delete(exp.recurrence_id);
      } else {
        await expenseRepository.deleteBudgetExpense(expenseId);
      }
      return true;
    }

    if (scope === 'future') {
      logger.info(`[RecurrenceService] Eliminando ocurrencias futuras de serie ID ${exp.recurrence_id} desde ${exp.date}`);
      return await this.deleteSeriesFrom(userId, exp.recurrence_id, exp.date);
    }

    // Fallback por defecto
    await expenseRepository.deleteBudgetExpense(expenseId);
    return true;
  }

  /** Elimina esta ocurrencia y las siguientes; las anteriores se conservan. */
  async deleteSeriesFrom(userId, recurrenceId, fromDate) {
    const rule = await repo.getById(recurrenceId);
    if (!rule || rule.user_id !== userId) {
      throw { statusCode: 404, message: 'Serie no encontrada' };
    }
    const from = String(fromDate).slice(0, 10);
    await repo.deleteOccurrencesFrom(recurrenceId, from);
    if (String(rule.start_date).slice(0, 10) >= from) {
      await repo.delete(recurrenceId);
    } else {
      const prev = parse(from);
      prev.setUTCDate(prev.getUTCDate() - 1);
      await repo.setEndDate(recurrenceId, toStr(prev));
    }
    return true;
  }

  /**
   * Actualiza un gasto presupuestado respetando el alcance elegido:
   * - 'single': Actualiza solo este gasto puntual.
   * - 'future': Actualiza este y los gastos futuros (conservando montos reales individuales).
   * - 'all': Actualiza todas las ocurrencias de la serie (conservando montos reales individuales).
   */
  async updateBudgetWithScope(userId, expenseId, data, scope = 'single') {
    const exp = await expenseRepository.getBudgetExpenseById(expenseId);
    if (!exp) {
      throw { statusCode: 404, message: 'Gasto presupuestado no encontrado' };
    }

    if (!exp.recurrence_id || scope === 'single') {
      logger.info(`[RecurrenceService] Actualizando gasto individual ID ${expenseId}`);
      return await expenseService.updateBudgetExpense(expenseId, data);
    }

    const rule = await repo.getById(exp.recurrence_id);
    if (!rule || rule.user_id !== userId) {
      // Si no pertenece al usuario o la regla fue borrada, actualiza solo este gasto
      return await expenseService.updateBudgetExpense(expenseId, data);
    }

    const updatePayload = {
      category_id: data.category_id || rule.category_id,
      concept: data.concept || rule.concept,
      budget_amount: data.budget_amount !== undefined ? data.budget_amount : rule.budget_amount,
      payment_method: data.payment_method !== undefined ? data.payment_method : rule.payment_method,
    };

    if (scope === 'all') {
      logger.info(`[RecurrenceService] Actualizando toda la serie recurrente ID ${rule.id}`);
      await repo.updateRule(rule.id, updatePayload);
      await repo.updateAllOccurrences(rule.id, updatePayload);
      // El registro actual se actualiza también por si cambió de fecha o de valor real específico
      await expenseService.updateBudgetExpense(expenseId, data);
      return true;
    }

    if (scope === 'future') {
      const fromDate = String(exp.date).slice(0, 10);
      const ruleStartDate = String(rule.start_date).slice(0, 10);
      logger.info(`[RecurrenceService] Actualizando serie ID ${rule.id} desde fecha ${fromDate}`);

      if (fromDate <= ruleStartDate) {
        // Toda la serie ocurre a partir de esta fecha, actualizar regla completa y ocurrencias futuras
        await repo.updateRule(rule.id, updatePayload);
        await repo.updateOccurrencesFrom(rule.id, fromDate, rule.id, updatePayload);
      } else {
        // Hay ocurrencias pasadas: dividir regla (la anterior termina ayer, la nueva inicia hoy)
        const prev = parse(fromDate);
        prev.setUTCDate(prev.getUTCDate() - 1);
        await repo.setEndDate(rule.id, toStr(prev));

        const newRuleId = await repo.create(userId, {
          category_id: updatePayload.category_id,
          concept: updatePayload.concept,
          budget_amount: updatePayload.budget_amount,
          payment_method: updatePayload.payment_method,
          frequency: rule.frequency,
          start_date: fromDate,
          end_date: rule.end_date,
        });

        await repo.updateOccurrencesFrom(rule.id, fromDate, newRuleId, updatePayload);
      }
      // Actualizar el gasto específico
      await expenseService.updateBudgetExpense(expenseId, data);
      return true;
    }

    return await expenseService.updateBudgetExpense(expenseId, data);
  }
}

module.exports = new RecurrenceService();
module.exports.occurrencesInMonth = occurrencesInMonth;
