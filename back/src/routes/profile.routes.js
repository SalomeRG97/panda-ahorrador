const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const profileController = require('../controllers/profile.controller');
const { authenticate } = require('../middlewares/auth.middleware');
const { validate } = require('../middlewares/validate.middleware');
const { updateProfileSchema, changePasswordSchema } = require('../validators/profile.validator');
const AppError = require('../utils/app-error');

// Configurar multer para subida de avatares
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const uploadDir = path.join(__dirname, '../../uploads/avatars');
    cb(null, uploadDir);
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const filename = `avatar-${req.user.id}-${Date.now()}${ext}`;
    cb(null, filename);
  }
});

const fileFilter = (req, file, cb) => {
  const allowedTypes = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new AppError(400, 'Solo se permiten imágenes (JPEG, PNG, GIF, WEBP)'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB
});

router.use(authenticate);

router.get('/', (req, res, next) => profileController.getProfile(req, res, next));
router.put('/', validate({ body: updateProfileSchema }), (req, res, next) => profileController.updateProfile(req, res, next));
router.put('/password', validate({ body: changePasswordSchema }), (req, res, next) => profileController.changePassword(req, res, next));
router.post('/avatar', upload.single('avatar'), (req, res, next) => profileController.uploadAvatar(req, res, next));

module.exports = router;
