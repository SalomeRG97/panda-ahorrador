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

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const USERNAME_REGEX = /^[a-zA-Z0-9_.]{3,30}$/;
const ADMIN_UPDATE_WHITELIST = ['name', 'email', 'username', 'role', 'isActive'];

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
  _normalizeAndValidateEmail(rawEmail) {
    if (typeof rawEmail !== 'string') {
      throw new AppError(400, 'El formato del email no es válido');
    }
    const email = rawEmail.trim().toLowerCase();
    if (!email || email.length > 255 || !EMAIL_REGEX.test(email)) {
      throw new AppError(400, 'El formato del email no es válido');
    }
    return email;
  }

  _normalizeAndValidateUsername(rawUsername) {
    if (typeof rawUsername !== 'string') {
      throw new AppError(400, 'El nombre de usuario no es válido');
    }
    const username = rawUsername.trim();
    if (!USERNAME_REGEX.test(username)) {
      throw new AppError(
        400,
        'El nombre de usuario debe tener entre 3 y 30 caracteres y solo usar [a-zA-Z0-9_.]'
      );
    }
    return username;
  }

  _generateSecureRandomPassword(length = 16) {
    const upper = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ';
    const lower = 'abcdefghijklmnopqrstuvwxyz';
    const digits = '0123456789';
    const special = '@$!%*?&.#_-';
    const all = upper + lower + digits + special;

    const chars = [
      upper[crypto.randomInt(upper.length)],
      lower[crypto.randomInt(lower.length)],
      digits[crypto.randomInt(digits.length)],
      special[crypto.randomInt(special.length)],
    ];

    for (let i = chars.length; i < length; i++) {
      chars.push(all[crypto.randomInt(all.length)]);
    }

    // Fisher-Yates shuffle con CSPRNG
    for (let i = chars.length - 1; i > 0; i--) {
      const j = crypto.randomInt(i + 1);
      [chars[i], chars[j]] = [chars[j], chars[i]];
    }

    const password = chars.join('');
    this._validatePasswordStrength(password);
    return password;
  }

  // --- REGISTRO ---
  async register(email, username, password, name, meta = {}) {
    logger.info(`[AuthService] Registrando nuevo usuario: ${logger.maskEmail(email)}`);

    if (!email || !username || !password || !name || typeof name !== 'string' || !name.trim()) {
      throw new AppError(400, 'Todos los campos son requeridos');
    }

    const cleanEmail = this._normalizeAndValidateEmail(email);
    const cleanUsername = this._normalizeAndValidateUsername(username);
    const cleanName = name.trim();

    this._validatePasswordStrength(password);

    const existingEmail = await authRepository.findUserByEmail(cleanEmail);
    if (existingEmail) {
      throw new AppError(409, 'El email ya está registrado');
    }

    const existingUsername = await authRepository.findUserByUsername(cleanUsername);
    if (existingUsername) {
      throw new AppError(409, 'El nombre de usuario ya está en uso');
    }

    const role = await authRepository.getRoleByName('regular');
    if (!role) {
      throw new AppError(500, 'Error de configuración: rol regular no encontrado');
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const userId = await authRepository.createUser({
      email: cleanEmail,
      username: cleanUsername,
      passwordHash,
      name: cleanName,
      roleId: role.id,
      mustChangePassword: false,
    });

    const user = await authRepository.findUserById(userId);
    const accessToken = this._generateAccessToken(user);
    const refreshToken = await this._issueRefreshToken(user.id, null, meta);

    return {
      user: this._sanitizeUser(user),
      accessToken,
      refreshToken,
      mustChangePassword: false,
    };
  }

  // --- LOGIN ---
  async login(email, password, meta = {}) {
    const cleanEmail = typeof email === 'string' ? email.trim().toLowerCase() : '';
    logger.info(`[AuthService] Intento de login: ${logger.maskEmail(cleanEmail)}`);

    const user = await authRepository.findUserByEmail(cleanEmail);
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
    const sanitizedUser = this._sanitizeUser(user);
    logger.info(
      `[AuthService] Login exitoso: usuario ID ${user.id} (${logger.maskEmail(cleanEmail)}, rol: ${user.role_name})`
    );

    return {
      user: sanitizedUser,
      accessToken,
      refreshToken,
      mustChangePassword: sanitizedUser.mustChangePassword,
    };
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
    const sanitizedUser = this._sanitizeUser(user);

    return {
      user: sanitizedUser,
      accessToken,
      refreshToken: newRefreshToken,
      mustChangePassword: sanitizedUser.mustChangePassword,
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
    const isMatch = await bcrypt.compare(oldPassword || '', currentHash || '');
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
    if (typeof password !== 'string' || password.length < 8) {
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

  async updateProfile(userId, { name, email, username } = {}) {
    logger.info(`[AuthService] Actualizando perfil del usuario ID: ${userId}`);

    const fields = {};

    if (name !== undefined && name !== null) {
      if (typeof name !== 'string' || !name.trim()) {
        throw new AppError(400, 'El nombre no puede estar vacío');
      }
      fields.name = name.trim();
    }

    if (email !== undefined && email !== null) {
      const cleanEmail = this._normalizeAndValidateEmail(email);
      const existing = await authRepository.findUserByEmail(cleanEmail);
      if (existing && Number(existing.id) !== Number(userId)) {
        throw new AppError(409, 'El email ya está en uso por otro usuario');
      }
      fields.email = cleanEmail;
    }

    if (username !== undefined && username !== null) {
      const cleanUsername = this._normalizeAndValidateUsername(username);
      const existing = await authRepository.findUserByUsername(cleanUsername);
      if (existing && Number(existing.id) !== Number(userId)) {
        throw new AppError(409, 'El nombre de usuario ya está en uso');
      }
      fields.username = cleanUsername;
    }

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

    if (!email || !username || !name || typeof name !== 'string' || !name.trim()) {
      throw new AppError(400, 'Email, nombre de usuario y nombre son requeridos');
    }

    const cleanEmail = this._normalizeAndValidateEmail(email);
    const cleanUsername = this._normalizeAndValidateUsername(username);
    const cleanName = name.trim();

    const role = await authRepository.getRoleByName(roleName);
    if (!role) {
      throw new AppError(400, `Rol '${roleName}' no es válido`);
    }

    const existingEmail = await authRepository.findUserByEmail(cleanEmail);
    if (existingEmail) {
      throw new AppError(409, 'El email ya está registrado');
    }

    const existingUsername = await authRepository.findUserByUsername(cleanUsername);
    if (existingUsername) {
      throw new AppError(409, 'El nombre de usuario ya está en uso');
    }

    let generatedPassword = null;
    let userPassword = null;

    if (password !== undefined && password !== null && String(password).length > 0) {
      userPassword = String(password);
      this._validatePasswordStrength(userPassword);
    } else {
      generatedPassword = this._generateSecureRandomPassword(16);
      userPassword = generatedPassword;
    }

    const passwordHash = await bcrypt.hash(userPassword, SALT_ROUNDS);

    const userId = await authRepository.createUser({
      email: cleanEmail,
      username: cleanUsername,
      passwordHash,
      name: cleanName,
      roleId: role.id,
      mustChangePassword: true,
    });

    const user = await authRepository.findUserById(userId);
    const sanitized = this._sanitizeUser(
      user || {
        id: userId,
        email: cleanEmail,
        username: cleanUsername,
        name: cleanName,
        role_name: roleName,
        role_id: role.id,
        is_active: true,
        must_change_password: true,
      }
    );
    sanitized.mustChangePassword = true;

    if (generatedPassword) {
      return {
        ...sanitized,
        temporaryPassword: generatedPassword,
        generatedPassword,
        password: generatedPassword,
      };
    }

    return sanitized;
  }

  async _assertNotRemovingLastAdmin(targetUser, { nextRoleName, nextIsActive }, actingAdminId = null) {
    const targetId = Number(targetUser.id);
    const isSelf = actingAdminId !== null && actingAdminId !== undefined && Number(actingAdminId) === targetId;

    if (isSelf) {
      if (nextRoleName !== undefined && nextRoleName !== 'admin') {
        throw new AppError(400, 'No puedes quitarte el rol de administrador a ti mismo');
      }
      if (nextIsActive !== undefined && !nextIsActive) {
        throw new AppError(400, 'No puedes desactivar tu propia cuenta de administrador');
      }
    }

    const currentRole = targetUser.role_name || targetUser.role;
    const currentlyActiveAdmin = currentRole === 'admin' && Boolean(targetUser.is_active);

    if (currentlyActiveAdmin) {
      const losingAdminRole = nextRoleName !== undefined && nextRoleName !== 'admin';
      const beingDeactivated = nextIsActive !== undefined && !nextIsActive;

      if (losingAdminRole || beingDeactivated) {
        const remainingAdmins = await authRepository.countActiveAdminsExcluding(targetId);
        if (remainingAdmins < 1) {
          throw new AppError(400, 'El sistema debe contar con al menos un administrador activo');
        }
      }
    }
  }

  async adminUpdateUser(userId, rawFields = {}, actingAdminId = null) {
    logger.info(`[AuthService] Admin actualizando usuario ID: ${userId}`);

    const targetUser = await authRepository.findUserById(userId);
    if (!targetUser) {
      throw new AppError(404, 'Usuario no encontrado');
    }

    // Lista blanca explícita de campos permitidos
    const whitelisted = {};
    if (rawFields && typeof rawFields === 'object') {
      for (const key of ADMIN_UPDATE_WHITELIST) {
        if (rawFields[key] !== undefined) {
          whitelisted[key] = rawFields[key];
        }
      }
    }

    const nextIsActive =
      whitelisted.isActive !== undefined
        ? Boolean(whitelisted.isActive && whitelisted.isActive !== 'false' && whitelisted.isActive !== 0)
        : undefined;

    await this._assertNotRemovingLastAdmin(
      targetUser,
      { nextRoleName: whitelisted.role, nextIsActive },
      actingAdminId
    );

    const dbFields = {};

    if (whitelisted.name !== undefined) {
      if (typeof whitelisted.name !== 'string' || !whitelisted.name.trim()) {
        throw new AppError(400, 'El nombre no puede estar vacío');
      }
      dbFields.name = whitelisted.name.trim();
    }

    if (whitelisted.email !== undefined) {
      const cleanEmail = this._normalizeAndValidateEmail(whitelisted.email);
      const existingEmail = await authRepository.findUserByEmail(cleanEmail);
      if (existingEmail && Number(existingEmail.id) !== Number(userId)) {
        throw new AppError(409, 'El email ya está en uso por otro usuario');
      }
      dbFields.email = cleanEmail;
    }

    if (whitelisted.username !== undefined) {
      const cleanUsername = this._normalizeAndValidateUsername(whitelisted.username);
      const existingUsername = await authRepository.findUserByUsername(cleanUsername);
      if (existingUsername && Number(existingUsername.id) !== Number(userId)) {
        throw new AppError(409, 'El nombre de usuario ya está en uso');
      }
      dbFields.username = cleanUsername;
    }

    if (whitelisted.role !== undefined) {
      const role = await authRepository.getRoleByName(whitelisted.role);
      if (!role) {
        throw new AppError(400, `Rol '${whitelisted.role}' no es válido`);
      }
      dbFields.role_id = role.id;
    }

    if (nextIsActive !== undefined) {
      dbFields.is_active = nextIsActive;
    }

    await authRepository.updateUser(userId, dbFields);

    if (dbFields.is_active === false) {
      await authRepository.revokeAllUserRefreshTokens(userId);
    }
    invalidateUserCache(userId);

    const user = await authRepository.findUserById(userId);
    return this._sanitizeUser(user);
  }

  async adminDeleteUser(userId, actingAdminId = null) {
    logger.info(`[AuthService] Admin eliminando (desactivando) usuario ID: ${userId}`);
    const targetUser = await authRepository.findUserById(userId);
    if (targetUser) {
      await this._assertNotRemovingLastAdmin(
        targetUser,
        { nextIsActive: false },
        actingAdminId
      );
    }
    await authRepository.deactivateUser(userId);
    await authRepository.revokeAllUserRefreshTokens(userId);
    invalidateUserCache(userId);
    return true;
  }

  async toggleUserStatus(userId, isActive, actingAdminId = null) {
    logger.info(`[AuthService] Admin cambiando estado de usuario ID ${userId} a active=${isActive}`);
    const normalizedActive = Boolean(isActive && isActive !== 'false' && isActive !== 0);
    const targetUser = await authRepository.findUserById(userId);
    if (targetUser) {
      await this._assertNotRemovingLastAdmin(
        targetUser,
        { nextIsActive: normalizedActive },
        actingAdminId
      );
    }
    await authRepository.updateUser(userId, { is_active: normalizedActive });
    if (!normalizedActive) {
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
    const cleanEmail = typeof viewerEmail === 'string' ? viewerEmail.trim().toLowerCase() : '';
    logger.info(`[AuthService] Usuario ${ownerId} compartiendo con ${logger.maskEmail(cleanEmail)}`);

    const viewer = await authRepository.findUserByEmail(cleanEmail);
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
    const mustChange = Boolean(user.must_change_password ?? user.mustChangePassword);
    return {
      id: user.id,
      email: user.email,
      username: user.username,
      name: user.name,
      role: user.role_name || user.role,
      roleId: user.role_id ?? user.roleId,
      avatarUrl: user.avatar_url ?? user.avatarUrl ?? null,
      isActive: Boolean(user.is_active ?? user.isActive ?? true),
      mustChangePassword: mustChange,
      createdAt: user.created_at ?? user.createdAt,
      updatedAt: user.updated_at ?? user.updatedAt,
    };
  }
}

module.exports = new AuthService();
