/**
 * CarbonWise — Authentication Routes
 *
 * Handles user registration, login, profile retrieval, and profile updates.
 * All passwords are hashed with bcrypt before storage.
 *
 * Routes:
 *   POST /api/auth/register  — Create new user account
 *   POST /api/auth/login     — Authenticate and receive JWT
 *   GET  /api/auth/me        — Get current user profile
 *   PUT  /api/auth/profile   — Update user profile settings
 */

const express = require('express');
const bcrypt = require('bcryptjs');
const { body } = require('express-validator');
const { getDatabase } = require('../db/connection');
const { authenticate, generateToken } = require('../middleware/auth');
const { handleValidationErrors, validators } = require('../middleware/validate');

const router = express.Router();

const SALT_ROUNDS = 12;

/**
 * POST /api/auth/register
 * Creates a new user account with hashed password.
 *
 * @body {string} email    — User's email address
 * @body {string} password — Min 8 chars, must contain letter + number
 * @body {string} name     — Display name
 * @body {string} [region] — User's geographic region (default: 'Global')
 * @returns {{ token: string, user: object }}
 */
router.post(
  '/register',
  [validators.email, validators.password, validators.name,
   body('region').optional().trim().escape(),
   handleValidationErrors],
  async (req, res) => {
    try {
      const { email, password, name, region } = req.body;
      const db = getDatabase();

      // Check for existing user
      const existing = db.prepare('SELECT id FROM users WHERE email = ?').get(email);
      if (existing) {
        return res.status(409).json({
          error: 'Email already registered',
          message: 'An account with this email address already exists.',
        });
      }

      // Hash password and create user
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
      const result = db.prepare(
        `INSERT INTO users (email, password_hash, name, region) VALUES (?, ?, ?, ?)`
      ).run(email, passwordHash, name, region || 'Global');

      const token = generateToken(result.lastInsertRowid);

      const user = db.prepare(
        'SELECT id, email, name, region, monthly_goal_kg, created_at FROM users WHERE id = ?'
      ).get(result.lastInsertRowid);

      res.status(201).json({ token, user });
    } catch (err) {
      console.error('Registration error:', err);
      res.status(500).json({ error: 'Registration failed', message: 'An internal error occurred.' });
    }
  }
);

/**
 * POST /api/auth/login
 * Authenticates user credentials and returns a JWT.
 *
 * @body {string} email    — User's email address
 * @body {string} password — User's password
 * @returns {{ token: string, user: object }}
 */
router.post(
  '/login',
  [validators.email,
   body('password').notEmpty().withMessage('Password is required'),
   handleValidationErrors],
  async (req, res) => {
    try {
      const { email, password } = req.body;
      const db = getDatabase();

      const user = db.prepare(
        'SELECT id, email, password_hash, name, region, monthly_goal_kg, created_at FROM users WHERE email = ?'
      ).get(email);

      if (!user) {
        return res.status(401).json({
          error: 'Invalid credentials',
          message: 'Email or password is incorrect.',
        });
      }

      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({
          error: 'Invalid credentials',
          message: 'Email or password is incorrect.',
        });
      }

      const token = generateToken(user.id);

      // Remove password hash from response
      const { password_hash, ...safeUser } = user;

      res.json({ token, user: safeUser });
    } catch (err) {
      console.error('Login error:', err);
      res.status(500).json({ error: 'Login failed', message: 'An internal error occurred.' });
    }
  }
);

/**
 * GET /api/auth/me
 * Returns the currently authenticated user's profile.
 * Requires: Bearer token
 *
 * @returns {{ user: object }}
 */
router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

/**
 * PUT /api/auth/profile
 * Updates the authenticated user's profile fields.
 * Requires: Bearer token
 *
 * @body {string} [name]             — Updated display name
 * @body {string} [region]           — Updated region
 * @body {number} [monthly_goal_kg]  — Updated monthly carbon goal
 * @returns {{ user: object }}
 */
router.put(
  '/profile',
  authenticate,
  [
    body('name').optional().trim().notEmpty().isLength({ max: 100 }).escape(),
    body('region').optional().trim().escape(),
    body('monthly_goal_kg').optional().isFloat({ min: 1, max: 10000 }).toFloat(),
    handleValidationErrors,
  ],
  (req, res) => {
    try {
      const { name, region, monthly_goal_kg } = req.body;
      const db = getDatabase();

      // Build dynamic update query
      const updates = [];
      const values = [];

      if (name !== undefined) { updates.push('name = ?'); values.push(name); }
      if (region !== undefined) { updates.push('region = ?'); values.push(region); }
      if (monthly_goal_kg !== undefined) { updates.push('monthly_goal_kg = ?'); values.push(monthly_goal_kg); }

      if (updates.length === 0) {
        return res.status(400).json({
          error: 'No updates provided',
          message: 'Please provide at least one field to update.',
        });
      }

      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(req.user.id);

      db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);

      const updatedUser = db.prepare(
        'SELECT id, email, name, region, monthly_goal_kg, created_at, updated_at FROM users WHERE id = ?'
      ).get(req.user.id);

      res.json({ user: updatedUser });
    } catch (err) {
      console.error('Profile update error:', err);
      res.status(500).json({ error: 'Update failed', message: 'An internal error occurred.' });
    }
  }
);

module.exports = router;
