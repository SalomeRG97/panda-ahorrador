const challengeService = require('../services/challenge.service');
const logger = require('../config/logger');

class ChallengeController {
  async getAll(req, res, next) {
    try {
      logger.info('[ChallengeController] GET /api/challenges');
      const challenges = await challengeService.getAllChallenges();
      res.json({ success: true, data: challenges });
    } catch (error) {
      next(error);
    }
  }

  async getMonthChallenge(req, res, next) {
    try {
      const { monthId } = req.params;
      logger.info(`[ChallengeController] GET /api/challenges/month/${monthId}`);
      const data = await challengeService.getMonthChallenge(monthId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async updateProgress(req, res, next) {
    try {
      const { monthChallengeId, day, completed } = req.body;
      logger.info(`[ChallengeController] PUT /api/challenges/progress -> Challenge ${monthChallengeId}, Day ${day} = ${completed}`);
      await challengeService.updateDayProgress(monthChallengeId, day, completed);
      res.json({ success: true, message: 'Progreso de reto actualizado' });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new ChallengeController();
