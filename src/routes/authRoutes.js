const express = require('express');
const router = express.Router();
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { protect } = require('../middleware/auth');
const { authLimiter } = require('../middleware/rateLimiter');
const logger = require('../config/logger');

// ─── Helper: send token response ──────────────────────────────────────────────
const sendTokenResponse = (user, statusCode, res, message) => {
  const token = user.generateToken();
  const userObj = user.toObject();
  delete userObj.password;

  res.status(statusCode).json({
    success: true,
    message,
    token,
    data: { user: userObj },
  });
};

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/register
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @swagger
 * /api/auth/register:
 *   post:
 *     summary: Register a new user
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string, example: "Alice Johnson" }
 *               email: { type: string, example: "alice@example.com" }
 *               password: { type: string, example: "Secret123" }
 *     responses:
 *       201: { description: User registered successfully }
 *       400: { description: Validation error }
 *       409: { description: Email already exists }
 */
router.post(
  '/register',
  authLimiter,
  [
    body('name').trim().notEmpty().withMessage('Name is required').isLength({ min: 2 }),
    body('email').trim().isEmail().withMessage('Valid email required').normalizeEmail(),
    body('password')
      .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
      .matches(/\d/).withMessage('Password must contain a number'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
        });
      }

      const { name, email, password, age, phone } = req.body;

      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(409).json({ success: false, message: 'Email already registered' });
      }

      const user = await User.create({ name, email, password, age, phone });
      logger.info(`New user registered: ${email}`);
      sendTokenResponse(user, 201, res, 'Registration successful');
    } catch (error) {
      next(error);
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/login
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @swagger
 * /api/auth/login:
 *   post:
 *     summary: Login and get JWT token
 *     tags: [Auth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email: { type: string, example: "alice@example.com" }
 *               password: { type: string, example: "Secret123" }
 *     responses:
 *       200: { description: Login successful, returns JWT token }
 *       401: { description: Invalid credentials }
 */
router.post(
  '/login',
  authLimiter,
  [
    body('email').trim().isEmail().withMessage('Valid email required').normalizeEmail(),
    body('password').notEmpty().withMessage('Password is required'),
  ],
  async (req, res, next) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({
          success: false,
          message: 'Validation failed',
          errors: errors.array().map((e) => ({ field: e.path, message: e.msg })),
        });
      }

      const { email, password } = req.body;

      // Find user WITH password
      const user = await User.findOne({ email }).select('+password');
      if (!user || !(await user.comparePassword(password))) {
        logger.warn(`Failed login attempt for: ${email}`);
        return res.status(401).json({ success: false, message: 'Invalid email or password' });
      }

      if (!user.isActive) {
        return res.status(401).json({ success: false, message: 'Account deactivated. Contact support.' });
      }

      logger.info(`User logged in: ${email}`);
      sendTokenResponse(user, 200, res, 'Login successful');
    } catch (error) {
      next(error);
    }
  }
);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/auth/me — Get current logged-in user
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @swagger
 * /api/auth/me:
 *   get:
 *     summary: Get current logged-in user
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Current user data }
 *       401: { description: Unauthorized }
 */
router.get('/me', protect, async (req, res) => {
  res.status(200).json({
    success: true,
    data: { user: req.user },
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/auth/logout
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @swagger
 * /api/auth/logout:
 *   post:
 *     summary: Logout (client should discard token)
 *     tags: [Auth]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200: { description: Logged out successfully }
 */
router.post('/logout', protect, (req, res) => {
  logger.info(`User logged out: ${req.user.email}`);
  res.status(200).json({
    success: true,
    message: 'Logged out successfully. Please delete your token on the client side.',
  });
});

module.exports = router;
