const express = require('express');
const router = express.Router();
const shortcutsController = require('../controllers/shortcuts.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { resolveOwnership } = require('../middlewares/ownership.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { viewAsQuerySchema } = require('../validators/common.validator');

router.get('/today', authenticate, validate({ query: viewAsQuerySchema }), resolveOwnership, (req, res, next) => shortcutsController.getToday(req, res, next));

module.exports = router;
