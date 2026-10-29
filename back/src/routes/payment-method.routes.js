const express = require('express');
const router = express.Router();
const controller = require('../controllers/payment-method.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');
const { resolveOwnership } = require('../middlewares/ownership.middleware');

router.get('/', authenticate, (req, res, next) => controller.getAll(req, res, next));
router.post('/', authenticate, resolveOwnership, authorize('admin', 'regular'), (req, res, next) => controller.create(req, res, next));
router.put('/:id', authenticate, resolveOwnership, authorize('admin', 'regular'), (req, res, next) => controller.update(req, res, next));
router.delete('/:id', authenticate, resolveOwnership, authorize('admin', 'regular'), (req, res, next) => controller.delete(req, res, next));

module.exports = router;
