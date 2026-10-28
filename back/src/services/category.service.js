const categoryRepository = require('../repositories/category.repository');
const logger = require('../config/logger');

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
      throw { statusCode: 400, message: 'Nombre, color e icono son requeridos' };
    }

    if (name.length > 50) {
      throw { statusCode: 400, message: 'El nombre no puede exceder 50 caracteres' };
    }

    // Check for duplicates within user's scope
    const existing = await categoryRepository.findUserCategoryByName(userId, name);
    if (existing) {
      throw { statusCode: 409, message: 'Ya tienes una categoría con ese nombre' };
    }

    const id = await categoryRepository.create(name, color, icon, userId);
    return await categoryRepository.getById(id);
  }

  async updateCategory(id, data, userId) {
    logger.info(`[CategoryService] Actualizando categoría ID: ${id}`);

    const category = await categoryRepository.getById(id);
    if (!category) {
      throw { statusCode: 404, message: 'Categoría no encontrada' };
    }

    await categoryRepository.update(id, data);
    return await categoryRepository.getById(id);
  }

  async deleteCategory(id, userId) {
    logger.info(`[CategoryService] Eliminando categoría ID: ${id} por usuario: ${userId}`);

    const category = await categoryRepository.getById(id);
    if (!category) {
      throw { statusCode: 404, message: 'Categoría no encontrada' };
    }

    if (category.isGlobal) {
      throw { statusCode: 403, message: 'No puedes eliminar las categorías predeterminadas del sistema' };
    }

    if (category.user_id && category.user_id !== userId) {
      throw { statusCode: 403, message: 'No tienes permiso para eliminar esta categoría' };
    }

    await categoryRepository.delete(id);
    return true;
  }
}

module.exports = new CategoryService();
