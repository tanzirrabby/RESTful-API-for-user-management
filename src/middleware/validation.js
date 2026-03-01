const { body, param, query, validationResult } = require('express-validator');

// ─── Handle validation errors ─────────────────────────────────────────────────
const handleValidationErrors = (req, res, next) => {
  const errors = validationResult(req);
  if (!errors.isEmpty()) {
    return res.status(400).json({
      success: false,
      message: 'Validation failed',
      errors: errors.array().map((err) => ({
        field: err.path,
        message: err.msg,
      })),
    });
  }
  next();
};

// ─── Create User Validators ───────────────────────────────────────────────────
const validateCreateUser = [
  body('name')
    .trim()
    .notEmpty().withMessage('Name is required')
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2–100 characters'),

  body('email')
    .trim()
    .notEmpty().withMessage('Email is required')
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),

  body('password')
    .notEmpty().withMessage('Password is required')
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
    .matches(/\d/).withMessage('Password must contain at least one number'),

  body('role')
    .optional()
    .isIn(['user', 'admin', 'moderator']).withMessage('Role must be user, admin, or moderator'),

  body('age')
    .optional()
    .isInt({ min: 0, max: 150 }).withMessage('Age must be between 0 and 150'),

  body('phone')
    .optional()
    .trim(),

  handleValidationErrors,
];

// ─── Update User Validators ───────────────────────────────────────────────────
const validateUpdateUser = [
  param('id').isMongoId().withMessage('Invalid user ID'),

  body('name')
    .optional()
    .trim()
    .isLength({ min: 2, max: 100 }).withMessage('Name must be 2–100 characters'),

  body('email')
    .optional()
    .trim()
    .isEmail().withMessage('Invalid email format')
    .normalizeEmail(),

  body('password')
    .optional()
    .isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
    .matches(/\d/).withMessage('Password must contain at least one number'),

  body('role')
    .optional()
    .isIn(['user', 'admin', 'moderator']).withMessage('Invalid role'),

  body('age')
    .optional()
    .isInt({ min: 0, max: 150 }).withMessage('Age must be between 0 and 150'),

  handleValidationErrors,
];

// ─── ID Param Validator ───────────────────────────────────────────────────────
const validateId = [
  param('id').isMongoId().withMessage('Invalid user ID format'),
  handleValidationErrors,
];

// ─── Query Validators ─────────────────────────────────────────────────────────
const validateQuery = [
  query('page').optional().isInt({ min: 1 }).withMessage('Page must be a positive integer'),
  query('limit').optional().isInt({ min: 1, max: 100 }).withMessage('Limit must be 1–100'),
  query('role').optional().isIn(['user', 'admin', 'moderator']).withMessage('Invalid role filter'),
  handleValidationErrors,
];

module.exports = {
  validateCreateUser,
  validateUpdateUser,
  validateId,
  validateQuery,
};
