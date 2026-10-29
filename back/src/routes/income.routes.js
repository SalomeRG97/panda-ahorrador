const express = require('express');
const router = express.Router();
const incomeController = require('../controllers/income.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');
const { resolveOwnership } = require('../middlewares/ownership.middleware');
const { assertOwnership } = require('../middlewares/resource-ownership.middleware');
const { validate } = require('../middlewares/validate.middleware');
const {
  createIncomeSchema,
  updateIncomeSchema,
  setSavingSchema,
  idParamSchema,
  monthIdParamSchema,
  viewAsQuerySchema,
} = require('../validators/income.validator');

router.get(
  '/month/:monthId',
  authenticate,
  validate({ params: monthIdParamSchema, query: viewAsQuerySchema }),
  resolveOwnership,
  (req, res, next) => incomeController.getByMonth(req, res, next)
);
router.post(
  '/',
  authenticate,
  resolveOwnership,
  authorize('admin', 'regular'),
  validate({ query: viewAsQuerySchema, body: createIncomeSchema }),
  assertOwnership('month', (req) => req.body.monthId ?? req.body.month_id, { write: true }),
  (req, res, next) => incomeController.create(req, res, next)
);
router.put(
  '/:id',
  authenticate,
  resolveOwnership,
  authorize('admin', 'regular'),
  validate({ params: idParamSchema, query: viewAsQuerySchema, body: updateIncomeSchema }),
  assertOwnership('income', (req) => req.params.id, { write: true }),
  (req, res, next) => incomeController.update(req, res, next)
);
router.delete(
  '/:id',
  authenticate,
  resolveOwnership,
  authorize('admin', 'regular'),
  validate({ params: idParamSchema, query: viewAsQuerySchema }),
  assertOwnership('income', (req) => req.params.id, { write: true }),
  (req, res, next) => incomeController.delete(req, res, next)
);
router.post(
  '/saving',
  authenticate,
  resolveOwnership,
  authorize('admin', 'regular'),
  validate({ query: viewAsQuerySchema, body: setSavingSchema }),
  assertOwnership('month', (req) => req.body.monthId ?? req.body.month_id, { write: true }),
  (req, res, next) => incomeController.setSaving(req, res, next)
);

module.exports = router;
