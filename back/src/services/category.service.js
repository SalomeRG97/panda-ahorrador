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

    if (!name || !color || !icon) {
      throw new AppError(400, 'Nombre, color e icono son requeridos');
    }

    if (name.length > 50) {
      throw new AppError(400, 'El nombre no puede exceder 50 caracteres');
    }

    // Check for duplicates within user's scope
    const existing = await categoryRepository.findUserCategoryByName(userId, name);
    if (existing) {
      throw new AppError(409, 'Ya tienes una categoría con ese nombre');
    }

    const id = await categoryRepository.create(name, color, icon, userId);
    return await categoryRepository.getById(id);
  }

  async updateCategory(id, data, userId) {
    logger.info(`[CategoryService] Actualizando categoría ID: ${id}`);

    const category = await categoryRepository.getById(id);
    if (!category) {
      throw new AppError(404, 'Categoría no encontrada');
    }

    if (category.user_id && userId != null && Number(category.user_id) !== Number(userId)) {
      throw new AppError(404, 'Categoría no encontrada');
    }

    await categoryRepository.update(id, data);
    return await categoryRepository.getById(id);
  }

  async deleteCategory(id, userId) {
    logger.info(`[CategoryService] Eliminando categoría ID: ${id} por usuario: ${userId}`);

    const category = await categoryRepository.getById(id);
    if (!category) {
      throw new AppError(404, 'Categoría no encontrada');
    }

    if (category.isGlobal) {
      throw new AppError(403, 'No puedes eliminar las categorías predeterminadas del sistema');
    }

    if (category.user_id && Number(category.user_id) !== Number(userId)) {
      throw new AppError(403, 'No tienes permiso para eliminar esta categoría');
    }

    await categoryRepository.delete(id);
    return true;
  }
}

module.exports = new CategoryService();
