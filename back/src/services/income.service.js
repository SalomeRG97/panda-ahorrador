const incomeRepository = require('../repositories/income.repository');
const monthRepository = require('../repositories/month.repository');
const weekRepository = require('../repositories/week.repository');
const ownershipRepository = require('../repositories/ownership.repository');
const AppError = require('../utils/app-error');

class IncomeService {
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
      throw new AppError(400, 'La fecha del ingreso no corresponde al mes indicado');
    }

    return month;
  }

  async getIncomesByMonth(monthId) {
    return await incomeRepository.getByMonthId(monthId);
  }

  async createIncome(monthId, date, concept, amount, userId = null) {
    const ownerId = await ownershipRepository.getMonthOwnerId(monthId);
    if (!ownerId || (userId != null && Number(ownerId) !== Number(userId))) {
      throw new AppError(404, 'Mes no encontrado');
    }

    await this.assertDateInMonth(date, monthId);

    return await incomeRepository.create(monthId, date, concept, amount);
  }

  async updateIncome(id, date, concept, amount, userId = null, monthId = null) {
    const ownerId = await ownershipRepository.getIncomeOwnerId(id);
    if (!ownerId || (userId != null && Number(ownerId) !== Number(userId))) {
      throw new AppError(404, 'Ingreso no encontrado');
    }

    let targetMonthId = monthId || null;
    if (targetMonthId != null) {
      const monthOwnerId = await ownershipRepository.getMonthOwnerId(targetMonthId);
      if (!monthOwnerId || Number(monthOwnerId) !== Number(ownerId)) {
        throw new AppError(404, 'Mes no encontrado');
      }
      await this.assertDateInMonth(date, targetMonthId);
    } else {
      const currentIncome = await incomeRepository.getById(id);
      const baseMonthId = currentIncome?.month_id;
      const currentDateStr = currentIncome?.date ? String(currentIncome.date).slice(0, 10) : null;
      const newDateStr = String(date).slice(0, 10);

      if (!currentDateStr || currentDateStr !== newDateStr) {
        const matchedWeek = await weekRepository.findWeekByDate(date, baseMonthId, ownerId);
        if (matchedWeek) {
          const newMonthOwnerId = await ownershipRepository.getMonthOwnerId(matchedWeek.month_id);
          if (!newMonthOwnerId || Number(newMonthOwnerId) !== Number(ownerId)) {
            throw new AppError(404, 'Mes no encontrado');
          }
          targetMonthId = matchedWeek.month_id;
        } else if (baseMonthId != null) {
          await this.assertDateInMonth(date, baseMonthId);
        }
      }
    }

    return await incomeRepository.update(id, date, concept, amount, targetMonthId);
  }

  async deleteIncome(id, userId = null) {
    const ownerId = await ownershipRepository.getIncomeOwnerId(id);
    if (!ownerId || (userId != null && Number(ownerId) !== Number(userId))) {
      throw new AppError(404, 'Ingreso no encontrado');
    }

    return await incomeRepository.delete(id);
  }

  async setMonthSaving(monthId, amount, userId = null) {
    const ownerId = await ownershipRepository.getMonthOwnerId(monthId);
    if (!ownerId || (userId != null && Number(ownerId) !== Number(userId))) {
      throw new AppError(404, 'Mes no encontrado');
    }

    return await incomeRepository.setSaving(monthId, amount);
  }

  async getMonthSaving(monthId) {
    const saving = await incomeRepository.getSavingByMonthId(monthId);
    return saving ? saving.amount : 0;
  }
}

module.exports = new IncomeService();
