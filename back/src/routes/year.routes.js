const express = require('express');
const router = express.Router();
const yearController = require('../controllers/year.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');
const { resolveOwnership } = require('../middlewares/ownership.middleware');

router.get('/', authenticate, resolveOwnership, (req, res, next) => yearController.getAll(req, res, next));
router.get('/:id', authenticate, resolveOwnership, (req, res, next) => yearController.getById(req, res, next));
router.post('/', authenticate, authorize('admin', 'regular'), (req, res, next) => yearController.create(req, res, next));
router.delete('/:id', authenticate, authorize('admin', 'regular'), (req, res, next) => yearController.delete(req, res, next));

module.exports = router;
