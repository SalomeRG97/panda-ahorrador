const express = require('express');
const router = express.Router();
const monthController = require('../controllers/month.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { resolveOwnership } = require('../middlewares/ownership.middleware');

router.get('/year/:yearId', authenticate, resolveOwnership, (req, res, next) => monthController.getByYear(req, res, next));
router.get('/:id', authenticate, resolveOwnership, (req, res, next) => monthController.getDetails(req, res, next));

module.exports = router;
