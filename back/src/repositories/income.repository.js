const db = require('../config/database');
const logger = require('../config/logger');

class IncomeRepository {
  async getByMonthId(monthId) {
    logger.debug(`[IncomeRepository] Obteniendo ingresos para el mes ID ${monthId}`);
    const [rows] = await db.query(
      'SELECT * FROM incomes WHERE month_id = ? ORDER BY date ASC',
      [monthId]
    );
    return rows;
  }

  async create(monthId, date, concept, amount) {
    logger.info(`[IncomeRepository] Creando ingreso en mes ID ${monthId}: ${concept} ($${amount})`);
    const [result] = await db.query(
      'INSERT INTO incomes (month_id, date, concept, amount) VALUES (?, ?, ?, ?)',
      [monthId, date, concept, amount]
    );
    return result.insertId;
  }

  async update(id, date, concept, amount) {
    logger.info(`[IncomeRepository] Actualizando ingreso ID ${id}`);
    await db.query(
      'UPDATE incomes SET date = ?, concept = ?, amount = ? WHERE id = ?',
      [date, concept, amount, id]
    );
    return true;
  }

  async delete(id) {
    logger.info(`[IncomeRepository] Eliminando ingreso ID ${id}`);
    await db.query('DELETE FROM incomes WHERE id = ?', [id]);
    return true;
  }

  // Ahorro
  async getSavingByMonthId(monthId) {
    const [rows] = await db.query('SELECT * FROM savings WHERE month_id = ?', [monthId]);
    return rows[0] || null;
  }

  async setSaving(monthId, amount) {
    logger.info(`[IncomeRepository] Estableciendo ahorro para el mes ID ${monthId}: $${amount}`);
    await db.query(
      'INSERT INTO savings (month_id, amount) VALUES (?, ?) ON DUPLICATE KEY UPDATE amount = VALUES(amount)',
      [monthId, amount]
    );
    return true;
  }
}

module.exports = new IncomeRepository();
