import express from 'express';
import { check, validationResult } from 'express-validator';

import authController from '../controllers/auth.controller.js';
import auth from '../middlewares/auth.middleware.js';

const router = express.Router();

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

export default router;