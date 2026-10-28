const express = require('express');
const router = express.Router();
const summaryController = require('../controllers/summary.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { resolveOwnership } = require('../middlewares/ownership.middleware');

router.get('/year/:yearId', authenticate, resolveOwnership, (req, res, next) => summaryController.getAnnualSummary(req, res, next));
router.get('/year/:yearId/categories', authenticate, resolveOwnership, (req, res, next) => summaryController.getCategoryCharts(req, res, next));
router.get('/month/:monthId/categories-weekly', authenticate, resolveOwnership, (req, res, next) => summaryController.getMonthWeeklyCategoryBreakdown(req, res, next));

module.exports = router;
