import express from 'express';
import { check, validationResult } from 'express-validator';

import sellerController from '../controllers/seller.controller.js';
import auth from '../middleware/auth.middleware.js';
import isAdmin from '../middleware/admin.middleware.js';
import isSeller from '../middleware/seller.middleware.js';

const router = express.Router();

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

/* --- Thêm routes theo yêu cầu D. Seller --- */

/**
 * GET /seller/dashboard
 */
router.get('/dashboard', auth, isSeller, sellerController.dashboard);

/**
 * GET /seller/auctions
 */
router.get('/auctions', auth, isSeller, sellerController.listAuctions);

/**
 * GET /seller/auctions/new
 */
router.get('/auctions/new', auth, isSeller, sellerController.newAuctionForm);

/**
 * POST /seller/auctions
 * - chọn product / nhập thông tin
 * - tạo products + auctions
 */
router.post(
  '/auctions',
  auth,
  isSeller,
  [
    check('title').notEmpty().withMessage('Title is required'),
    check('startingPrice').isFloat({ gt: 0 }).withMessage('Starting price must be > 0'),
    check('endDate').optional().isISO8601().withMessage('endDate must be a valid date'),
    check('productId').optional().isInt().withMessage('productId must be integer when provided'),
  ],
  validate,
  sellerController.createAuction
);

/**
 * GET /seller/auctions/:id/edit
 */
router.get('/auctions/:id/edit', auth, isSeller, sellerController.editAuctionForm);

/**
 * POST /seller/auctions/:id/update
 */
router.post(
  '/auctions/:id/update',
  auth,
  isSeller,
  [
    check('title').optional().notEmpty(),
    check('startingPrice').optional().isFloat({ gt: 0 }),
    check('endDate').optional().isISO8601(),
  ],
  validate,
  sellerController.updateAuction
);

/**
 * POST /seller/auctions/:id/block-bidder
 * Body: { bidderId: number, reason?: string }
 * - thêm vào blocked_bidders
 */
router.post(
  '/auctions/:id/block-bidder',
  auth,
  isSeller,
  [check('bidderId').isInt().withMessage('bidderId is required')],
  validate,
  sellerController.blockBidder
);

/**
 * POST /questions/:id/answer
 * Seller trả lời câu hỏi (tạo answers)
 */
router.post(
  '/questions/:id/answer',
  auth,
  isSeller,
  [check('answer').notEmpty().withMessage('Answer is required')],
  validate,
  sellerController.answerQuestion
);

export default router;