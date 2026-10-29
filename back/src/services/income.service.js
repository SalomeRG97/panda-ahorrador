const incomeRepository = require('../repositories/income.repository');
const weekRepository = require('../repositories/week.repository');
const ownershipRepository = require('../repositories/ownership.repository');
const logger = require('../config/logger');

class IncomeService {
  async getIncomesByMonth(monthId) {
    return await incomeRepository.getByMonthId(monthId);
  }

  async createIncome(monthId, date, concept, amount, userId = null) {
    if (!monthId || !date || !concept || amount == null) {
      throw { statusCode: 400, message: 'Todos los campos de ingreso son requeridos' };
    }

    const ownerId = await ownershipRepository.getMonthOwnerId(monthId);
    if (!ownerId || (userId != null && Number(ownerId) !== Number(userId))) {
      throw { statusCode: 404, message: 'Mes no encontrado' };
    }

    return await incomeRepository.create(monthId, date, concept, amount);
  }

  async updateIncome(id, date, concept, amount, userId = null, monthId = null) {
    if (!id || isNaN(id)) {
      throw { statusCode: 400, message: 'ID de ingreso no válido' };
    }
    if (!date || !concept || amount == null) {
      throw { statusCode: 400, message: 'Todos los campos de ingreso son requeridos' };
    }

    const ownerId = await ownershipRepository.getIncomeOwnerId(id);
    if (!ownerId || (userId != null && Number(ownerId) !== Number(userId))) {
      throw { statusCode: 404, message: 'Ingreso no encontrado' };
    }

    let targetMonthId = monthId || null;
    if (targetMonthId != null) {
      const monthOwnerId = await ownershipRepository.getMonthOwnerId(targetMonthId);
      if (!monthOwnerId || Number(monthOwnerId) !== Number(ownerId)) {
        throw { statusCode: 404, message: 'Mes no encontrado' };
      }
    }

    const currentIncome = await incomeRepository.getById(id);
    const baseMonthId = targetMonthId || currentIncome?.month_id;
    const currentDateStr = currentIncome?.date ? String(currentIncome.date).slice(0, 10) : null;
    const newDateStr = String(date).slice(0, 10);

    if (!currentDateStr || currentDateStr !== newDateStr) {
      const matchedWeek = await weekRepository.findWeekByDate(date, baseMonthId, ownerId);
      if (matchedWeek) {
        const newMonthOwnerId = await ownershipRepository.getMonthOwnerId(matchedWeek.month_id);
        if (!newMonthOwnerId || Number(newMonthOwnerId) !== Number(ownerId)) {
          throw { statusCode: 404, message: 'Mes no encontrado' };
        }
        targetMonthId = matchedWeek.month_id;
      }
    }

    return await incomeRepository.update(id, date, concept, amount, targetMonthId);
  }

  async deleteIncome(id, userId = null) {
    if (!id || isNaN(id)) {
      throw { statusCode: 400, message: 'ID de ingreso no válido' };
    }

    const ownerId = await ownershipRepository.getIncomeOwnerId(id);
    if (!ownerId || (userId != null && Number(ownerId) !== Number(userId))) {
      throw { statusCode: 404, message: 'Ingreso no encontrado' };
    }

    return await incomeRepository.delete(id);
  }

  async setMonthSaving(monthId, amount, userId = null) {
    if (!monthId || amount == null) {
      throw { statusCode: 400, message: 'Mes ID y monto de ahorro son requeridos' };
    }

    const ownerId = await ownershipRepository.getMonthOwnerId(monthId);
    if (!ownerId || (userId != null && Number(ownerId) !== Number(userId))) {
      throw { statusCode: 404, message: 'Mes no encontrado' };
    }

    return await incomeRepository.setSaving(monthId, amount);
  }

  async getMonthSaving(monthId) {
    const saving = await incomeRepository.getSavingByMonthId(monthId);
    return saving ? saving.amount : 0;
  }
}

module.exports = new IncomeService();
