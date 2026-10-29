const express = require('express');
const router = express.Router();
const weekController = require('../controllers/week.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { idParamSchema, monthIdParamSchema, viewAsQuerySchema } = require('../validators/week.validator');

router.get('/month/:monthId', authenticate, validate({ params: monthIdParamSchema, query: viewAsQuerySchema }), (req, res, next) => weekController.getByMonth(req, res, next));
router.get('/:id', authenticate, validate({ params: idParamSchema, query: viewAsQuerySchema }), (req, res, next) => weekController.getDetail(req, res, next));

module.exports = router;
