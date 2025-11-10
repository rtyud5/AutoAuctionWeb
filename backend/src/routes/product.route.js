const express = require('express');
const { check, validationResult } = require('express-validator');

const router = express.Router();

// Controllers
const productController = require('../controllers/product.controller');

// Middlewares
const auth = require('../middleware/auth.middleware');
const isAdmin = require('../middleware/admin.middleware');
const isSeller = require('../middleware/seller.middleware');

// validation result handler
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

/*
  Routes:
  - GET    /           => list products (pagination, search, filters)
  - GET    /:id        => get product by id
  - POST   /           => create product (seller or admin)
  - PUT    /:id        => update product (seller or admin)
  - DELETE /:id        => delete product (seller or admin)
  - POST   /:id/images => upload images for product (seller or admin) - controller should handle multer
*/

// List products with optional query params: page, limit, q, category, sort
router.get('/', productController.listProducts);

// Get product detail
router.get('/:id', productController.getProductById);

// Create product (seller or admin)
router.post(
  '/',
  auth,
  [
    check('title').notEmpty().withMessage('Title is required'),
    check('description').optional().isString(),
    check('price').isFloat({ gt: 0 }).withMessage('Price must be > 0'),
    check('category').optional().isString(),
    check('stock').optional().isInt({ min: 0 }),
    // add other validations as needed
  ],
  validate,
  (req, res, next) => {
    // allow either seller or admin; isSeller middleware ensures seller role
    // if project uses combined role check, adjust accordingly
    if (req.user && (req.user.role === 'admin')) return next();
    return require('../middleware/seller.middleware')(req, res, next);
  },
  productController.createProduct
);

// Update product
router.put(
  '/:id',
  auth,
  [
    check('title').optional().notEmpty(),
    check('description').optional().isString(),
    check('price').optional().isFloat({ gt: 0 }),
    check('category').optional().isString(),
    check('stock').optional().isInt({ min: 0 }),
  ],
  validate,
  (req, res, next) => {
    if (req.user && (req.user.role === 'admin')) return next();
    return require('../middleware/seller.middleware')(req, res, next);
  },
  productController.updateProduct
);

// Delete product
router.delete(
  '/:id',
  auth,
  (req, res, next) => {
    if (req.user && (req.user.role === 'admin')) return next();
    return require('../middleware/seller.middleware')(req, res, next);
  },
  productController.deleteProduct
);

// Upload images for product (controller should integrate multer or other uploader)
router.post('/:id/images', auth, (req, res, next) => {
  if (req.user && (req.user.role === 'admin')) return next();
  return require('../middleware/seller.middleware')(req, res, next);
}, productController.uploadImages);

// Admin endpoints (optional)
router.get('/admin/all', auth, isAdmin, productController.adminListAllProducts);

module.exports = router;