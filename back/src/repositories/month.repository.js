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
      `SELECT m.*, y.year, y.user_id FROM months m 
       JOIN years y ON m.year_id = y.id 
       WHERE m.id = ?`,
      [id]
    );
    return rows[0] || null;
  }

  async getSavingsAccumulatedBeforeMonth(userId, yearNum, monthNumber) {
    logger.debug(`[MonthRepository] Calculando ahorro acumulado previo para usuario ${userId} antes de ${yearNum}-${monthNumber}`);
    
    // Total aportado a ahorro en meses cronológicamente anteriores
    const [[savingsRow]] = await db.query(
      `SELECT COALESCE(SUM(s.amount), 0) AS total_saved
       FROM savings s
       JOIN months m ON s.month_id = m.id
       JOIN years y ON m.year_id = y.id
       WHERE y.user_id = ?
         AND (y.year < ? OR (y.year = ? AND m.month_number < ?))`,
      [userId, yearNum, yearNum, monthNumber]
    );

    // Total retirado de ahorro en meses cronológicamente anteriores
    const [[withdrawnRow]] = await db.query(
      `SELECT
        (
          SELECT COALESCE(SUM(be.real_amount), 0)
          FROM budget_expenses be
          JOIN months m ON be.month_id = m.id
          JOIN years y ON m.year_id = y.id
          WHERE y.user_id = ?
            AND LOWER(TRIM(be.payment_method)) = 'retiro de ahorros'
            AND (y.year < ? OR (y.year = ? AND m.month_number < ?))
        ) +
        (
          SELECT COALESCE(SUM(ee.amount), 0)
          FROM extra_expenses ee
          JOIN months m ON ee.month_id = m.id
          JOIN years y ON m.year_id = y.id
          WHERE y.user_id = ?
            AND LOWER(TRIM(ee.payment_method)) = 'retiro de ahorros'
            AND (y.year < ? OR (y.year = ? AND m.month_number < ?))
        ) AS total_withdrawn`,
      [userId, yearNum, yearNum, monthNumber, userId, yearNum, yearNum, monthNumber]
    );

    const totalSaved = parseFloat(savingsRow?.total_saved || 0);
    const totalWithdrawn = parseFloat(withdrawnRow?.total_withdrawn || 0);

    return {
      totalSaved,
      totalWithdrawn,
      balanceBefore: totalSaved - totalWithdrawn
    };
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
