const express = require('express');
const router = express.Router();
const incomeController = require('../controllers/income.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');
const { resolveOwnership } = require('../middlewares/ownership.middleware');
const { assertOwnership } = require('../middlewares/resource-ownership.middleware');

router.get('/month/:monthId', authenticate, resolveOwnership, (req, res, next) => incomeController.getByMonth(req, res, next));
router.post(
  '/',
  authenticate,
  resolveOwnership,
  assertOwnership('month', (req) => req.body.monthId ?? req.body.month_id, { write: true }),
  authorize('admin', 'regular'),
  (req, res, next) => incomeController.create(req, res, next)
);
router.put(
  '/:id',
  authenticate,
  resolveOwnership,
  assertOwnership('income', (req) => req.params.id, { write: true }),
  authorize('admin', 'regular'),
  (req, res, next) => incomeController.update(req, res, next)
);
router.delete(
  '/:id',
  authenticate,
  resolveOwnership,
  assertOwnership('income', (req) => req.params.id, { write: true }),
  authorize('admin', 'regular'),
  (req, res, next) => incomeController.delete(req, res, next)
);
router.post(
  '/saving',
  authenticate,
  resolveOwnership,
  assertOwnership('month', (req) => req.body.monthId ?? req.body.month_id, { write: true }),
  authorize('admin', 'regular'),
  (req, res, next) => incomeController.setSaving(req, res, next)
);

module.exports = router;
