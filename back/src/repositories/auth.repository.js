const db = require('../config/database');
const logger = require('../config/logger');

class AuthRepository {
  // --- USERS ---
  async findUserByEmail(email) {
    logger.debug(`[AuthRepository] Buscando usuario por email: ${email}`);
    const [rows] = await db.query(
      `SELECT u.*, r.name as role_name 
       FROM users u 
       JOIN roles r ON u.role_id = r.id 
       WHERE u.email = ?`,
      [email]
    );
    return rows[0] || null;
  }

  async findUserByUsername(username) {
    logger.debug(`[AuthRepository] Buscando usuario por username: ${username}`);
    const [rows] = await db.query(
      `SELECT u.*, r.name as role_name 
       FROM users u 
       JOIN roles r ON u.role_id = r.id 
       WHERE u.username = ?`,
      [username]
    );
    return rows[0] || null;
  }

  async findUserById(id) {
    logger.debug(`[AuthRepository] Buscando usuario por ID: ${id}`);
    const [rows] = await db.query(
      `SELECT u.id, u.email, u.username, u.name, u.avatar_url, u.is_active, u.created_at, u.updated_at, r.name as role_name, r.id as role_id
       FROM users u 
       JOIN roles r ON u.role_id = r.id 
       WHERE u.id = ?`,
      [id]
    );
    return rows[0] || null;
  }

  async createUser({ email, username, passwordHash, name, roleId }) {
    logger.info(`[AuthRepository] Creando usuario: ${email} (${username})`);
    const [result] = await db.query(
      `INSERT INTO users (email, username, password_hash, name, role_id) 
       VALUES (?, ?, ?, ?, ?)`,
      [email, username, passwordHash, name, roleId]
    );
    return result.insertId;
  }

  async updateUser(id, fields) {
    logger.info(`[AuthRepository] Actualizando usuario ID: ${id}`);
    const allowedFields = ['email', 'username', 'name', 'avatar_url', 'is_active', 'role_id'];
    const updates = [];
    const values = [];

    for (const [key, value] of Object.entries(fields)) {
      if (allowedFields.includes(key) && value !== undefined) {
        updates.push(`${key} = ?`);
        values.push(value);
      }
    }

    if (updates.length === 0) return false;

    values.push(id);
    await db.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, values);
    return true;
  }

  async updatePassword(id, passwordHash) {
    logger.info(`[AuthRepository] Actualizando contraseña para usuario ID: ${id}`);
    await db.query('UPDATE users SET password_hash = ? WHERE id = ?', [passwordHash, id]);
    return true;
  }

  async deactivateUser(id) {
    logger.info(`[AuthRepository] Desactivando usuario ID: ${id}`);
    await db.query('UPDATE users SET is_active = FALSE WHERE id = ?', [id]);
    return true;
  }

  async getAllUsers() {
    logger.debug('[AuthRepository] Obteniendo todos los usuarios');
    const [rows] = await db.query(
      `SELECT u.id, u.email, u.username, u.name, u.avatar_url, u.is_active, u.created_at, u.updated_at, r.name as role_name, r.id as role_id
       FROM users u 
       JOIN roles r ON u.role_id = r.id 
       ORDER BY u.created_at DESC`
    );
    return rows;
  }

  async deleteUser(id) {
    logger.info(`[AuthRepository] Eliminando usuario ID: ${id}`);
    await db.query('DELETE FROM users WHERE id = ?', [id]);
    return true;
  }

  // --- ROLES ---
  async getRoleByName(name) {
    const [rows] = await db.query('SELECT * FROM roles WHERE name = ?', [name]);
    return rows[0] || null;
  }

  async getAllRoles() {
    const [rows] = await db.query('SELECT * FROM roles ORDER BY id ASC');
    return rows;
  }

  // --- SHARES ---
  async findSharesByViewer(viewerId) {
    logger.debug(`[AuthRepository] Buscando shares para viewer ID: ${viewerId}`);
    const [rows] = await db.query(
      `SELECT us.*, u.name as owner_name, u.email as owner_email, u.username as owner_username, u.avatar_url as owner_avatar
       FROM user_shares us 
       JOIN users u ON us.owner_id = u.id 
       WHERE us.viewer_id = ?`,
      [viewerId]
    );
    return rows;
  }

  async findSharesByOwner(ownerId) {
    logger.debug(`[AuthRepository] Buscando shares del owner ID: ${ownerId}`);
    const [rows] = await db.query(
      `SELECT us.*, u.name as viewer_name, u.email as viewer_email, u.username as viewer_username, u.avatar_url as viewer_avatar
       FROM user_shares us 
       JOIN users u ON us.viewer_id = u.id 
       WHERE us.owner_id = ?`,
      [ownerId]
    );
    return rows;
  }

  async createShare(ownerId, viewerId) {
    logger.info(`[AuthRepository] Creando share: owner ${ownerId} -> viewer ${viewerId}`);
    const [result] = await db.query(
      'INSERT INTO user_shares (owner_id, viewer_id) VALUES (?, ?)',
      [ownerId, viewerId]
    );
    return result.insertId;
  }

  async deleteShare(ownerId, viewerId) {
    logger.info(`[AuthRepository] Eliminando share: owner ${ownerId} -> viewer ${viewerId}`);
    await db.query(
      'DELETE FROM user_shares WHERE owner_id = ? AND viewer_id = ?',
      [ownerId, viewerId]
    );
    return true;
  }

  async shareExists(ownerId, viewerId) {
    const [rows] = await db.query(
      'SELECT id FROM user_shares WHERE owner_id = ? AND viewer_id = ?',
      [ownerId, viewerId]
    );
    return rows.length > 0;
  }

  // --- UTILIDAD: verificar propiedad de un año ---
  async getYearOwnerId(yearId) {
    const [rows] = await db.query('SELECT user_id FROM years WHERE id = ?', [yearId]);
    return rows[0] ? rows[0].user_id : null;
  }

  // --- UTILIDAD: verificar propiedad de un mes (via year) ---
  async getMonthOwnerId(monthId) {
    const [rows] = await db.query(
      'SELECT y.user_id FROM months m JOIN years y ON m.year_id = y.id WHERE m.id = ?',
      [monthId]
    );
    return rows[0] ? rows[0].user_id : null;
  }

  // --- UTILIDAD: verificar propiedad de una semana (via month -> year) ---
  async getWeekOwnerId(weekId) {
    const [rows] = await db.query(
      `SELECT y.user_id FROM weeks w 
       JOIN months m ON w.month_id = m.id 
       JOIN years y ON m.year_id = y.id 
       WHERE w.id = ?`,
      [weekId]
    );
    return rows[0] ? rows[0].user_id : null;
  }

  // --- UTILIDAD: user_id del password_hash ---
  async getPasswordHash(userId) {
    const [rows] = await db.query('SELECT password_hash FROM users WHERE id = ?', [userId]);
    return rows[0] ? rows[0].password_hash : null;
  }
}

module.exports = new AuthRepository();
