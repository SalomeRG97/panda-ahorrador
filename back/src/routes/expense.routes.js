const express = require('express');
const router = express.Router();
const expenseController = require('../controllers/expense.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');
const { resolveOwnership } = require('../middlewares/ownership.middleware');
const { assertOwnership } = require('../middlewares/resource-ownership.middleware');
const { validate } = require('../middlewares/validate.middleware');
const {
  createBudgetExpenseSchema,
  updateBudgetExpenseSchema,
  deleteBudgetQuerySchema,
  deleteBudgetBodySchema,
  createExtraExpenseSchema,
  updateExtraExpenseSchema,
  idParamSchema,
  viewAsQuerySchema,
} = require('../validators/expense.validator');

// Gastos pendientes (notificaciones)
router.get(
  '/pending',
  authenticate,
  validate({ query: viewAsQuerySchema }),
  resolveOwnership,
  (req, res, next) => expenseController.getPendingBudget(req, res, next)
);

// Gastos presupuestados
router.post(
  '/budget',
  authenticate,
  resolveOwnership,
  authorize('admin', 'regular'),
  validate({ query: viewAsQuerySchema, body: createBudgetExpenseSchema }),
  assertOwnership('month', (req) => req.body.month_id ?? req.body.monthId, { write: true }),
  (req, res, next) => expenseController.createBudget(req, res, next)
);
router.put(
  '/budget/:id',
  authenticate,
  resolveOwnership,
  authorize('admin', 'regular'),
  validate({ params: idParamSchema, query: viewAsQuerySchema, body: updateBudgetExpenseSchema }),
  assertOwnership('budgetExpense', (req) => req.params.id, { write: true }),
  (req, res, next) => expenseController.updateBudget(req, res, next)
);
router.delete(
  '/budget/:id/series',
  authenticate,
  resolveOwnership,
  authorize('admin', 'regular'),
  validate({ params: idParamSchema, query: viewAsQuerySchema }),
  assertOwnership('budgetExpense', (req) => req.params.id, { write: true }),
  (req, res, next) => expenseController.deleteBudgetSeries(req, res, next)
);
router.delete(
  '/budget/:id',
  authenticate,
  resolveOwnership,
  authorize('admin', 'regular'),
  validate({ params: idParamSchema, query: deleteBudgetQuerySchema, body: deleteBudgetBodySchema }),
  assertOwnership('budgetExpense', (req) => req.params.id, { write: true }),
  (req, res, next) => expenseController.deleteBudget(req, res, next)
);

// Gastos extra
router.post(
  '/extra',
  authenticate,
  resolveOwnership,
  authorize('admin', 'regular'),
  validate({ query: viewAsQuerySchema, body: createExtraExpenseSchema }),
  assertOwnership('month', (req) => req.body.month_id ?? req.body.monthId, { write: true }),
  (req, res, next) => expenseController.createExtra(req, res, next)
);
router.put(
  '/extra/:id',
  authenticate,
  resolveOwnership,
  authorize('admin', 'regular'),
  validate({ params: idParamSchema, query: viewAsQuerySchema, body: updateExtraExpenseSchema }),
  assertOwnership('extraExpense', (req) => req.params.id, { write: true }),
  (req, res, next) => expenseController.updateExtra(req, res, next)
);
router.delete(
  '/extra/:id',
  authenticate,
  resolveOwnership,
  authorize('admin', 'regular'),
  validate({ params: idParamSchema, query: viewAsQuerySchema }),
  assertOwnership('extraExpense', (req) => req.params.id, { write: true }),
  (req, res, next) => expenseController.deleteExtra(req, res, next)
);

module.exports = router;
