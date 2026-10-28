const express = require('express');
const router = express.Router();
const adminController = require('../controllers/admin.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { authorize } = require('../middlewares/role.middleware');

// Todas las rutas de admin requieren autenticación + rol admin
router.use(authenticate, authorize('admin'));

router.get('/users', (req, res, next) => adminController.getAllUsers(req, res, next));
router.post('/users', (req, res, next) => adminController.createUser(req, res, next));
router.put('/users/:id', (req, res, next) => adminController.updateUser(req, res, next));
router.put('/users/:id/status', (req, res, next) => adminController.toggleStatus(req, res, next));
router.delete('/users/:id', (req, res, next) => adminController.deleteUser(req, res, next));
router.get('/roles', (req, res, next) => adminController.getRoles(req, res, next));


module.exports = router;
