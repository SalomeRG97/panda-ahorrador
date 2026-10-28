const express = require('express');
const router = express.Router();
const categoryController = require('../controllers/category.controller');
const { authenticate } = require('../middlewares/auth.middleware');

router.get('/', authenticate, (req, res, next) => categoryController.getAll(req, res, next));
router.post('/', authenticate, (req, res, next) => categoryController.create(req, res, next));
router.put('/:id', authenticate, (req, res, next) => categoryController.update(req, res, next));
router.delete('/:id', authenticate, (req, res, next) => categoryController.delete(req, res, next));

module.exports = router;
