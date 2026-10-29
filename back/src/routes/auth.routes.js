const express = require('express');
const router = express.Router();
const authController = require('../controllers/auth.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const {
  loginLimiter,
  registerLimiter,
  refreshLimiter,
} = require('../middlewares/rate-limit.middleware');

// Rutas públicas
router.post('/register', registerLimiter, (req, res, next) => authController.register(req, res, next));
router.post('/login', loginLimiter, (req, res, next) => authController.login(req, res, next));
router.post('/refresh', refreshLimiter, (req, res, next) => authController.refresh(req, res, next));

// Rutas protegidas
router.get('/me', authenticate, (req, res, next) => authController.getMe(req, res, next));

module.exports = router;
