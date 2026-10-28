const express = require('express');
const router = express.Router();
const shortcutsController = require('../controllers/shortcuts.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { resolveOwnership } = require('../middlewares/ownership.middleware');

router.get('/today', authenticate, resolveOwnership, (req, res, next) => shortcutsController.getToday(req, res, next));

module.exports = router;
