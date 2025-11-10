const express = require('express');
const { check, validationResult } = require('express-validator');

const router = express.Router();

// Controllers (adjust paths if needed)
const userController = require('../controllers/user.controller');

// Middlewares (adjust/implement nếu chưa có)
const auth = require('../middleware/auth.middleware'); // xác thực token
const isAdmin = require('../middleware/admin.middleware'); // kiểm tra role admin

// helper xử lý kết quả validation
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

// Routes
// Đăng ký
router.post(
  '/register',
  [
    check('name').notEmpty().withMessage('Name is required'),
    check('email').isEmail().withMessage('Valid email required'),
    check('password').isLength({ min: 6 }).withMessage('Password min 6 chars'),
  ],
  validate,
  userController.register
);

// Đăng nhập
router.post(
  '/login',
  [
    check('email').isEmail().withMessage('Valid email required'),
    check('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  userController.login
);

// Đăng xuất (ví dụ)
router.post('/logout', auth, userController.logout);

// Lấy profile của user hiện tại
router.get('/me', auth, userController.getProfile);

// Cập nhật profile của user hiện tại
router.put(
  '/me',
  auth,
  [
    check('name').optional().notEmpty(),
    check('email').optional().isEmail(),
    // thêm validation khác nếu cần
  ],
  validate,
  userController.updateProfile
);

// Các route dành cho admin
router.get('/', auth, isAdmin, userController.getUsers);
router.get('/:id', auth, isAdmin, userController.getUserById);
router.delete('/:id', auth, isAdmin, userController.deleteUser);

// ...existing code...
module.exports = router;