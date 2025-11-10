const express = require('express');
const { check, validationResult } = require('express-validator');

const router = express.Router();

// Controller
const orderController = require('../controllers/order.controller');

// Middlewares
const auth = require('../middleware/auth.middleware');
const isAdmin = require('../middleware/admin.middleware');

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

// Get order by id (controller should enforce owner/admin)
router.get('/:id', auth, orderController.getOrderById);

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