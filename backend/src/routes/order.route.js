const express = require('express');
const { check, validationResult } = require('express-validator');

const router = express.Router();

// Controller
const orderController = require('../controllers/order.controller');

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

/*
  Order routes:
  - POST   /            => create order (authenticated user)
  - GET    /my          => list current user's orders
  - GET    /:id         => get order by id (authenticated; controller checks owner/admin)
  - GET    /             => list all orders (admin)
  - PATCH  /:id/status  => update order status (admin)
  - DELETE /:id         => delete order (admin)
  - POST   /webhook     => optional payment gateway webhook (public)
  + Additional order lifecycle & chat routes (F)
*/

// Create order (user)
router.post(
  '/',
  auth,
  [
    check('items').isArray({ min: 1 }).withMessage('Items required'),
    check('items.*.productId').notEmpty().withMessage('productId required for each item'),
    check('items.*.quantity').isInt({ gt: 0 }).withMessage('quantity must be > 0'),
    check('shippingAddress').notEmpty().withMessage('shippingAddress is required'),
    check('paymentMethod').optional().isString(),
  ],
  validate,
  orderController.createOrder
);

// List current user's orders
router.get('/my', auth, orderController.listMyOrders);

// Order view (buyer & seller)
router.get('/:id', auth, orderController.getOrderById);

/*
  F. Orders lifecycle & chat
  - POST /orders/:id/buyer-submit     (buyer sends payment info + address)
  - POST /orders/:id/seller-confirm   (seller confirms payment + add tracking)
  - POST /orders/:id/buyer-confirm    (buyer confirms delivery -> COMPLETED)
  - POST /orders/:id/rate             (buyer & seller rate each other)
  - GET  /orders/:id/chat             (get chat for order)
  - POST /orders/:id/chat             (post message)
*/

// Buyer submits payment/shipping details
router.post(
  '/:id/buyer-submit',
  auth,
  [
    check('paymentInfo').notEmpty().withMessage('paymentInfo is required'),
    check('shippingAddress').notEmpty().withMessage('shippingAddress is required'),
  ],
  validate,
  orderController.buyerSubmit
);

// Seller confirms payment and adds tracking (seller only)
router.post(
  '/:id/seller-confirm',
  auth,
  isSeller,
  [
    check('trackingNumber').optional().isString(),
    check('notes').optional().isString(),
  ],
  validate,
  orderController.sellerConfirm
);

// Buyer confirms receipt -> mark COMPLETED
router.post('/:id/buyer-confirm', auth, orderController.buyerConfirm);

// Rating (buyer or seller rate counterparty)
// body: { rating: int 1-5, comment?: string, targetUserId?: number }
router.post(
  '/:id/rate',
  auth,
  [
    check('rating').isInt({ min: 1, max: 5 }).withMessage('rating 1-5 is required'),
    check('comment').optional().isString(),
    check('targetUserId').optional().isInt(),
  ],
  validate,
  orderController.rateOrder
);

// Order chat - list messages
router.get('/:id/chat', auth, orderController.getOrderChat);

// Order chat - post message
router.post(
  '/:id/chat',
  auth,
  [check('message').notEmpty().withMessage('message is required')],
  validate,
  orderController.postOrderChat
);

// Admin: list all orders
router.get('/', auth, isAdmin, orderController.listAllOrders);

// Admin: update order status
router.patch(
  '/:id/status',
  auth,
  isAdmin,
  [
    check('status')
      .notEmpty()
      .withMessage('Status is required')
      .isIn(['pending', 'paid', 'processing', 'shipped', 'completed', 'cancelled', 'refunded'])
      .withMessage('Invalid status'),
  ],
  validate,
  orderController.updateOrderStatus
);

// Admin: delete order
router.delete('/:id', auth, isAdmin, orderController.deleteOrder);

// Optional: payment gateway webhook (public endpoint; secure inside controller)
router.post('/webhook', express.raw({ type: 'application/json' }), orderController.paymentWebhook);

module.exports = router;