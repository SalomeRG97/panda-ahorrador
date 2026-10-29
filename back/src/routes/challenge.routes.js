const express = require('express');
const router = express.Router();
const challengeController = require('../controllers/challenge.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');
const { resolveOwnership } = require('../middlewares/ownership.middleware');
const { assertOwnership } = require('../middlewares/resource-ownership.middleware');
const { validate } = require('../middlewares/validate.middleware');
const {
  updateChallengeProgressSchema,
  monthIdParamSchema,
  viewAsQuerySchema,
} = require('../validators/challenge.validator');

router.get('/', authenticate, (req, res, next) => challengeController.getAll(req, res, next));
router.get('/month/:monthId', authenticate, validate({ params: monthIdParamSchema, query: viewAsQuerySchema }), resolveOwnership, (req, res, next) => challengeController.getMonthChallenge(req, res, next));
router.put(
  '/progress',
  authenticate,
  resolveOwnership,
  authorize('admin', 'regular'),
  validate({ query: viewAsQuerySchema, body: updateChallengeProgressSchema }),
  assertOwnership('monthChallenge', (req) => req.body.monthChallengeId ?? req.body.month_challenge_id, { write: true }),
  (req, res, next) => challengeController.updateProgress(req, res, next)
);

module.exports = router;
