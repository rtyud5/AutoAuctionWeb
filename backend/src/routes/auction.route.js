const express = require('express');
const { check, validationResult } = require('express-validator');

const router = express.Router();

// Controllers
const auctionController = require('../controllers/auction.controller');

// Middlewares
const auth = require('../middleware/auth.middleware');
const isAdmin = require('../middleware/admin.middleware');
const isSeller = require('../middleware/seller.middleware');

// Validation result handler
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

// Allow seller or admin
const allowSellerOrAdmin = (req, res, next) => {
  if (!req.user) return res.status(401).json({ message: 'Unauthorized' });
  if (req.user.role === 'admin' || req.user.role === 'seller') return next();
  return res.status(403).json({ message: 'Forbidden' });
};

/*
  Auction routes:
  - GET    /           => list auctions (query: page, limit, status, q)
  - GET    /:id        => get auction detail
  - POST   /           => create auction (seller or admin)
  - PUT    /:id        => update auction (seller or admin)
  - DELETE /:id        => delete auction (seller or admin)
  - POST   /:id/bid    => place a bid (authenticated users)
  - GET    /:id/bids   => list bids for auction
  - PATCH  /:id/status => update status (admin) or auto logic in controller
*/

// List auctions
router.get('/', auctionController.listAuctions);

// Auction detail
router.get('/:id', auctionController.getAuctionById);

// Create auction (seller or admin)
router.post(
  '/',
  auth,
  allowSellerOrAdmin,
  [
    check('itemId').notEmpty().withMessage('itemId is required'),
    check('startingPrice').isFloat({ gt: 0 }).withMessage('startingPrice must be > 0'),
    check('startAt').optional().isISO8601().withMessage('startAt must be a valid date'),
    check('endAt').isISO8601().withMessage('endAt must be a valid date'),
  ],
  validate,
  auctionController.createAuction
);

// Update auction
router.put(
  '/:id',
  auth,
  allowSellerOrAdmin,
  [
    check('startingPrice').optional().isFloat({ gt: 0 }),
    check('startAt').optional().isISO8601(),
    check('endAt').optional().isISO8601(),
    check('title').optional().isString(),
  ],
  validate,
  auctionController.updateAuction
);

// Delete auction
router.delete('/:id', auth, allowSellerOrAdmin, auctionController.deleteAuction);

// Place a bid (authenticated users)
router.post(
  '/:id/bid',
  auth,
  [
    check('amount').isFloat({ gt: 0 }).withMessage('Bid amount must be > 0'),
  ],
  validate,
  auctionController.placeBid
);

// List bids for an auction
router.get('/:id/bids', auth, auctionController.listBids);

// Admin: update auction status (e.g., force close/cancel)
router.patch(
  '/:id/status',
  auth,
  isAdmin,
  [
    check('status')
      .notEmpty()
      .withMessage('Status is required')
      .isIn(['scheduled', 'active', 'closed', 'cancelled'])
      .withMessage('Invalid status'),
  ],
  validate,
  auctionController.updateAuctionStatus
);

module.exports = router;