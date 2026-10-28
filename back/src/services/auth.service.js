const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const authRepository = require('../repositories/auth.repository');
const config = require('../config/environment');
const logger = require('../config/logger');

const SALT_ROUNDS = 12;

class AuthService {
  // --- REGISTRO ---
  async register(email, username, password, name) {
    logger.info(`[AuthService] Registrando nuevo usuario: ${email}`);

    // Validaciones
    if (!email || !username || !password || !name) {
      throw { statusCode: 400, message: 'Todos los campos son requeridos' };
    }

    this._validatePasswordStrength(password);

    // Verificar email duplicado
    const existingEmail = await authRepository.findUserByEmail(email);
    if (existingEmail) {
      throw { statusCode: 409, message: 'El email ya está registrado' };
    }

    // Verificar username duplicado
    const existingUsername = await authRepository.findUserByUsername(username);
    if (existingUsername) {
      throw { statusCode: 409, message: 'El nombre de usuario ya está en uso' };
    }

    // Obtener rol 'regular'
    const role = await authRepository.getRoleByName('regular');
    if (!role) {
      throw { statusCode: 500, message: 'Error de configuración: rol regular no encontrado' };
    }

    const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
    const userId = await authRepository.createUser({
      email,
      username,
      passwordHash,
      name,
      roleId: role.id
    });

    const user = await authRepository.findUserById(userId);
    const tokens = this._generateTokens(user);

    return { user: this._sanitizeUser(user), ...tokens };
  }

  // --- LOGIN ---
  async login(email, password) {
    logger.info(`[AuthService] Intento de login: ${email}`);

    const user = await authRepository.findUserByEmail(email);
    if (!user) {
      throw { statusCode: 401, message: 'Credenciales inválidas' };
    }

    if (!user.is_active) {
      throw { statusCode: 403, message: 'La cuenta está desactivada. Contacta al administrador.' };
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      throw { statusCode: 401, message: 'Credenciales inválidas' };
    }

    const tokens = this._generateTokens(user);
    logger.info(`[AuthService] Login exitoso: ${email} (rol: ${user.role_name})`);

    return { user: this._sanitizeUser(user), ...tokens };
  }

  // --- REFRESH TOKEN ---
  async refreshToken(refreshToken) {
    try {
      const decoded = jwt.verify(refreshToken, config.jwt.secret);
      const user = await authRepository.findUserById(decoded.id);

      if (!user || !user.is_active) {
        throw { statusCode: 401, message: 'Token inválido' };
      }

      const tokens = this._generateTokens(user);
      return { user: this._sanitizeUser(user), ...tokens };
    } catch (error) {
      if (error.statusCode) throw error;
      throw { statusCode: 401, message: 'Token de refresco inválido o expirado' };
    }
  }

  // --- CAMBIAR CONTRASEÑA ---
  async changePassword(userId, oldPassword, newPassword) {
    logger.info(`[AuthService] Cambio de contraseña para usuario ID: ${userId}`);

    if (!newPassword) {
      throw { statusCode: 400, message: 'La nueva contraseña es requerida' };
    }

    this._validatePasswordStrength(newPassword);

    const currentHash = await authRepository.getPasswordHash(userId);
    const isMatch = await bcrypt.compare(oldPassword, currentHash);
    if (!isMatch) {
      throw { statusCode: 401, message: 'La contraseña actual es incorrecta' };
    }

    const newHash = await bcrypt.hash(newPassword, SALT_ROUNDS);
    await authRepository.updatePassword(userId, newHash);
    return true;
  }

