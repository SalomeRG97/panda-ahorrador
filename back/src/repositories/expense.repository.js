const db = require('../config/database');
const logger = require('../config/logger');
const recurrenceRepository = require('./recurrence.repository');
const { getCurrentWeekRange } = require('../utils/date-helpers');

class ExpenseRepository {
  // --- GASTOS PRESUPUESTADOS ---
  async getBudgetExpensesByMonth(monthId) {
    logger.debug(`[ExpenseRepository] Buscando gastos presupuestados del mes ID ${monthId}`);
    await recurrenceRepository.ready;
    const [rows] = await db.query(
      `SELECT be.*, 
              r.frequency as recurrence_frequency, 
              COALESCE(c.name, 'Sin Categorizar') as category_name, 
              COALESCE(c.color, '#FFFFFF') as category_color, 
              COALESCE(c.icon, '🏷️') as category_icon 
       FROM budget_expenses be 
       LEFT JOIN categories c ON be.category_id = c.id 
       LEFT JOIN expense_recurrences r ON be.recurrence_id = r.id 
       WHERE be.month_id = ? 
       ORDER BY be.date ASC`,
      [monthId]
    );
    return rows;
  }

  async getBudgetExpensesByWeek(weekId) {
    logger.debug(`[ExpenseRepository] Buscando gastos presupuestados de la semana ID ${weekId}`);
    await recurrenceRepository.ready;
    const [rows] = await db.query(
      `SELECT be.*, 
              r.frequency as recurrence_frequency, 
              COALESCE(c.name, 'Sin Categorizar') as category_name, 
              COALESCE(c.color, '#FFFFFF') as category_color, 
              COALESCE(c.icon, '🏷️') as category_icon 
       FROM budget_expenses be 
       LEFT JOIN categories c ON be.category_id = c.id 
       LEFT JOIN expense_recurrences r ON be.recurrence_id = r.id 
       WHERE be.week_id = ? 
       ORDER BY be.date ASC`,
      [weekId]
    );
    return rows;
  }

  async createBudgetExpense({ month_id, week_id, category_id, date, concept, budget_amount, real_amount = 0, payment_method = '' }) {
    logger.info(`[ExpenseRepository] Creando gasto presupuestado en mes ID ${month_id}: ${concept} ($${budget_amount})`);
    const [result] = await db.query(
      `INSERT INTO budget_expenses (month_id, week_id, category_id, date, concept, budget_amount, real_amount, payment_method) 
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [month_id, week_id, category_id, date, concept, budget_amount, real_amount, payment_method]
    );
    return result.insertId;
  }

  async updateBudgetExpense(id, { category_id, date, concept, budget_amount, real_amount, week_id, payment_method }) {
    logger.info(`[ExpenseRepository] Actualizando gasto presupuestado ID ${id}`);
    await db.query(
      `UPDATE budget_expenses 
       SET category_id = ?, date = ?, concept = ?, budget_amount = ?, real_amount = ?, week_id = COALESCE(?, week_id), payment_method = COALESCE(?, payment_method) 
       WHERE id = ?`,
      [category_id, date, concept, budget_amount, real_amount, week_id, payment_method, id]
    );
    return true;
  }

  async getBudgetExpenseById(id) {
    await recurrenceRepository.ready;
    const [rows] = await db.query(
      `SELECT be.*, 
              r.user_id as recurrence_user_id,
              r.frequency as recurrence_frequency, 
              r.start_date as recurrence_start_date, 
              r.end_date as recurrence_end_date
       FROM budget_expenses be
       LEFT JOIN expense_recurrences r ON be.recurrence_id = r.id
       WHERE be.id = ?`,
      [id]
    );
    return rows[0] || null;
  }

  async deleteBudgetExpense(id) {
    logger.info(`[ExpenseRepository] Eliminando gasto presupuestado ID ${id}`);
    await db.query('DELETE FROM budget_expenses WHERE id = ?', [id]);
    return true;
  }

  // --- GASTOS EXTRA (NO PRESUPUESTADOS) ---
  async getExtraExpensesByMonth(monthId) {
    logger.debug(`[ExpenseRepository] Buscando gastos extra del mes ID ${monthId}`);
    const [rows] = await db.query(
      `SELECT ee.*, 
              COALESCE(c.name, 'Sin Categorizar') as category_name, 
              COALESCE(c.color, '#FFFFFF') as category_color, 
              COALESCE(c.icon, '🏷️') as category_icon 
       FROM extra_expenses ee 
       LEFT JOIN categories c ON ee.category_id = c.id 
       WHERE ee.month_id = ? 
       ORDER BY ee.date ASC`,
      [monthId]
    );
    return rows;
  }

  async getExtraExpensesByWeek(weekId) {
    logger.debug(`[ExpenseRepository] Buscando gastos extra de la semana ID ${weekId}`);
    const [rows] = await db.query(
      `SELECT ee.*, 
              COALESCE(c.name, 'Sin Categorizar') as category_name, 
              COALESCE(c.color, '#FFFFFF') as category_color, 
              COALESCE(c.icon, '🏷️') as category_icon 
       FROM extra_expenses ee 
       LEFT JOIN categories c ON ee.category_id = c.id 
       WHERE ee.week_id = ? 
       ORDER BY ee.date ASC`,
      [weekId]
    );
    return rows;
  }

  async createExtraExpense({ month_id, week_id, category_id, date, concept, amount, payment_method = '' }) {
    logger.info(`[ExpenseRepository] Creando gasto extra en mes ID ${month_id}: ${concept} ($${amount})`);
    const [result] = await db.query(
      `INSERT INTO extra_expenses (month_id, week_id, category_id, date, concept, amount, payment_method) 
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [month_id, week_id, category_id, date, concept, amount, payment_method]
    );
    return result.insertId;
  }

