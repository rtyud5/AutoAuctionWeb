const express = require('express');
const { check, validationResult } = require('express-validator');

const router = express.Router();

// Controller
const authController = require('../controllers/auth.controller');

// Middleware
const auth = require('../middleware/auth.middleware');

// Validation result handler
const validate = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) return res.status(400).json({ errors: errors.array() });
  next();
};

// Register
router.post(
  '/register',
  [
    check('name').notEmpty().withMessage('Name is required'),
    check('email').isEmail().withMessage('Valid email required'),
    check('password').isLength({ min: 6 }).withMessage('Password min 6 chars'),
  ],
  validate,
  authController.register
);

// Login
router.post(
  '/login',
  [
    check('email').isEmail().withMessage('Valid email required'),
    check('password').notEmpty().withMessage('Password is required'),
  ],
  validate,
  authController.login
);

// Logout
router.post('/logout', auth, authController.logout);

module.exports = router;