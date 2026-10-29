const db = require('../config/database');
const logger = require('../config/logger');
const ownershipRepository = require('./ownership.repository');

class AuthRepository {
  // --- USERS ---
  async findUserByEmail(email) {
    logger.debug(`[AuthRepository] Buscando usuario por email: ${logger.maskEmail(email)}`);
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
    logger.info(`[AuthRepository] Creando usuario: ${logger.maskEmail(email)} (${username})`);
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

  // --- UTILIDAD: verificar propiedad (delegado a ownership.repository) ---
  async getYearOwnerId(yearId) {
    return ownershipRepository.getYearOwnerId(yearId);
  }

  async getMonthOwnerId(monthId) {
    return ownershipRepository.getMonthOwnerId(monthId);
  }

  async getWeekOwnerId(weekId) {
    return ownershipRepository.getWeekOwnerId(weekId);
  }

  // --- UTILIDAD: user_id del password_hash ---
  async getPasswordHash(userId) {
    const [rows] = await db.query('SELECT password_hash FROM users WHERE id = ?', [userId]);
    return rows[0] ? rows[0].password_hash : null;
  }

  // --- REFRESH TOKENS ---
  async createRefreshToken({ userId, tokenHash, familyId, expiresAt, userAgent = null, ip = null }) {
    const [result] = await db.query(
      `INSERT INTO refresh_tokens (user_id, token_hash, family_id, expires_at, user_agent, ip)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [
        userId,
        tokenHash,
        familyId,
        expiresAt,
        userAgent ? String(userAgent).slice(0, 255) : null,
        ip ? String(ip).slice(0, 45) : null,
      ]
    );
    return result.insertId;
  }

  async findRefreshTokenByHash(tokenHash) {
    const [rows] = await db.query(
      'SELECT * FROM refresh_tokens WHERE token_hash = ? LIMIT 1',
      [tokenHash]
    );
    return rows[0] || null;
  }

  async revokeRefreshTokenById(id) {
    const [result] = await db.query(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE id = ? AND revoked_at IS NULL',
      [id]
    );
    return result.affectedRows > 0;
  }

  async revokeRefreshTokenByHash(tokenHash) {
    const [result] = await db.query(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE token_hash = ? AND revoked_at IS NULL',
      [tokenHash]
    );
    return result.affectedRows > 0;
  }

  async revokeRefreshTokenFamily(familyId) {
    logger.warn(`[AuthRepository] Revocando familia completa de refresh tokens: ${familyId}`);
    const [result] = await db.query(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE family_id = ? AND revoked_at IS NULL',
      [familyId]
    );
    return result.affectedRows;
  }

  async revokeAllUserRefreshTokens(userId) {
    logger.info(`[AuthRepository] Revocando todos los refresh tokens del usuario ID: ${userId}`);
    const [result] = await db.query(
      'UPDATE refresh_tokens SET revoked_at = NOW() WHERE user_id = ? AND revoked_at IS NULL',
      [userId]
    );
    return result.affectedRows;
  }
}

module.exports = new AuthRepository();
