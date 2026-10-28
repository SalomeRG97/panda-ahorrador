const express = require('express');
const router = express.Router();
const challengeController = require('../controllers/challenge.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');

router.get('/', authenticate, (req, res, next) => challengeController.getAll(req, res, next));
router.get('/month/:monthId', authenticate, (req, res, next) => challengeController.getMonthChallenge(req, res, next));
router.put('/progress', authenticate, authorize('admin', 'regular'), (req, res, next) => challengeController.updateProgress(req, res, next));

module.exports = router;
