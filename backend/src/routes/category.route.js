const express = require('express');
const { check, validationResult } = require('express-validator');

const router = express.Router();

// Controller
const categoryController = require('../controllers/category.controller');

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
  Category routes:
  - GET    /            => list categories (public)
  - GET    /:id         => get category by id (public)
  - POST   /            => create category (admin)
  - PUT    /:id         => update category (admin)
  - DELETE /:id         => delete category (admin)
*/

// Public: list categories
router.get('/', categoryController.listCategories);

// Public: get category detail
router.get('/:id', categoryController.getCategoryById);

// Admin: create category
router.post(
  '/',
  auth,
  isAdmin,
  [
    check('name').notEmpty().withMessage('Name is required'),
    check('slug').optional().isString(),
    check('description').optional().isString(),
  ],
  validate,
  categoryController.createCategory
);

// Admin: update category
router.put(
  '/:id',
  auth,
  isAdmin,
  [
    check('name').optional().notEmpty(),
    check('slug').optional().isString(),
    check('description').optional().isString(),
  ],
  validate,
  categoryController.updateCategory
);

// Admin: delete category
router.delete('/:id', auth, isAdmin, categoryController.deleteCategory);

module.exports = router;