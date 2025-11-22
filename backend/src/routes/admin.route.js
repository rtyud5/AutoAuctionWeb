import express from 'express';
import { check, validationResult } from 'express-validator';

const router = express.Router();

// Controllers
import adminController from '../controllers/admin.controller.js';

// Middlewares
import auth from '../middleware/auth.middleware.js';
import isAdmin from '../middleware/admin.middleware.js';

// Validation result handler
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

/*
  Admin routes (all protected by auth + isAdmin)
  - Users: list, get, update role, delete, lock/unlock
  - Sellers: list, get, delete
  - Products: list, get, delete
  - Auctions: list, get, update status, (optional remove offending)
  - Categories: list, create, update, delete
  - Upgrade requests: list, approve, reject
  - Stats: basic site metrics
*/

router.use(auth, isAdmin);

// Admin dashboard
router.get('/', adminController.dashboard);

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

// Lock / Unlock user
router.post('/users/:id/lock', adminController.lockUser);
router.post('/users/:id/unlock', adminController.unlockUser);

// Sellers
router.get('/sellers', adminController.listSellers);
router.get('/sellers/:id', adminController.getSellerById);
router.delete('/sellers/:id', adminController.deleteSeller);

// Products
router.get('/products', adminController.listProducts);
router.get('/products/:id', adminController.getProductById);
router.delete('/products/:id', adminController.deleteProduct);

// Auctions (including optional moderation actions)
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
// Optional: remove/disable offending auction
router.post('/auctions/:id/remove', adminController.removeAuction);

// Categories management
router.get('/categories', adminController.listCategories);

router.post(
  '/categories',
  [
    check('name').notEmpty().withMessage('Category name is required'),
    check('slug').optional().isString(),
    check('parent_id').optional().isInt().withMessage('parent_id must be integer'),
  ],
  validate,
  adminController.createCategory
);

router.post(
  '/categories/:id/update',
  [
    check('name').optional().notEmpty().withMessage('Category name cannot be empty'),
    check('slug').optional().isString(),
    check('parent_id').optional().isInt().withMessage('parent_id must be integer'),
  ],
  validate,
  adminController.updateCategory
);

router.post('/categories/:id/delete', adminController.deleteCategory);

// Upgrade requests
router.get('/upgrade-requests', adminController.listUpgradeRequests);

router.post('/upgrade-requests/:id/approve', adminController.approveUpgradeRequest);
router.post('/upgrade-requests/:id/reject', adminController.rejectUpgradeRequest);

// Stats / dashboard
router.get('/stats', adminController.getStats);

export default router;