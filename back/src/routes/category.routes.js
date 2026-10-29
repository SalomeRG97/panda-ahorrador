const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/category.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');
const { resolveOwnership } = require('../middlewares/ownership.middleware');
const { validate } = require('../middlewares/validate.middleware');
const {
  createCategorySchema,
  updateCategorySchema,
  idParamSchema,
  viewAsQuerySchema,
} = require('../validators/category.validator');

router.get('/', authenticate, validate({ query: viewAsQuerySchema }), (req, res, next) => categoryController.getAll(req, res, next));
router.post('/', authenticate, resolveOwnership, authorize('admin', 'regular'), validate({ query: viewAsQuerySchema, body: createCategorySchema }), (req, res, next) => categoryController.create(req, res, next));
router.put('/:id', authenticate, resolveOwnership, authorize('admin', 'regular'), validate({ params: idParamSchema, query: viewAsQuerySchema, body: updateCategorySchema }), (req, res, next) => categoryController.update(req, res, next));
router.delete('/:id', authenticate, resolveOwnership, authorize('admin', 'regular'), validate({ params: idParamSchema, query: viewAsQuerySchema }), (req, res, next) => categoryController.delete(req, res, next));

module.exports = router;
