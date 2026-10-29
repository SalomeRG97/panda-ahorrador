const express = require('express');
const router = express.Router();
const controller = require('../controllers/payment-method.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');
const { resolveOwnership } = require('../middlewares/ownership.middleware');
const { validate } = require('../middlewares/validate.middleware');
const {
  createPaymentMethodSchema,
  updatePaymentMethodSchema,
  idParamSchema,
  viewAsQuerySchema,
} = require('../validators/payment-method.validator');

router.get('/', authenticate, validate({ query: viewAsQuerySchema }), (req, res, next) => controller.getAll(req, res, next));
router.post('/', authenticate, resolveOwnership, authorize('admin', 'regular'), validate({ query: viewAsQuerySchema, body: createPaymentMethodSchema }), (req, res, next) => controller.create(req, res, next));
router.put('/:id', authenticate, resolveOwnership, authorize('admin', 'regular'), validate({ params: idParamSchema, query: viewAsQuerySchema, body: updatePaymentMethodSchema }), (req, res, next) => controller.update(req, res, next));
router.delete('/:id', authenticate, resolveOwnership, authorize('admin', 'regular'), validate({ params: idParamSchema, query: viewAsQuerySchema }), (req, res, next) => controller.delete(req, res, next));

module.exports = router;
