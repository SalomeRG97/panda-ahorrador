const db = require('../config/database');
const logger = require('../config/logger');

class CategoryRepository {
  // Get all categories visible to a user: global (user_id IS NULL) + user's own
  async getAllForUser(userId) {
    logger.debug(`[CategoryRepository] Obteniendo categorías para usuario ID: ${userId}`);
    const [rows] = await db.query(
      'SELECT *, (user_id IS NULL) as isGlobal FROM categories WHERE user_id IS NULL OR user_id = ? ORDER BY isGlobal DESC, id ASC',
      [userId]
    );
    return rows.map(r => ({ ...r, isGlobal: !!r.isGlobal }));
  }

  async getAll() {
    logger.debug('[CategoryRepository] Obteniendo todas las categorías');
    const [rows] = await db.query('SELECT *, (user_id IS NULL) as isGlobal FROM categories ORDER BY isGlobal DESC, id ASC');
    return rows.map(r => ({ ...r, isGlobal: !!r.isGlobal }));
  }

  async getById(id) {
    const [rows] = await db.query('SELECT *, (user_id IS NULL) as isGlobal FROM categories WHERE id = ?', [id]);
    if (rows[0]) rows[0].isGlobal = !!rows[0].isGlobal;
    return rows[0] || null;
  }

  async create(name, color, icon, userId) {
    logger.info(`[CategoryRepository] Creando categoría personalizada: ${name} para usuario ${userId}`);
    const [result] = await db.query(
      'INSERT INTO categories (name, color, icon, user_id) VALUES (?, ?, ?, ?)',
      [name, color, icon, userId]
    );
    return result.insertId;
  }

  async update(id, { name, color, icon }) {
    logger.info(`[CategoryRepository] Actualizando categoría ID: ${id}`);
    const updates = [];
    const values = [];

    if (name !== undefined) { updates.push('name = ?'); values.push(name); }
    if (color !== undefined) { updates.push('color = ?'); values.push(color); }
    if (icon !== undefined) { updates.push('icon = ?'); values.push(icon); }

    if (updates.length === 0) return false;

    values.push(id);
    await db.query(`UPDATE categories SET ${updates.join(', ')} WHERE id = ?`, values);
    return true;
  }

  async delete(id) {
    logger.info(`[CategoryRepository] Eliminando categoría ID: ${id}`);
    await db.query('UPDATE budget_expenses SET category_id = NULL WHERE category_id = ?', [id]);
    await db.query('UPDATE extra_expenses SET category_id = NULL WHERE category_id = ?', [id]);
    await db.query('DELETE FROM categories WHERE id = ?', [id]);
    return true;
  }

  // Copy-on-Write: duplicate a global category for a user to personalize
  async copyGlobalForUser(globalCatId, userId, overrides = {}) {
    logger.info(`[CategoryRepository] Copiando categoría global ${globalCatId} para usuario ${userId}`);
    const global = await this.getById(globalCatId);
    if (!global) return null;

    const name = overrides.name || global.name;
    const color = overrides.color || global.color;
    const icon = overrides.icon || global.icon;

    const newId = await this.create(name, color, icon, userId);
    return newId;
  }

  // Check if user already has a personal copy of a global category name
  async findUserCategoryByName(userId, name) {
    const [rows] = await db.query(
      'SELECT * FROM categories WHERE user_id = ? AND name = ?',
      [userId, name]
    );
    return rows[0] || null;
  }
}

module.exports = new CategoryRepository();
