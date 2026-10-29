const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { registerSchema, loginSchema } = require('../validators/auth.validator');
const {
  loginLimiter,
  registerLimiter,
  refreshLimiter,
} = require('../middlewares/rate-limit.middleware');

// Rutas públicas / con cookie
router.post('/register', registerLimiter, validate({ body: registerSchema }), (req, res, next) => authController.register(req, res, next));
router.post('/login', loginLimiter, validate({ body: loginSchema }), (req, res, next) => authController.login(req, res, next));
router.post('/refresh', refreshLimiter, (req, res, next) => authController.refresh(req, res, next));
router.post('/logout', (req, res, next) => authController.logout(req, res, next));

// Rutas protegidas
router.post('/logout-all', authenticate, (req, res, next) => authController.logoutAll(req, res, next));
router.get('/me', authenticate, (req, res, next) => authController.getMe(req, res, next));

module.exports = router;
