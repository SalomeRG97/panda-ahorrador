const crypto = require('crypto');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authRepository = require('../repositories/auth.repository');
const config = require('../config/environment');
const logger = require('../config/logger');
const AppError = require('../utils/app-error');
const { invalidateUserCache } = require('../middlewares/auth.middleware');

const SALT_ROUNDS = 12;
const REFRESH_TOKEN_BYTES = 64;
const REFRESH_TOKEN_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 7 días

function toMySqlUtcDatetime(date) {
  return date.toISOString().slice(0, 19).replace('T', ' ');
}

function parseMySqlUtcDatetime(val) {
  if (val instanceof Date) return val;
  const str = String(val).trim();
  if (str.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(str)) {
    return new Date(str);
  }
  return new Date(`${str.replace(' ', 'T')}Z`);
}

class AuthService {
  // --- REGISTRO ---
  async register(email, username, password, name, meta = {}) {
    logger.info(`[AuthService] Registrando nuevo usuario: ${logger.maskEmail(email)}`);

    if (!email || !username || !password || !name) {
      throw new AppError(400, 'Todos los campos son requeridos');
    }

    this._validatePasswordStrength(password);

    const existingEmail = await authRepository.findUserByEmail(email);
    if (existingEmail) {
      throw new AppError(409, 'El email ya está registrado');
    }

    const existingUsername = await authRepository.findUserByUsername(username);
    if (existingUsername) {
      throw new AppError(409, 'El nombre de usuario ya está en uso');
    }

    const role = await authRepository.getRoleByName('regular');
    if (!role) {
      throw new AppError(500, 'Error de configuración: rol regular no encontrado');
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const userId = await authRepository.createUser({
      email,
      username,
      passwordHash,
      name,
      roleId: role.id,
    });

    const user = await authRepository.findUserById(userId);
    const accessToken = this._generateAccessToken(user);
    const refreshToken = await this._issueRefreshToken(user.id, null, meta);

    return { user: this._sanitizeUser(user), accessToken, refreshToken };
  }

  // --- LOGIN ---
  async login(email, password, meta = {}) {
    logger.info(`[AuthService] Intento de login: ${logger.maskEmail(email)}`);

    const user = await authRepository.findUserByEmail(email);
    if (!user) {
      throw new AppError(401, 'Credenciales inválidas');
    }

    if (!user.is_active) {
      throw new AppError(403, 'La cuenta está desactivada. Contacta al administrador.');
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw new AppError(401, 'Credenciales inválidas');
    }

    const accessToken = this._generateAccessToken(user);
    const refreshToken = await this._issueRefreshToken(user.id, null, meta);
    logger.info(
      `[AuthService] Login exitoso: usuario ID ${user.id} (${logger.maskEmail(email)}, rol: ${user.role_name})`
    );

    return { user: this._sanitizeUser(user), accessToken, refreshToken };
  }

  // --- REFRESH TOKEN (con rotación y detección de reutilización por familia) ---
  async refreshToken(rawRefreshToken, meta = {}) {
    if (!rawRefreshToken || typeof rawRefreshToken !== 'string') {
      throw new AppError(401, 'Token de refresco inválido o ausente');
    }

    const tokenHash = this._hashToken(rawRefreshToken);
    const storedToken = await authRepository.findRefreshTokenByHash(tokenHash);

    if (!storedToken) {
      throw new AppError(401, 'Token de refresco inválido o expirado');
    }

    // Detección de reutilización: si el token ya estaba revocado, invalidar toda la familia
    if (storedToken.revoked_at !== null && storedToken.revoked_at !== undefined) {
      logger.warn(
        `[AuthService] Reutilización de refresh token detectada (user_id=${storedToken.user_id}, family_id=${storedToken.family_id}). Revocando toda la familia.`
      );
      await authRepository.revokeRefreshTokenFamily(storedToken.family_id);
      invalidateUserCache(storedToken.user_id);
      throw new AppError(401, 'Sesión invalidada por reutilización de token');
    }

    // Verificar expiración
    const expiresAt = parseMySqlUtcDatetime(storedToken.expires_at);
    if (expiresAt <= new Date()) {
      await authRepository.revokeRefreshTokenById(storedToken.id);
      throw new AppError(401, 'Token de refresco expirado');
    }

    // Verificar usuario activo
    const user = await authRepository.findUserById(storedToken.user_id);
    if (!user || !user.is_active) {
      await authRepository.revokeRefreshTokenFamily(storedToken.family_id);
      invalidateUserCache(storedToken.user_id);
      throw new AppError(401, 'Usuario inactivo o no autorizado');
    }

    // Rotación: revocar el actual y emitir uno nuevo de la misma familia
    await authRepository.revokeRefreshTokenById(storedToken.id);
    const newRefreshToken = await this._issueRefreshToken(
      user.id,
      storedToken.family_id,
      meta
    );
    const accessToken = this._generateAccessToken(user);

    return {
      user: this._sanitizeUser(user),
      accessToken,
      refreshToken: newRefreshToken,
    };
  }

  // --- LOGOUT ---
  async logout(rawRefreshToken) {
    if (rawRefreshToken && typeof rawRefreshToken === 'string') {
      const tokenHash = this._hashToken(rawRefreshToken);
      await authRepository.revokeRefreshTokenByHash(tokenHash);
    }
    return true;
  }

  // --- LOGOUT ALL ---
  async logoutAll(userId) {
    logger.info(`[AuthService] Cerrando todas las sesiones del usuario ID: ${userId}`);
    await authRepository.revokeAllUserRefreshTokens(userId);
    invalidateUserCache(userId);
    return true;
  }

  // --- CAMBIAR CONTRASEÑA ---
  async changePassword(userId, oldPassword, newPassword) {
    logger.info(`[AuthService] Cambio de contraseña para usuario ID: ${userId}`);

    if (!newPassword) {
      throw new AppError(400, 'La nueva contraseña es requerida');
    }

    this._validatePasswordStrength(newPassword);

    const currentHash = await authRepository.getPasswordHash(userId);
    const isMatch = await bcrypt.compare(oldPassword, currentHash);
    if (!isMatch) {
      throw new AppError(401, 'La contraseña actual es incorrecta');
    }

    const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await authRepository.updatePassword(userId, newHash);

    // Revocar todos los refresh tokens del usuario al cambiar contraseña
    await authRepository.revokeAllUserRefreshTokens(userId);
    invalidateUserCache(userId);

    return true;
  }

  _validatePasswordStrength(password) {
    if (password.length < 8) {
      throw new AppError(400, 'La contraseña debe tener al menos 8 caracteres');
    }
    if (!/[A-Z]/.test(password)) {
      throw new AppError(400, 'La contraseña debe incluir al menos una letra mayúscula');
    }
    if (!/[a-z]/.test(password)) {
      throw new AppError(400, 'La contraseña debe incluir al menos una letra minúscula');
    }
    if (!/[0-9]/.test(password)) {
      throw new AppError(400, 'La contraseña debe incluir al menos un número');
    }
    if (!/[@$!%*?&.#_\-]/.test(password)) {
      throw new AppError(400, 'La contraseña debe incluir al menos un carácter especial (@$!%*?&.#_-)');
    }
  }

  // --- PERFIL ---
  async getProfile(userId) {
    const user = await authRepository.findUserById(userId);
    if (!user) {
      throw new AppError(404, 'Usuario no encontrado');
    }
    return this._sanitizeUser(user);
  }

  async updateProfile(userId, { name, email, username }) {
    logger.info(`[AuthService] Actualizando perfil del usuario ID: ${userId}`);

    if (email) {
      const existing = await authRepository.findUserByEmail(email);
      if (existing && existing.id !== userId) {
        throw new AppError(409, 'El email ya está en uso por otro usuario');
      }
    }

    if (username) {
      const existing = await authRepository.findUserByUsername(username);
      if (existing && existing.id !== userId) {
        throw new AppError(409, 'El nombre de usuario ya está en uso');
      }
    }

    const fields = {};
    if (name) fields.name = name;
    if (email) fields.email = email;
    if (username) fields.username = username;

    await authRepository.updateUser(userId, fields);
    invalidateUserCache(userId);
    return await this.getProfile(userId);
  }

  async updateAvatar(userId, avatarUrl) {
    logger.info(`[AuthService] Actualizando avatar del usuario ID: ${userId}`);
    await authRepository.updateUser(userId, { avatar_url: avatarUrl });
    return await this.getProfile(userId);
  }

  // --- ADMIN: Gestión de usuarios ---
  async adminCreateUser(email, username, name, roleName, password) {
    logger.info(`[AuthService] Admin creando usuario: ${logger.maskEmail(email)} con rol ${roleName}`);

    const role = await authRepository.getRoleByName(roleName);
    if (!role) {
      throw new AppError(400, `Rol '${roleName}' no es válido`);
    }

    const existingEmail = await authRepository.findUserByEmail(email);
    if (existingEmail) {
      throw new AppError(409, 'El email ya está registrado');
    }

    const existingUsername = await authRepository.findUserByUsername(username);
    if (existingUsername) {
      throw new AppError(409, 'El nombre de usuario ya está en uso');
    }

    const userPassword = password || 'Temporal123!';
    const passwordHash = await bcrypt.hash(userPassword, SALT_ROUNDS);

    const userId = await authRepository.createUser({
      email,
      username,
      passwordHash,
      name,
      roleId: role.id,
    });

    const user = await authRepository.findUserById(userId);
    return this._sanitizeUser(user);
  }

  async adminUpdateUser(userId, fields) {
    logger.info(`[AuthService] Admin actualizando usuario ID: ${userId}`);

    if (fields.role) {
      const role = await authRepository.getRoleByName(fields.role);
      if (!role) {
        throw new AppError(400, `Rol '${fields.role}' no es válido`);
      }
      fields.role_id = role.id;
      delete fields.role;
    }

    if (fields.isActive !== undefined) {
      fields.is_active = fields.isActive;
      delete fields.isActive;
    }

    await authRepository.updateUser(userId, fields);

    if (fields.is_active === false || fields.is_active === 0) {
      await authRepository.revokeAllUserRefreshTokens(userId);
    }
    invalidateUserCache(userId);

    const user = await authRepository.findUserById(userId);
    return this._sanitizeUser(user);
  }

  async adminDeleteUser(userId) {
    logger.info(`[AuthService] Admin eliminando (desactivando) usuario ID: ${userId}`);
    await authRepository.deactivateUser(userId);
    await authRepository.revokeAllUserRefreshTokens(userId);
    invalidateUserCache(userId);
    return true;
  }

  async toggleUserStatus(userId, isActive) {
    logger.info(`[AuthService] Admin cambiando estado de usuario ID ${userId} a active=${isActive}`);
    await authRepository.updateUser(userId, { is_active: isActive });
    if (!isActive) {
      await authRepository.revokeAllUserRefreshTokens(userId);
    }
    invalidateUserCache(userId);
    const user = await authRepository.findUserById(userId);
    return this._sanitizeUser(user);
  }

  async getAllUsers() {
    const users = await authRepository.getAllUsers();
    return users.map((u) => this._sanitizeUser(u));
  }

  async getAllRoles() {
    return await authRepository.getAllRoles();
  }

  // --- SHARES ---
  async shareWithViewer(ownerId, viewerEmail) {
    logger.info(`[AuthService] Usuario ${ownerId} compartiendo con ${logger.maskEmail(viewerEmail)}`);

    const viewer = await authRepository.findUserByEmail(viewerEmail);
    if (!viewer) {
      throw new AppError(404, 'No se encontró un usuario con ese email');
    }

    if (viewer.role_name !== 'viewer') {
      throw new AppError(400, 'Solo puedes compartir con usuarios de rol Viewer');
    }

    if (viewer.id === ownerId) {
      throw new AppError(400, 'No puedes compartir contigo mismo');
    }

    const exists = await authRepository.shareExists(ownerId, viewer.id);
    if (exists) {
      throw new AppError(409, 'Ya compartes datos con este usuario');
    }

    await authRepository.createShare(ownerId, viewer.id);
    return { message: 'Datos compartidos exitosamente', viewerName: viewer.name };
  }

  async removeShare(ownerId, viewerId) {
    await authRepository.deleteShare(ownerId, viewerId);
    return true;
  }

  async getMyViewers(ownerId) {
    return await authRepository.findSharesByOwner(ownerId);
  }

  async getSharedWithMe(viewerId) {
    return await authRepository.findSharesByViewer(viewerId);
  }

  // --- HELPERS PRIVADOS ---
  _generateAccessToken(user) {
    const payload = {
      sub: user.id,
      role: user.role_name || user.role,
      typ: 'access',
    };

    return jwt.sign(payload, config.jwt.accessSecret, {
      expiresIn: config.jwt.accessExpiresIn || '15m',
    });
  }

  _hashToken(rawToken) {
    return crypto.createHash('sha256').update(rawToken).digest('hex');
  }

  async _issueRefreshToken(userId, existingFamilyId = null, meta = {}) {
    const rawToken = crypto.randomBytes(REFRESH_TOKEN_BYTES).toString('hex');
    const tokenHash = this._hashToken(rawToken);
    const familyId = existingFamilyId || crypto.randomUUID();
    const expiresAt = toMySqlUtcDatetime(new Date(Date.now() + REFRESH_TOKEN_TTL_MS));

    await authRepository.createRefreshToken({
      userId,
      tokenHash,
      familyId,
      expiresAt,
      userAgent: meta.userAgent || null,
      ip: meta.ip || null,
    });

    return rawToken;
  }

  _sanitizeUser(user) {
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      role: user.role_name,
      roleId: user.role_id,
      avatarUrl: user.avatar_url,
      isActive: user.is_active,
      createdAt: user.created_at,
      updatedAt: user.updated_at,
    };
  }
}

module.exports = new AuthService();
