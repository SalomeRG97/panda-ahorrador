const express = require('express');
const router = express.Router();
const weekController = require('../controllers/week.controller');
const { authenticate } = require('../middlewares/auth.middleware');

router.get('/month/:monthId', authenticate, (req, res, next) => weekController.getByMonth(req, res, next));
router.get('/:id', authenticate, (req, res, next) => weekController.getDetail(req, res, next));

module.exports = router;
