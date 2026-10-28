const challengeRepository = require('../repositories/challenge.repository');
const logger = require('../config/logger');

class ChallengeService {
  async getAllChallenges() {
    return await challengeRepository.getAll();
  }

  async getMonthChallenge(monthId) {
    const challenge = await challengeRepository.getMonthChallenge(monthId);
    if (!challenge) {
      return null;
    }
    const progress = await challengeRepository.getProgress(challenge.month_challenge_id);
    const completedCount = progress.filter(p => p.completed).length;
    const totalDays = progress.length;
    const percentage = totalDays > 0 ? Math.round((completedCount / totalDays) * 100) : 0;

    return {
      challenge,
      progress,
      stats: {
        completedDays: completedCount,
        totalDays,
        percentage
      }
    };
  }

  async updateDayProgress(monthChallengeId, day, completed) {
    logger.info(`[ChallengeService] Actualizando progreso de reto: month_challenge ${monthChallengeId}, día ${day} = ${completed}`);
    return await challengeRepository.updateProgressDay(monthChallengeId, day, completed);
  }
}

module.exports = new ChallengeService();
