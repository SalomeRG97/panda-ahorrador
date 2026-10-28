const monthRepository = require('../repositories/month.repository');
const weekRepository = require('../repositories/week.repository');
const incomeRepository = require('../repositories/income.repository');
const expenseRepository = require('../repositories/expense.repository');
const challengeRepository = require('../repositories/challenge.repository');
const logger = require('../config/logger');

class MonthService {
  async getMonthsByYear(yearId) {
    return await monthRepository.getByYearId(yearId);
  }

  async getMonthDetails(monthId) {
    logger.info(`[MonthService] Cargando detalles completos para el mes ID ${monthId}`);
    const month = await monthRepository.getById(monthId);
    if (!month) {
      throw { statusCode: 404, message: 'Mes no encontrado' };
    }

    const weeks = await weekRepository.getByMonthId(monthId);
    const incomes = await incomeRepository.getByMonthId(monthId);
    const saving = await incomeRepository.getSavingByMonthId(monthId);
    const budgetExpenses = await expenseRepository.getBudgetExpensesByMonth(monthId);
    const extraExpenses = await expenseRepository.getExtraExpensesByMonth(monthId);
    const challenge = await challengeRepository.getMonthChallenge(monthId);

    let challengeProgress = [];
    if (challenge) {
      challengeProgress = await challengeRepository.getProgress(challenge.month_challenge_id);
    }

    return {
      month,
      weeks,
      incomes,
      saving: saving ? saving.amount : 0,
      budgetExpenses,
      extraExpenses,
      challenge,
      challengeProgress
    };
  }
}

module.exports = new MonthService();
