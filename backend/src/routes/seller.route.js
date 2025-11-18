const express = require('express');
const { check, validationResult } = require('express-validator');

const router = express.Router();

// Controllers
const sellerController = require('../controllers/seller.controller');

// Middlewares
const auth = require('../middleware/auth.middleware'); // xác thực token
const isAdmin = require('../middleware/admin.middleware'); // kiểm tra role admin
const isSeller = require('../middleware/seller.middleware'); // optional: kiểm tra role seller

// helper xử lý kết quả validation
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

// Seller registration
router.post(
  '/register',
  [
    check('name').notEmpty().withMessage('Name is required'),
    check('email').isEmail().withMessage('Valid email required'),
    check('password').isLength({ min: 6 }).withMessage('Password min 6 chars'),
    check('storeName').optional().notEmpty().withMessage('storeName cannot be empty if provided'),
  ],
  validate,
  sellerController.register
);

// Seller login
router.post(
  '/login',
  [
    check('email').isEmail().withMessage('Valid email required'),
    check('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  sellerController.login
);

// Logout
router.post('/logout', auth, sellerController.logout);

// Seller profile
router.get('/me', auth, isSeller, sellerController.getProfile);
router.put(
  '/me',
  auth,
  isSeller,
  [
    check('name').optional().notEmpty(),
    check('email').optional().isEmail(),
    check('storeName').optional().notEmpty(),
  ],
  validate,
  sellerController.updateProfile
);

// Seller actions (ví dụ tạo/update sản phẩm/auction) — controller tùy chỉnh
router.post(
  '/items',
  auth,
  isSeller,
  [
    check('title').notEmpty().withMessage('Title is required'),
    check('startingPrice').isFloat({ gt: 0 }).withMessage('Starting price must be > 0'),
    check('endDate').optional().isISO8601().withMessage('endDate must be a valid date'),
  ],
  validate,
  sellerController.createItem
);

router.put(
  '/items/:id',
  auth,
  isSeller,
  [
    check('title').optional().notEmpty(),
    check('startingPrice').optional().isFloat({ gt: 0 }),
    check('endDate').optional().isISO8601(),
  ],
  validate,
  sellerController.updateItem
);

router.delete('/items/:id', auth, isSeller, sellerController.deleteItem);

// Admin-only seller management
router.get('/', auth, isAdmin, sellerController.getSellers);
router.get('/:id', auth, isAdmin, sellerController.getSellerById);
router.delete('/:id', auth, isAdmin, sellerController.deleteSeller);

// ...existing code...
module.exports = router;