  async updateExtraExpense(id, { category_id, date, concept, amount, week_id, payment_method }) {
    logger.info(`[ExpenseRepository] Actualizando gasto extra ID ${id}`);
    await db.query(
      `UPDATE extra_expenses 
       SET category_id = ?, date = ?, concept = ?, amount = ?, week_id = COALESCE(?, week_id), payment_method = COALESCE(?, payment_method) 
       WHERE id = ?`,
      [category_id, date, concept, amount, week_id, payment_method, id]
    );
    return true;
  }

  async deleteExtraExpense(id) {
    logger.info(`[ExpenseRepository] Eliminando gasto extra ID ${id}`);
    await db.query('DELETE FROM extra_expenses WHERE id = ?', [id]);
    return true;
  }

  // --- GASTOS PRESUPUESTADOS PENDIENTES ---
  async getPendingBudgetExpenses(userId) {
    logger.debug(`[ExpenseRepository] Buscando gastos presupuestados pendientes para usuario ID ${userId}`);
    await recurrenceRepository.ready;

    const weekRange = getCurrentWeekRange();
    const todayStr = weekRange.today;

    // Intentamos buscar si el usuario tiene una semana configurada en BD que contenga todayStr
    let limitEndDate = weekRange.endOfWeekSunday;
    try {
      const [weekRows] = await db.query(
        `SELECT w.id, w.start_date, w.end_date
         FROM weeks w
         JOIN months m ON w.month_id = m.id
         JOIN years y ON m.year_id = y.id
         WHERE y.user_id = ?
           AND w.start_date <= ? AND w.end_date >= ?
         ORDER BY w.id DESC LIMIT 1`,
        [userId, todayStr, todayStr]
      );

      if (weekRows && weekRows.length > 0 && weekRows[0].end_date) {
        const dbEnd = String(weekRows[0].end_date).slice(0, 10);
        if (dbEnd >= todayStr) {
          limitEndDate = dbEnd > limitEndDate ? dbEnd : limitEndDate;
        }
      }
    } catch (err) {
      logger.warn(`[ExpenseRepository] Error consultando semana actual de BD, usando fallback: ${err.message}`);
    }

    logger.debug(`[ExpenseRepository] Límite fecha pendiente (fin de semana actual): ${limitEndDate}, Hoy: ${todayStr}`);

    const [rows] = await db.query(
      `SELECT be.id,
              be.month_id,
              COALESCE(be.week_id, (SELECT w2.id FROM weeks w2 WHERE w2.month_id = be.month_id AND be.date BETWEEN w2.start_date AND w2.end_date LIMIT 1)) as week_id,
              w.week_number,
              be.category_id,
              DATE_FORMAT(be.date, '%Y-%m-%d') as date,
              be.concept,
              be.budget_amount,
              be.real_amount,
              be.payment_method,
              be.recurrence_id,
              r.frequency as recurrence_frequency,
              m.year_id,
              m.month_number,
              m.month_name,
              y.year,
              COALESCE(c.name, 'Sin Categorizar') as category_name,
              COALESCE(c.color, '#F4A6C1') as category_color,
              COALESCE(c.icon, '📦') as category_icon,
              CASE
                WHEN be.date < ? THEN 'overdue'
                ELSE 'current_week'
              END as status_type
       FROM budget_expenses be
       JOIN months m ON be.month_id = m.id
       JOIN years y ON m.year_id = y.id
       LEFT JOIN weeks w ON w.id = COALESCE(be.week_id, (SELECT w2.id FROM weeks w2 WHERE w2.month_id = be.month_id AND be.date BETWEEN w2.start_date AND w2.end_date LIMIT 1))
       LEFT JOIN categories c ON be.category_id = c.id
       LEFT JOIN expense_recurrences r ON be.recurrence_id = r.id
       WHERE y.user_id = ?
         AND (be.real_amount IS NULL OR be.real_amount = 0)
         AND be.budget_amount > 0
         AND be.date <= ?
       ORDER BY be.date ASC`,
      [todayStr, userId, limitEndDate]
    );
    return rows;
  }
}

module.exports = new ExpenseRepository();
