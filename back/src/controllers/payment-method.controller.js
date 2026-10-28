const repo = require('../repositories/payment-method.repository');
const logger = require('../config/logger');

const RESERVED = 'retiro de ahorros';

function validateName(raw) {
  const name = (raw || '').trim();
  if (!name) throw { statusCode: 400, message: 'El nombre del medio de pago es requerido' };
  if (name.length > 50) throw { statusCode: 400, message: 'El nombre no puede exceder 50 caracteres' };
  if (name.toLowerCase() === RESERVED) {
    throw { statusCode: 400, message: '«Retiro de Ahorros» es un medio de pago reservado del sistema' };
  }
  return name;
}

class PaymentMethodController {
  async getAll(req, res, next) {
    try {
      const data = await repo.getAllForUser(req.user.id);
      res.json({ success: true, data });
    } catch (error) {
      next(error);
    }
  }

  async create(req, res, next) {
    try {
      const name = validateName(req.body.name);
      if (await repo.findByName(req.user.id, name)) {
        throw { statusCode: 409, message: 'Ya tienes un medio de pago con ese nombre' };
      }
      const id = await repo.create(req.user.id, name);
      res.status(201).json({ success: true, data: { id, name } });
    } catch (error) {
      next(error);
    }
  }

  async update(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      const name = validateName(req.body.name);
      const current = await repo.getById(id);
      if (!current || current.user_id !== req.user.id) {
        throw { statusCode: 404, message: 'Medio de pago no encontrado' };
      }
      const dup = await repo.findByName(req.user.id, name);
      if (dup && dup.id !== id) {
        throw { statusCode: 409, message: 'Ya tienes un medio de pago con ese nombre' };
      }
      await repo.rename(id, req.user.id, current.name, name);
      res.json({ success: true, data: { id, name } });
    } catch (error) {
      next(error);
    }
  }

  async delete(req, res, next) {
    try {
      const id = parseInt(req.params.id, 10);
      const current = await repo.getById(id);
      if (!current || current.user_id !== req.user.id) {
        throw { statusCode: 404, message: 'Medio de pago no encontrado' };
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
