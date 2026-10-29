const repo = require('../repositories/payment-method.repository');
const logger = require('../config/logger');
const AppError = require('../utils/app-error');

class PaymentMethodController {
  async getAll(req, res, next) {
    try {
      const userId = req.effectiveUserId || req.user.id;
      const data = await repo.getAllForUser(userId);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const userId = req.effectiveUserId || req.user.id;
      const { name } = req.body;
      if (await repo.findByName(userId, name)) {
        throw new AppError(409, 'Ya tienes un medio de pago con ese nombre');
      }
      const id = await repo.create(userId, name);
      res.status(201).json({ success: true, data: { id, name } });
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const id = Number(req.params.id);
      const userId = req.effectiveUserId || req.user.id;
      const { name } = req.body;
      const current = await repo.getById(id);
      if (!current || Number(current.user_id) !== Number(userId)) {
        throw new AppError(404, 'Medio de pago no encontrado');
      }
      const dup = await repo.findByName(userId, name);
      if (dup && dup.id !== id) {
        throw new AppError(409, 'Ya tienes un medio de pago con ese nombre');
      }
      await repo.rename(id, userId, current.name, name);
      res.json({ success: true, data: { id, name } });
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const id = Number(req.params.id);
      const userId = req.effectiveUserId || req.user.id;
      const current = await repo.getById(id);
      if (!current || Number(current.user_id) !== Number(userId)) {
        throw new AppError(404, 'Medio de pago no encontrado');
      }
      await repo.delete(id);
      logger.info(`[PaymentMethodController] Medio de pago ${id} eliminado`);
      res.json({ success: true, message: 'Medio de pago eliminado' });
    } catch (error) {
      next(error);
    }
  }
}

module.exports = new PaymentMethodController();
