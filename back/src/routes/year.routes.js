const express = require('express');
const router = express.Router();
const yearController = require('../controllers/year.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');
const { resolveOwnership } = require('../middlewares/ownership.middleware');
const { assertOwnership } = require('../middlewares/resource-ownership.middleware');

router.get('/', authenticate, resolveOwnership, (req, res, next) => yearController.getAll(req, res, next));
router.get('/:id', authenticate, resolveOwnership, (req, res, next) => yearController.getById(req, res, next));
router.post('/', authenticate, resolveOwnership, authorize('admin', 'regular'), (req, res, next) => yearController.create(req, res, next));
router.delete(
  '/:id',
  authenticate,
  resolveOwnership,
  assertOwnership('year', (req) => req.params.id, { write: true }),
  authorize('admin', 'regular'),
  (req, res, next) => yearController.delete(req, res, next)
);

module.exports = router;
