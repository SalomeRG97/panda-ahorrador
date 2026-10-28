const db = require('../config/database');
const logger = require('../config/logger');

// Crea la tabla automáticamente la primera vez (no requiere migración manual)
const ready = db.query(
  `CREATE TABLE IF NOT EXISTS payment_methods (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    name VARCHAR(50) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    UNIQUE KEY uq_user_payment_method (user_id, name),
    FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
  )`
).catch((err) => logger.error(`[PaymentMethodRepository] Error creando tabla: ${err.message}`));

class PaymentMethodRepository {
  async getAllForUser(userId) {
    await ready;
    const [rows] = await db.query(
      'SELECT id, name FROM payment_methods WHERE user_id = ? ORDER BY id ASC',
      [userId]
    );
    return rows;
  }

  async getById(id) {
    await ready;
    const [rows] = await db.query('SELECT * FROM payment_methods WHERE id = ?', [id]);
    return rows[0] || null;
  }

  async findByName(userId, name) {
    await ready;
    const [rows] = await db.query(
      'SELECT * FROM payment_methods WHERE user_id = ? AND name = ?',
      [userId, name]
    );
    return rows[0] || null;
  }

  async create(userId, name) {
    await ready;
    logger.info(`[PaymentMethodRepository] Creando medio de pago "${name}" para usuario ${userId}`);
    const [result] = await db.query(
      'INSERT INTO payment_methods (user_id, name) VALUES (?, ?)',
      [userId, name]
    );
    return result.insertId;
  }

  // Renombra el medio de pago y actualiza los gastos del usuario que lo usaban
  async rename(id, userId, oldName, newName) {
    await ready;
    logger.info(`[PaymentMethodRepository] Renombrando medio de pago ${id}: "${oldName}" -> "${newName}"`);
    await db.query('UPDATE payment_methods SET name = ? WHERE id = ?', [newName, id]);
    await this.renameInExpenses(userId, oldName, newName);
  }

  async renameInExpenses(userId, oldName, newName) {
    for (const table of ['budget_expenses', 'extra_expenses']) {
      await db.query(
        `UPDATE ${table} e
         JOIN months m ON e.month_id = m.id
         JOIN years y ON m.year_id = y.id
         SET e.payment_method = ?
         WHERE y.user_id = ? AND e.payment_method = ?`,
        [newName, userId, oldName]
      );
    }
  }

  // Los gastos existentes conservan su texto; solo se quita de la lista
  async delete(id) {
    await ready;
    logger.info(`[PaymentMethodRepository] Eliminando medio de pago ${id}`);
    await db.query('DELETE FROM payment_methods WHERE id = ?', [id]);
    return true;
  }
}

module.exports = new PaymentMethodRepository();
