const express = require('express');
const router = express.Router();
const incomeController = require('../controllers/income.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');

router.get('/month/:monthId', authenticate, (req, res, next) => incomeController.getByMonth(req, res, next));
router.post('/', authenticate, authorize('admin', 'regular'), (req, res, next) => incomeController.create(req, res, next));
router.put('/:id', authenticate, authorize('admin', 'regular'), (req, res, next) => incomeController.update(req, res, next));
router.delete('/:id', authenticate, authorize('admin', 'regular'), (req, res, next) => incomeController.delete(req, res, next));
router.post('/saving', authenticate, authorize('admin', 'regular'), (req, res, next) => incomeController.setSaving(req, res, next));

module.exports = router;
