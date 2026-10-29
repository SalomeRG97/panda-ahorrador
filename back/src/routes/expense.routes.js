const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expense.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');
const { resolveOwnership } = require('../middlewares/ownership.middleware');
const { assertOwnership } = require('../middlewares/resource-ownership.middleware');

// Gastos pendientes (notificaciones)
router.get('/pending', authenticate, resolveOwnership, (req, res, next) => expenseController.getPendingBudget(req, res, next));

// Gastos presupuestados
router.post(
  '/budget',
  authenticate,
  resolveOwnership,
  assertOwnership('month', (req) => req.body.month_id ?? req.body.monthId, { write: true }),
  authorize('admin', 'regular'),
  (req, res, next) => expenseController.createBudget(req, res, next)
);
router.put(
  '/budget/:id',
  authenticate,
  resolveOwnership,
  assertOwnership('budgetExpense', (req) => req.params.id, { write: true }),
  authorize('admin', 'regular'),
  (req, res, next) => expenseController.updateBudget(req, res, next)
);
router.delete(
  '/budget/:id/series',
  authenticate,
  resolveOwnership,
  assertOwnership('budgetExpense', (req) => req.params.id, { write: true }),
  authorize('admin', 'regular'),
  (req, res, next) => expenseController.deleteBudgetSeries(req, res, next)
);
router.delete(
  '/budget/:id',
  authenticate,
  resolveOwnership,
  assertOwnership('budgetExpense', (req) => req.params.id, { write: true }),
  authorize('admin', 'regular'),
  (req, res, next) => expenseController.deleteBudget(req, res, next)
);

// Gastos extra
router.post(
  '/extra',
  authenticate,
  resolveOwnership,
  assertOwnership('month', (req) => req.body.month_id ?? req.body.monthId, { write: true }),
  authorize('admin', 'regular'),
  (req, res, next) => expenseController.createExtra(req, res, next)
);
router.put(
  '/extra/:id',
  authenticate,
  resolveOwnership,
  assertOwnership('extraExpense', (req) => req.params.id, { write: true }),
  authorize('admin', 'regular'),
  (req, res, next) => expenseController.updateExtra(req, res, next)
);
router.delete(
  '/extra/:id',
  authenticate,
  resolveOwnership,
  assertOwnership('extraExpense', (req) => req.params.id, { write: true }),
  authorize('admin', 'regular'),
  (req, res, next) => expenseController.deleteExtra(req, res, next)
);

module.exports = router;
