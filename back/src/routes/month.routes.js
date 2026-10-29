const express = require('express');
const router = express.Router();
const monthController = require('../controllers/month.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { resolveOwnership } = require('../middlewares/ownership.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { idParamSchema, yearIdParamSchema, viewAsQuerySchema } = require('../validators/month.validator');

router.get('/year/:yearId', authenticate, validate({ params: yearIdParamSchema, query: viewAsQuerySchema }), resolveOwnership, (req, res, next) => monthController.getByYear(req, res, next));
router.get('/:id', authenticate, validate({ params: idParamSchema, query: viewAsQuerySchema }), resolveOwnership, (req, res, next) => monthController.getDetails(req, res, next));

module.exports = router;
