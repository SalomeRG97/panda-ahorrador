const express = require('express');
const router = express.Router();
const shareController = require('../controllers/share.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');

router.use(authenticate);

// Regular puede compartir con viewers
router.post('/', authorize('regular', 'admin'), (req, res, next) => shareController.shareData(req, res, next));
router.delete('/:viewerId', authorize('regular', 'admin'), (req, res, next) => shareController.removeShare(req, res, next));
router.get('/my-viewers', authorize('regular', 'admin'), (req, res, next) => shareController.getMyViewers(req, res, next));

// Viewer puede ver quién le compartió
router.get('/shared-with-me', authorize('viewer'), (req, res, next) => shareController.getSharedWithMe(req, res, next));

module.exports = router;
