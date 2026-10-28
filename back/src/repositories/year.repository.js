const db = require('../config/database');
const logger = require('../config/logger');

class YearRepository {
  async getAll(userId) {
    logger.debug(`[YearRepository] Obteniendo lista de años para usuario ID: ${userId}`);
    const [rows] = await db.query('SELECT * FROM years WHERE user_id = ? ORDER BY year DESC', [userId]);
    return rows;
  }

  async getById(id) {
    logger.debug(`[YearRepository] Obteniendo año por ID: ${id}`);
    const [rows] = await db.query('SELECT * FROM years WHERE id = ?', [id]);
    return rows[0] || null;
  }

  async create(year, startMonth, endMonth = 12, userId) {
    logger.info(`[YearRepository] Insertando nuevo año: ${year} (Mes ${startMonth} a ${endMonth}) para usuario ID: ${userId}`);
    const [result] = await db.query(
      'INSERT INTO years (year, start_month, end_month, user_id) VALUES (?, ?, ?, ?)',
      [year, startMonth, endMonth, userId]
    );
    return result.insertId;
  }

  async delete(id, userId) {
    logger.info(`[YearRepository] Eliminando año ID: ${id} del usuario ID: ${userId}`);
    await db.query('DELETE FROM years WHERE id = ? AND user_id = ?', [id, userId]);
    return true;
  }
}

module.exports = new YearRepository();
