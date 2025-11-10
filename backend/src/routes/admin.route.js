const express = require('express');
const { check, validationResult } = require('express-validator');

const router = express.Router();

// Controllers
const adminController = require('../controllers/admin.controller');

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
  Admin routes (all protected by auth + isAdmin)
  - Users: list, get, update role, delete
  - Sellers: list, get, delete
  - Products: list, get, delete
  - Auctions: list, get, update status
  - Stats: basic site metrics
*/

router.use(auth, isAdmin);

// Users
router.get('/users', adminController.listUsers);
router.get('/users/:id', adminController.getUserById);
router.put(
  '/users/:id/role',
  [
    check('role')
      .notEmpty()
      .withMessage('Role is required')
      .isIn(['user', 'seller', 'admin'])
      .withMessage('Role must be user, seller or admin'),
  ],
  validate,
  adminController.updateUserRole
);
router.delete('/users/:id', adminController.deleteUser);

// Sellers
router.get('/sellers', adminController.listSellers);
router.get('/sellers/:id', adminController.getSellerById);
router.delete('/sellers/:id', adminController.deleteSeller);

// Products
router.get('/products', adminController.listProducts);
router.get('/products/:id', adminController.getProductById);
router.delete('/products/:id', adminController.deleteProduct);

// Auctions
router.get('/auctions', adminController.listAuctions);
router.get('/auctions/:id', adminController.getAuctionById);
router.patch(
  '/auctions/:id/status',
  [
    check('status')
      .notEmpty()
      .withMessage('Status is required')
      .isIn(['scheduled', 'active', 'closed', 'cancelled'])
      .withMessage('Invalid auction status'),
  ],
  validate,
  adminController.updateAuctionStatus
);

// Stats / dashboard
router.get('/stats', adminController.getStats);

module.exports = router;