  _validatePasswordStrength(password) {
    if (password.length < 8) {
      throw { statusCode: 400, message: 'La contraseña debe tener al menos 8 caracteres' };
    }
    if (!/[A-Z]/.test(password)) {
      throw { statusCode: 400, message: 'La contraseña debe incluir al menos una letra mayúscula' };
    }
    if (!/[a-z]/.test(password)) {
      throw { statusCode: 400, message: 'La contraseña debe incluir al menos una letra minúscula' };
    }
    if (!/[0-9]/.test(password)) {
      throw { statusCode: 400, message: 'La contraseña debe incluir al menos un número' };
    }
    if (!/[@$!%*?&.#_\-]/.test(password)) {
      throw { statusCode: 400, message: 'La contraseña debe incluir al menos un carácter especial (@$!%*?&.#_-)' };
    }
  }

  // --- PERFIL ---
  async getProfile(userId) {
    const user = await authRepository.findUserById(userId);
    if (!user) {
      throw { statusCode: 404, message: 'Usuario no encontrado' };
    }
    return this._sanitizeUser(user);
  }

  async updateProfile(userId, { name, email, username }) {
    logger.info(`[AuthService] Actualizando perfil del usuario ID: ${userId}`);

    // Verificar duplicados si cambian
    if (email) {
      const existing = await authRepository.findUserByEmail(email);
      if (existing && existing.id !== userId) {
        throw { statusCode: 409, message: 'El email ya está en uso por otro usuario' };
      }
    }

    if (username) {
      const existing = await authRepository.findUserByUsername(username);
      if (existing && existing.id !== userId) {
        throw { statusCode: 409, message: 'El nombre de usuario ya está en uso' };
      }
    }

    const fields = {};
    if (name) fields.name = name;
    if (email) fields.email = email;
    if (username) fields.username = username;

    await authRepository.updateUser(userId, fields);
    return await this.getProfile(userId);
  }

  async updateAvatar(userId, avatarUrl) {
    logger.info(`[AuthService] Actualizando avatar del usuario ID: ${userId}`);
    await authRepository.updateUser(userId, { avatar_url: avatarUrl });
    return await this.getProfile(userId);
  }

  // --- ADMIN: Gestión de usuarios ---
  async adminCreateUser(email, username, name, roleName, password) {
    logger.info(`[AuthService] Admin creando usuario: ${email} con rol ${roleName}`);

    const role = await authRepository.getRoleByName(roleName);
    if (!role) {
      throw { statusCode: 400, message: `Rol '${roleName}' no es válido` };
    }

    const existingEmail = await authRepository.findUserByEmail(email);
    if (existingEmail) {
      throw { statusCode: 409, message: 'El email ya está registrado' };
    }

    const existingUsername = await authRepository.findUserByUsername(username);
    if (existingUsername) {
      throw { statusCode: 409, message: 'El nombre de usuario ya está en uso' };
    }

    const userPassword = password || 'Temporal123!';
    const passwordHash = await bcrypt.hash(userPassword, SALT_ROUNDS);

    const userId = await authRepository.createUser({
      email,
      username,
      passwordHash,
      name,
      roleId: role.id
    });

    const user = await authRepository.findUserById(userId);
    return this._sanitizeUser(user);
  }

  async adminUpdateUser(userId, fields) {
    logger.info(`[AuthService] Admin actualizando usuario ID: ${userId}`);

    if (fields.role) {
      const role = await authRepository.getRoleByName(fields.role);
      if (!role) {
        throw { statusCode: 400, message: `Rol '${fields.role}' no es válido` };
      }
      fields.role_id = role.id;
      delete fields.role;
    }

    if (fields.isActive !== undefined) {
      fields.is_active = fields.isActive;
      delete fields.isActive;
    }

    await authRepository.updateUser(userId, fields);
    const user = await authRepository.findUserById(userId);
    return this._sanitizeUser(user);
  }

  async adminDeleteUser(userId) {
    logger.info(`[AuthService] Admin eliminando usuario ID: ${userId}`);
    await authRepository.deactivateUser(userId);
    return true;
  }

  async toggleUserStatus(userId, isActive) {
    logger.info(`[AuthService] Admin cambiando estado de usuario ID ${userId} a active=${isActive}`);
    await authRepository.updateUser(userId, { is_active: isActive });
    const user = await authRepository.findUserById(userId);
    return this._sanitizeUser(user);
  }

  async getAllUsers() {
    const users = await authRepository.getAllUsers();
    return users.map(u => this._sanitizeUser(u));
  }

  async getAllRoles() {
    return await authRepository.getAllRoles();
  }

  // --- SHARES ---
  async shareWithViewer(ownerId, viewerEmail) {
    logger.info(`[AuthService] Usuario ${ownerId} compartiendo con ${viewerEmail}`);

    const viewer = await authRepository.findUserByEmail(viewerEmail);
    if (!viewer) {
      throw { statusCode: 404, message: 'No se encontró un usuario con ese email' };
    }

    if (viewer.role_name !== 'viewer') {
      throw { statusCode: 400, message: 'Solo puedes compartir con usuarios de rol Viewer' };
    }

    if (viewer.id === ownerId) {
      throw { statusCode: 400, message: 'No puedes compartir contigo mismo' };
    }

    const exists = await authRepository.shareExists(ownerId, viewer.id);
    if (exists) {
      throw { statusCode: 409, message: 'Ya compartes datos con este usuario' };
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
  _generateTokens(user) {
    const payload = { id: user.id, email: user.email, role: user.role_name };

    const accessToken = jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.expiresIn
    });

    const refreshToken = jwt.sign(payload, config.jwt.secret, {
      expiresIn: config.jwt.refreshExpiresIn
    });

    return { accessToken, refreshToken };
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
      updatedAt: user.updated_at
    };
  }
}

module.exports = new AuthService();
