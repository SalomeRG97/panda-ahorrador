const yearRepository = require('../repositories/year.repository');
const monthRepository = require('../repositories/month.repository');
const weekRepository = require('../repositories/week.repository');
const challengeRepository = require('../repositories/challenge.repository');
const { getMonthName, getDaysInMonth, calculateWeeksForMonth } = require('../utils/date-helpers');
const recurrenceService = require('./recurrence.service');
const logger = require('../config/logger');

class YearService {
  async getAllYears(userId) {
    logger.info(`[YearService] Obteniendo todos los años para usuario ID: ${userId}`);
    return await yearRepository.getAll(userId);
  }

  async getYearById(id) {
    logger.info(`[YearService] Buscando año por ID: ${id}`);
    const yearObj = await yearRepository.getById(id);
    if (!yearObj) {
      throw { statusCode: 404, message: 'Año no encontrado' };
    }
    const months = await monthRepository.getByYearId(id);
    return { ...yearObj, months };
  }

  async createYear(year, startMonth, userId) {
    logger.info(`[YearService] Creando nuevo año ${year} iniciando en el mes ${startMonth} para usuario ID: ${userId}`);

    const existingYears = await yearRepository.getAll(userId);
    if (existingYears.some(y => y.year === parseInt(year))) {
      throw { statusCode: 400, message: `El año ${year} ya ha sido creado previamente` };
    }

    const yearId = await yearRepository.create(year, startMonth, 12, userId);
    const createdMonths = [];

    for (let m = parseInt(startMonth); m <= 12; m++) {
      const monthName = getMonthName(m);
      const monthId = await monthRepository.create(yearId, m, monthName);

      // Crear semanas
      const weeks = calculateWeeksForMonth(year, m);
      for (const w of weeks) {
        await weekRepository.create(monthId, w.week_number, w.start_date, w.end_date);
      }

      // Asignar reto aleatorio al mes
      const randomChallenge = await challengeRepository.getRandomChallenge();
      if (randomChallenge) {
        const monthChallengeId = await challengeRepository.assignChallengeToMonth(monthId, randomChallenge.id);
        const daysInMonth = getDaysInMonth(year, m);
        await challengeRepository.initializeProgress(monthChallengeId, daysInMonth);
      }

      createdMonths.push({ id: monthId, month_number: m, month_name: monthName });
    }

    // Aplicar gastos recurrentes existentes a los meses del nuevo año
    try {
      await recurrenceService.materializeForYear(userId, yearId);
    } catch (err) {
      logger.error(`[YearService] Error generando gastos recurrentes: ${err.message}`);
    }

    logger.info(`[YearService] Año ${year} creado exitosamente con ${createdMonths.length} meses inicializados`);
    return { id: yearId, year, start_month: startMonth, end_month: 12, months: createdMonths };
  }

  async deleteYear(id, userId) {
    logger.info(`[YearService] Eliminando año ID: ${id}`);
    return await yearRepository.delete(id, userId);
  }
}

module.exports = new YearService();
