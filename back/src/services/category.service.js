const categoryRepository = require('../repositories/category.repository');
const logger = require('../config/logger');
const AppError = require('../utils/app-error');

const HEX_COLOR_REGEX = /^#[0-9A-Fa-f]{6}$/;
const ICON_REGEX = /^[a-z0-9- ]+$/;

class CategoryService {
  _validateCategoryFields({ name, color, icon }, { partial = false } = {}) {
    if (!partial && (!name || !color || !icon)) {
      throw new AppError(400, 'Nombre, color e icono son requeridos');
    }

    if (name !== undefined) {
      if (typeof name !== 'string' || !name.trim()) {
        throw new AppError(400, 'El nombre es requerido');
      }
      if (name.trim().length > 50) {
        throw new AppError(400, 'El nombre no puede exceder 50 caracteres');
      }
    }

    if (color !== undefined) {
      if (typeof color !== 'string' || !HEX_COLOR_REGEX.test(color.trim())) {
        throw new AppError(400, 'El color debe tener formato hexadecimal #RRGGBB');
      }
    }

    if (icon !== undefined) {
      if (
        typeof icon !== 'string' ||
        icon.trim().length === 0 ||
        icon.length > 30 ||
        !ICON_REGEX.test(icon)
      ) {
        throw new AppError(
          400,
          'El icono no puede exceder 30 caracteres y solo permite [a-z0-9- ]'
        );
      }
    }
  }

  async getAllCategories(userId) {
    logger.info(`[CategoryService] Obteniendo categorías para usuario ${userId || 'global'}`);
    if (userId) {
      return await categoryRepository.getAllForUser(userId);
    }
    return await categoryRepository.getAll();
  }

  async createCategory(name, color, icon, userId) {
    logger.info(`[CategoryService] Creando categoría: ${name} para usuario ${userId}`);

    this._validateCategoryFields({ name, color, icon }, { partial: false });

    const cleanName = name.trim();
    const cleanColor = color.trim();

    // Check for duplicates within user's scope
    const existing = await categoryRepository.findUserCategoryByName(userId, cleanName);
    if (existing) {
      throw new AppError(409, 'Ya tienes una categoría con ese nombre');
    }

    const id = await categoryRepository.create(cleanName, cleanColor, icon, userId);
    return await categoryRepository.getById(id);
  }

  async updateCategory(id, data = {}, userOrId = null, roleArg = null) {
    logger.info(`[CategoryService] Actualizando categoría ID: ${id}`);

    let userId = userOrId;
    let userRole = roleArg;
    if (userOrId && typeof userOrId === 'object') {
      userId = userOrId.effectiveUserId ?? userOrId.id ?? userOrId.userId ?? null;
      userRole = userOrId.role || roleArg;
    }

    const category = await categoryRepository.getById(id);
    if (!category) {
      throw new AppError(404, 'Categoría no encontrada');
    }

    const isGlobal = category.user_id === null || category.user_id === undefined || Boolean(category.isGlobal);

    if (isGlobal) {
      if (userRole !== 'admin') {
        throw new AppError(403, 'No puedes modificar categorías predeterminadas');
      }
    } else if (userId == null || Number(category.user_id) !== Number(userId)) {
      throw new AppError(404, 'Categoría no encontrada');
    }

    const { name, color, icon } = data;
    this._validateCategoryFields({ name, color, icon }, { partial: true });

    const updatePayload = {};
    if (name !== undefined) {
      const cleanName = name.trim();
      if (isGlobal) {
        const existingGlobal = await categoryRepository.findGlobalCategoryByName(cleanName);
        if (existingGlobal && Number(existingGlobal.id) !== Number(id)) {
          throw new AppError(409, 'Ya existe una categoría predeterminada con ese nombre');
        }
      } else {
        const existingUser = await categoryRepository.findUserCategoryByName(category.user_id, cleanName);
        if (existingUser && Number(existingUser.id) !== Number(id)) {
          throw new AppError(409, 'Ya tienes una categoría con ese nombre');
        }
      }
      updatePayload.name = cleanName;
    }

    if (color !== undefined) {
      updatePayload.color = color.trim();
    }

    if (icon !== undefined) {
      updatePayload.icon = icon;
    }

    await categoryRepository.update(id, updatePayload);
    return await categoryRepository.getById(id);
  }

  async deleteCategory(id, userId) {
    logger.info(`[CategoryService] Eliminando categoría ID: ${id} por usuario: ${userId}`);

    const category = await categoryRepository.getById(id);
    if (!category) {
      throw new AppError(404, 'Categoría no encontrada');
    }

    if (category.isGlobal || category.user_id === null || category.user_id === undefined) {
      throw new AppError(403, 'No puedes eliminar las categorías predeterminadas del sistema');
    }

    if (userId == null || Number(category.user_id) !== Number(userId)) {
      throw new AppError(404, 'Categoría no encontrada');
    }

    await categoryRepository.delete(id);
    return true;
  }
}

module.exports = new CategoryService();
