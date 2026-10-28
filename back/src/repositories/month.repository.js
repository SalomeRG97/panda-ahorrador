const db = require('../config/database');
const logger = require('../config/logger');

class MonthRepository {
  async getByYearId(yearId) {
    logger.debug(`[MonthRepository] Buscando meses para el año ID: ${yearId}`);
    const [rows] = await db.query(
      'SELECT * FROM months WHERE year_id = ? ORDER BY month_number ASC',
      [yearId]
    );
    return rows;
  }

  async getById(id) {
    logger.debug(`[MonthRepository] Obteniendo mes por ID: ${id}`);
    const [rows] = await db.query(
      `SELECT m.*, y.year FROM months m 
       JOIN years y ON m.year_id = y.id 
       WHERE m.id = ?`,
      [id]
    );
    return rows[0] || null;
  }

  async create(yearId, monthNumber, monthName) {
    logger.info(`[MonthRepository] Insertando mes ${monthName} (${monthNumber}) para año ID: ${yearId}`);
    const [result] = await db.query(
      'INSERT INTO months (year_id, month_number, month_name) VALUES (?, ?, ?)',
      [yearId, monthNumber, monthName]
    );
    return result.insertId;
  }
}

module.exports = new MonthRepository();
