const db = require('../config/database');
const logger = require('../config/logger');

class ChallengeRepository {
  async getAll() {
    logger.debug('[ChallengeRepository] Obteniendo todos los retos');
    const [rows] = await db.query('SELECT * FROM challenges ORDER BY id ASC');
    return rows;
  }

  async getRandomChallenge() {
    logger.debug('[ChallengeRepository] Seleccionando reto aleatorio');
    const [rows] = await db.query('SELECT * FROM challenges ORDER BY RAND() LIMIT 1');
    return rows[0] || null;
  }

  async assignChallengeToMonth(monthId, challengeId) {
    logger.info(`[ChallengeRepository] Asignando reto ID ${challengeId} al mes ID ${monthId}`);
    const [result] = await db.query(
      'INSERT INTO month_challenges (month_id, challenge_id) VALUES (?, ?)',
      [monthId, challengeId]
    );
    return result.insertId;
  }

  async getMonthChallenge(monthId) {
    logger.debug(`[ChallengeRepository] Obteniendo reto del mes ID ${monthId}`);
    const [rows] = await db.query(
      `SELECT mc.id as month_challenge_id, c.* 
       FROM month_challenges mc 
       JOIN challenges c ON mc.challenge_id = c.id 
       WHERE mc.month_id = ?`,
      [monthId]
    );
    return rows[0] || null;
  }

  async initializeProgress(monthChallengeId, daysCount) {
    logger.info(`[ChallengeRepository] Inicializando ${daysCount} días de progreso para month_challenge ID ${monthChallengeId}`);
    const values = [];
    for (let day = 1; day <= daysCount; day++) {
      values.push([monthChallengeId, day, false]);
    }
    await db.query(
      'INSERT INTO challenge_progress (month_challenge_id, day, completed) VALUES ?',
      [values]
    );
  }

  async getProgress(monthChallengeId) {
    logger.debug(`[ChallengeRepository] Obteniendo progreso para month_challenge ID ${monthChallengeId}`);
    const [rows] = await db.query(
      'SELECT * FROM challenge_progress WHERE month_challenge_id = ? ORDER BY day ASC',
      [monthChallengeId]
    );
    return rows;
  }

  async updateProgressDay(monthChallengeId, day, completed) {
    logger.info(`[ChallengeRepository] Actualizando progreso día ${day} = ${completed} para month_challenge ID ${monthChallengeId}`);
    await db.query(
      'UPDATE challenge_progress SET completed = ? WHERE month_challenge_id = ? AND day = ?',
      [completed, monthChallengeId, day]
    );
    return true;
  }
}

module.exports = new ChallengeRepository();
