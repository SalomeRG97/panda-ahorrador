const express = require('express');
const router = express.Router();
const yearController = require('../controllers/year.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');
const { resolveOwnership } = require('../middlewares/ownership.middleware');
const { assertOwnership } = require('../middlewares/resource-ownership.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { createYearSchema, idParamSchema, viewAsQuerySchema } = require('../validators/year.validator');

router.get('/', authenticate, validate({ query: viewAsQuerySchema }), resolveOwnership, (req, res, next) => yearController.getAll(req, res, next));
router.get('/:id', authenticate, validate({ params: idParamSchema, query: viewAsQuerySchema }), resolveOwnership, (req, res, next) => yearController.getById(req, res, next));
router.post(
  '/',
  authenticate,
  resolveOwnership,
  authorize('admin', 'regular'),
  validate({ query: viewAsQuerySchema, body: createYearSchema }),
  (req, res, next) => yearController.create(req, res, next)
);
router.delete(
  '/:id',
  authenticate,
  resolveOwnership,
  authorize('admin', 'regular'),
  validate({ params: idParamSchema, query: viewAsQuerySchema }),
  assertOwnership('year', (req) => req.params.id, { write: true }),
  (req, res, next) => yearController.delete(req, res, next)
);

module.exports = router;
