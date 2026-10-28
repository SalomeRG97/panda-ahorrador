const incomeRepository = require('../repositories/income.repository');
const logger = require('../config/logger');

class IncomeService {
  async getIncomesByMonth(monthId) {
    return await incomeRepository.getByMonthId(monthId);
  }

  async createIncome(monthId, date, concept, amount) {
    if (!monthId || !date || !concept || amount == null) {
      throw { statusCode: 400, message: 'Todos los campos de ingreso son requeridos' };
    }
    return await incomeRepository.create(monthId, date, concept, amount);
  }

  async updateIncome(id, date, concept, amount) {
    if (!id || isNaN(id)) {
      throw { statusCode: 400, message: 'ID de ingreso no válido' };
    }
    if (!date || !concept || amount == null) {
      throw { statusCode: 400, message: 'Todos los campos de ingreso son requeridos' };
    }
    return await incomeRepository.update(id, date, concept, amount);
  }

  async deleteIncome(id) {
    if (!id || isNaN(id)) {
      throw { statusCode: 400, message: 'ID de ingreso no válido' };
    }
    return await incomeRepository.delete(id);
  }

  async setMonthSaving(monthId, amount) {
    if (!monthId || amount == null) {
      throw { statusCode: 400, message: 'Mes ID y monto de ahorro son requeridos' };
    }
    return await incomeRepository.setSaving(monthId, amount);
  }

  async getMonthSaving(monthId) {
    const saving = await incomeRepository.getSavingByMonthId(monthId);
    return saving ? saving.amount : 0;
  }
}

module.exports = new IncomeService();
