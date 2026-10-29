const categoryRepository = require('../repositories/category.repository');
const logger = require('../config/logger');
const AppError = require('../utils/app-error');

class CategoryService {
  async getAllCategories(userId) {
    logger.info(`[CategoryService] Obteniendo categorías para usuario ${userId || 'global'}`);
    if (userId) {
      return await categoryRepository.getAllForUser(userId);
    }
    return await categoryRepository.getAll();
  }

  async createCategory(name, color, icon, userId) {
    logger.info(`[CategoryService] Creando categoría: ${name} para usuario ${userId}`);

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
