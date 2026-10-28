const yearRepository = require('../repositories/year.repository');
const monthRepository = require('../repositories/month.repository');
const weekRepository = require('../repositories/week.repository');
const challengeRepository = require('../repositories/challenge.repository');
const logger = require('../config/logger');

class ShortcutsService {
  async getTodayShortcuts(userId) {
    const now = new Date();
    const currentYearNum = now.getFullYear();
    const currentMonthNum = now.getMonth() + 1;
    
    // Formato local YYYY-MM-DD
    const yearStr = now.getFullYear();
    const monthStr = String(now.getMonth() + 1).padStart(2, '0');
    const dayStr = String(now.getDate()).padStart(2, '0');
    const todayStr = `${yearStr}-${monthStr}-${dayStr}`;

    logger.info(`[ShortcutsService] Obteniendo accesos directos para hoy (${todayStr}) usuario ID: ${userId}`);

    const userYears = await yearRepository.getAll(userId);
    const currentYearRecord = userYears.find(y => y.year === currentYearNum) || (userYears.length > 0 ? userYears[0] : null);

    const result = {
      todayStr,
      currentYearNum,
      currentMonthNum,
      year: null,
      month: null,
      week: null,
      challenge: null
    };

    if (currentYearRecord) {
      result.year = {
        id: currentYearRecord.id,
        year: currentYearRecord.year,
        start_month: currentYearRecord.start_month,
        end_month: currentYearRecord.end_month
      };

      const months = await monthRepository.getByYearId(currentYearRecord.id);
      const currentMonthRecord = months.find(m => m.month_number === currentMonthNum) || (months.length > 0 ? months[0] : null);

      if (currentMonthRecord) {
        result.month = {
          id: currentMonthRecord.id,
          month_number: currentMonthRecord.month_number,
          month_name: currentMonthRecord.month_name,
          year_id: currentMonthRecord.year_id
        };

        const weeks = await weekRepository.getByMonthId(currentMonthRecord.id);
        if (weeks && weeks.length > 0) {
          let currentWeek = weeks.find(w => w.start_date <= todayStr && w.end_date >= todayStr);
          if (!currentWeek) {
            currentWeek = weeks[0];
          }
          result.week = {
            id: currentWeek.id,
            week_number: currentWeek.week_number,
            start_date: currentWeek.start_date,
            end_date: currentWeek.end_date
          };
        }

        const challengeData = await challengeRepository.getMonthChallenge(currentMonthRecord.id);
        if (challengeData) {
          result.challenge = {
            month_challenge_id: challengeData.month_challenge_id,
            id: challengeData.id,
            title: challengeData.title,
            description: challengeData.description,
            icon: challengeData.icon
          };
        }
      }
    }

    return result;
  }
}

module.exports = new ShortcutsService();
