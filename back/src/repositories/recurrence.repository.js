const db = require('../config/database');
const logger = require('../config/logger');

// Crea tabla y columna automáticamente (no requiere migración manual)
const ready = (async () => {
  await db.query(
    `CREATE TABLE IF NOT EXISTS expense_recurrences (
      id INT AUTO_INCREMENT PRIMARY KEY,
      user_id INT NOT NULL,
      category_id INT NULL,
      concept VARCHAR(255) NOT NULL,
      budget_amount DECIMAL(12,2) NOT NULL DEFAULT 0.00,
      payment_method VARCHAR(50) DEFAULT '',
      frequency VARCHAR(20) NOT NULL,
      start_date DATE NOT NULL,
      end_date DATE NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    )`
  );
  const [cols] = await db.query(
    `SELECT COUNT(*) AS c FROM INFORMATION_SCHEMA.COLUMNS
     WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'budget_expenses' AND COLUMN_NAME = 'recurrence_id'`
  );
  if (!cols[0].c) {
    await db.query(
      'ALTER TABLE budget_expenses ADD COLUMN recurrence_id INT NULL, ADD INDEX idx_be_recurrence (recurrence_id)'
    );
  }
})().catch((err) => logger.error(`[RecurrenceRepository] Error preparando esquema: ${err.message}`));

class RecurrenceRepository {
  get ready() {
    return ready;
  }

  async create(userId, { category_id, concept, budget_amount, payment_method, frequency, start_date, end_date }) {
    await ready;
    const [result] = await db.query(
      `INSERT INTO expense_recurrences
        (user_id, category_id, concept, budget_amount, payment_method, frequency, start_date, end_date)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [userId, category_id || null, concept, budget_amount, payment_method || '', frequency, start_date, end_date || null]
    );
    return result.insertId;
  }

  async getById(id) {
    await ready;
    const [rows] = await db.query('SELECT * FROM expense_recurrences WHERE id = ?', [id]);
    return rows[0] || null;
  }

  async getAllForUser(userId) {
    await ready;
    const [rows] = await db.query('SELECT * FROM expense_recurrences WHERE user_id = ?', [userId]);
    return rows;
  }

  async getMonthsForUser(userId) {
    const [rows] = await db.query(
      `SELECT m.id, m.month_number, y.year
       FROM months m JOIN years y ON m.year_id = y.id
       WHERE y.user_id = ?`,
      [userId]
    );
    return rows;
  }

  async getMonthsForYear(yearId) {
    const [rows] = await db.query(
      `SELECT m.id, m.month_number, y.year
       FROM months m JOIN years y ON m.year_id = y.id
       WHERE y.id = ?`,
      [yearId]
    );
    return rows;
  }

  async getExistingDates(recurrenceId, monthId) {
    const [rows] = await db.query(
      'SELECT date FROM budget_expenses WHERE recurrence_id = ? AND month_id = ?',
      [recurrenceId, monthId]
    );
    return new Set(rows.map((r) => String(r.date).slice(0, 10)));
  }

  async insertOccurrence(rule, monthId, weekId, date) {
    await db.query(
      `INSERT INTO budget_expenses
        (month_id, week_id, category_id, date, concept, budget_amount, real_amount, payment_method, recurrence_id)
       VALUES (?, ?, ?, ?, ?, ?, 0, ?, ?)`,
      [monthId, weekId, rule.category_id, date, rule.concept, rule.budget_amount, rule.payment_method || '', rule.id]
    );
  }

  async findWeekId(monthId, date) {
    const [rows] = await db.query(
      'SELECT id FROM weeks WHERE month_id = ? AND start_date <= ? AND end_date >= ? LIMIT 1',
      [monthId, date, date]
    );
    return rows[0] ? rows[0].id : null;
  }

  async getExpenseRecurrence(expenseId) {
    const [rows] = await db.query('SELECT recurrence_id, date FROM budget_expenses WHERE id = ?', [expenseId]);
    return rows[0] || null;
  }

  async deleteOccurrencesFrom(recurrenceId, fromDate) {
    await db.query('DELETE FROM budget_expenses WHERE recurrence_id = ? AND date >= ?', [recurrenceId, fromDate]);
  }

  async deleteAllOccurrences(recurrenceId) {
    await db.query('DELETE FROM budget_expenses WHERE recurrence_id = ?', [recurrenceId]);
  }

  async updateAllOccurrences(recurrenceId, { category_id, concept, budget_amount, payment_method }) {
    await db.query(
      `UPDATE budget_expenses 
       SET category_id = ?, concept = ?, budget_amount = ?, payment_method = ?
       WHERE recurrence_id = ?`,
      [category_id, concept, budget_amount, payment_method || '', recurrenceId]
    );
  }

  async updateOccurrencesFrom(oldRecurrenceId, fromDate, newRecurrenceId, { category_id, concept, budget_amount, payment_method }) {
    await db.query(
      `UPDATE budget_expenses 
       SET recurrence_id = ?, category_id = ?, concept = ?, budget_amount = ?, payment_method = ?
       WHERE recurrence_id = ? AND date >= ?`,
      [newRecurrenceId, category_id, concept, budget_amount, payment_method || '', oldRecurrenceId, fromDate]
    );
  }

  async updateRule(id, { category_id, concept, budget_amount, payment_method }) {
    await db.query(
      `UPDATE expense_recurrences
       SET category_id = ?, concept = ?, budget_amount = ?, payment_method = ?
       WHERE id = ?`,
      [category_id, concept, budget_amount, payment_method || '', id]
    );
  }

  async setEndDate(id, endDate) {
    await db.query('UPDATE expense_recurrences SET end_date = ? WHERE id = ?', [endDate, id]);
  }

  async delete(id) {
    await db.query('DELETE FROM expense_recurrences WHERE id = ?', [id]);
  }
}

module.exports = new RecurrenceRepository();
