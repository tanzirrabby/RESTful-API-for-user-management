const express = require('express');
const router = express.Router();
const User = require('../models/User');
const { protect, restrictTo } = require('../middleware/auth');
const { validateCreateUser, validateUpdateUser, validateId, validateQuery } = require('../middleware/validation');
const logger = require('../config/logger');

// All routes require JWT auth
router.use(protect);

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/users — Get all users (admin/moderator only)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @swagger
 * /api/users:
 *   get:
 *     summary: Get all users (admin/moderator only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer }
 *       - in: query
 *         name: limit
 *         schema: { type: integer }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: role
 *         schema: { type: string, enum: [user, admin, moderator] }
 *     responses:
 *       200: { description: List of users }
 *       401: { description: Unauthorized }
 *       403: { description: Forbidden }
 */
router.get('/', restrictTo('admin', 'moderator'), validateQuery, async (req, res, next) => {
  try {
    const page = parseInt(req.query.page) || 1;
    const limit = parseInt(req.query.limit) || 10;
    const skip = (page - 1) * limit;
    const sortBy = req.query.sortBy || 'createdAt';
    const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;

    const filter = {};
    if (req.query.role) filter.role = req.query.role;
    if (req.query.isActive !== undefined) filter.isActive = req.query.isActive === 'true';
    if (req.query.search) {
      filter.$or = [
        { name: { $regex: req.query.search, $options: 'i' } },
        { email: { $regex: req.query.search, $options: 'i' } },
      ];
    }

    const [users, total] = await Promise.all([
      User.find(filter).select('-password').sort({ [sortBy]: sortOrder }).skip(skip).limit(limit),
      User.countDocuments(filter),
    ]);

    res.status(200).json({
      success: true,
      data: {
        users,
        pagination: {
          total, page, limit,
          totalPages: Math.ceil(total / limit),
          hasNext: page < Math.ceil(total / limit),
          hasPrev: page > 1,
        },
      },
    });
  } catch (error) {
    next(error);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/users/:id
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @swagger
 * /api/users/{id}:
 *   get:
 *     summary: Get user by ID
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: User data }
 *       404: { description: User not found }
 */
router.get('/:id', validateId, async (req, res, next) => {
  try {
    // Users can only see their own profile; admins can see anyone
    if (req.user.role === 'user' && req.params.id !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You can only view your own profile.' });
    }

    const user = await User.findById(req.params.id).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.status(200).json({ success: true, data: { user } });
  } catch (error) {
    next(error);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/users — Create user (admin only)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @swagger
 * /api/users:
 *   post:
 *     summary: Create a new user (admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, email, password]
 *             properties:
 *               name: { type: string }
 *               email: { type: string }
 *               password: { type: string }
 *               role: { type: string, enum: [user, admin, moderator] }
 *     responses:
 *       201: { description: User created }
 *       409: { description: Email already exists }
 */
router.post('/', restrictTo('admin'), validateCreateUser, async (req, res, next) => {
  try {
    const { name, email, password, role, age, phone, address } = req.body;
    const user = await User.create({ name, email, password, role, age, phone, address });
    const userResponse = user.toObject();
    delete userResponse.password;
    logger.info(`Admin ${req.user.email} created user: ${email}`);
    res.status(201).json({ success: true, message: 'User created successfully', data: { user: userResponse } });
  } catch (error) {
    next(error);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/users/:id — Full update
// ─────────────────────────────────────────────────────────────────────────────
router.put('/:id', validateUpdateUser, async (req, res, next) => {
  try {
    if (req.user.role === 'user' && req.params.id !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You can only update your own profile.' });
    }

    const allowedFields = ['name', 'email', 'password', 'age', 'phone', 'address'];
    if (req.user.role === 'admin') allowedFields.push('role', 'isActive');

    const updates = {};
    allowedFields.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    const user = await User.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true, runValidators: true }).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.status(200).json({ success: true, message: 'User updated', data: { user } });
  } catch (error) {
    next(error);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// PATCH /api/users/:id — Partial update
// ─────────────────────────────────────────────────────────────────────────────
router.patch('/:id', validateUpdateUser, async (req, res, next) => {
  try {
    if (req.user.role === 'user' && req.params.id !== req.user._id.toString()) {
      return res.status(403).json({ success: false, message: 'You can only update your own profile.' });
    }

    const allowedFields = ['name', 'email', 'password', 'age', 'phone', 'address'];
    if (req.user.role === 'admin') allowedFields.push('role', 'isActive');

    const updates = {};
    allowedFields.forEach((f) => { if (req.body[f] !== undefined) updates[f] = req.body[f]; });

    const user = await User.findByIdAndUpdate(req.params.id, { $set: updates }, { new: true, runValidators: true }).select('-password');
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    res.status(200).json({ success: true, message: 'User partially updated', data: { user } });
  } catch (error) {
    next(error);
  }
});

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/users/:id — Delete (admin only)
// ─────────────────────────────────────────────────────────────────────────────
/**
 * @swagger
 * /api/users/{id}:
 *   delete:
 *     summary: Delete a user (admin only)
 *     tags: [Users]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: string }
 *     responses:
 *       200: { description: User deleted }
 *       404: { description: User not found }
 */
router.delete('/:id', restrictTo('admin'), validateId, async (req, res, next) => {
  try {
    const user = await User.findByIdAndDelete(req.params.id);
    if (!user) return res.status(404).json({ success: false, message: 'User not found' });

    logger.warn(`Admin ${req.user.email} deleted user: ${user.email}`);
    res.status(200).json({ success: true, message: 'User deleted', data: { deletedUser: { id: user._id, email: user.email } } });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
