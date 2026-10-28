const express = require('express');
const router = express.Router();
const controller = require('../controllers/payment-method.controller');
const { authenticate } = require('../middlewares/auth.middleware');

router.get('/', authenticate, (req, res, next) => controller.getAll(req, res, next));
router.post('/', authenticate, (req, res, next) => controller.create(req, res, next));
router.put('/:id', authenticate, (req, res, next) => controller.update(req, res, next));
router.delete('/:id', authenticate, (req, res, next) => controller.delete(req, res, next));

module.exports = router;
