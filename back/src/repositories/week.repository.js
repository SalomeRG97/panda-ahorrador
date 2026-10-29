const db = require('../config/database');
const logger = require('../config/logger');

class WeekRepository {
  async getByMonthId(monthId) {
    logger.debug(`[WeekRepository] Obteniendo semanas para el mes ID: ${monthId}`);
    const [rows] = await db.query(
      'SELECT * FROM weeks WHERE month_id = ? ORDER BY week_number ASC',
      [monthId]
    );
    return rows;
  }

  async getById(id) {
    logger.debug(`[WeekRepository] Obteniendo semana ID: ${id}`);
    const [rows] = await db.query('SELECT * FROM weeks WHERE id = ?', [id]);
    return rows[0] || null;
  }

  async create(monthId, weekNumber, startDate, endDate) {
    logger.info(`[WeekRepository] Insertando semana ${weekNumber} para mes ID: ${monthId}`);
    const [result] = await db.query(
      'INSERT INTO weeks (month_id, week_number, start_date, end_date) VALUES (?, ?, ?, ?)',
      [monthId, weekNumber, startDate, endDate]
    );
    return result.insertId;
  }

  async findWeekByDate(dateStr, monthId, userId = null) {
    logger.debug(`[WeekRepository] Buscando semana para la fecha: ${dateStr} (mes ID: ${monthId}, user ID: ${userId})`);
    if (monthId) {
      const [rows] = await db.query(
        'SELECT * FROM weeks WHERE month_id = ? AND start_date <= ? AND end_date >= ?',
        [monthId, dateStr, dateStr]
      );
      if (rows.length > 0) return rows[0];
    }
    if (userId) {
      const [userRows] = await db.query(
        `SELECT w.* FROM weeks w
         JOIN months m ON w.month_id = m.id
         JOIN years y ON m.year_id = y.id
         WHERE y.user_id = ? AND w.start_date <= ? AND w.end_date >= ?
         ORDER BY w.id ASC LIMIT 1`,
        [userId, dateStr, dateStr]
      );
      if (userRows.length > 0) return userRows[0];
    }
    const [rows] = await db.query(
      'SELECT * FROM weeks WHERE start_date <= ? AND end_date >= ? ORDER BY id ASC LIMIT 1',
      [dateStr, dateStr]
    );
    return rows[0] || null;
  }
}

module.exports = new WeekRepository();
