const express = require('express');
const router = express.Router();
const summaryController = require('../controllers/summary.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { resolveOwnership } = require('../middlewares/ownership.middleware');
const { validate } = require('../middlewares/validate.middleware');
const {
  monthIdParamSchema,
  yearIdParamSchema,
  viewAsQuerySchema,
} = require('../validators/summary.validator');

router.get('/year/:yearId', authenticate, validate({ params: yearIdParamSchema, query: viewAsQuerySchema }), resolveOwnership, (req, res, next) => summaryController.getAnnualSummary(req, res, next));
router.get('/year/:yearId/categories', authenticate, validate({ params: yearIdParamSchema, query: viewAsQuerySchema }), resolveOwnership, (req, res, next) => summaryController.getCategoryCharts(req, res, next));
router.get('/month/:monthId/categories-weekly', authenticate, validate({ params: monthIdParamSchema, query: viewAsQuerySchema }), resolveOwnership, (req, res, next) => summaryController.getMonthWeeklyCategoryBreakdown(req, res, next));

module.exports = router;
