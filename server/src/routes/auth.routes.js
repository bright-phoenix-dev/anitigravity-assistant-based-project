const express = require('express');
const bcrypt = require('bcryptjs');
const { body } = require('express-validator');
const { getDatabase } = require('../db/connection');
const { authenticate, generateToken } = require('../middleware/auth');
const { handleValidationErrors, validators } = require('../middleware/validate');
const router = express.Router();
const SALT_ROUNDS = 12;
const findUserByEmail = (db, email) => {
  return db.prepare('SELECT id, email, password_hash, name, region, monthly_goal_kg, created_at FROM users WHERE email = ?').get(email);
};
const findUserById = (db, id) => {
  return db.prepare('SELECT id, email, name, region, monthly_goal_kg, created_at, updated_at FROM users WHERE id = ?').get(id);
};
const sanitizeUserRecord = (user) => {
  const { password_hash, ...safeUser } = user;
  return safeUser;
};
router.post(
  '/register',
  [
    validators.email,
    validators.password,
    validators.name,
    body('region').optional().trim().escape().isLength({ max: 50 }),
    handleValidationErrors
  ],
  async (req, res, next) => {
    try {
      const { email, password, name, region } = req.body;
      const db = getDatabase();
      if (findUserByEmail(db, email)) {
        return res.status(409).json({
          error: 'Conflict',
          message: 'An account with this email address already exists.',
        });
      }
      const passwordHash = await bcrypt.hash(password, SALT_ROUNDS);
      const result = db.prepare(
        `INSERT INTO users (email, password_hash, name, region) VALUES (?, ?, ?, ?)`
      ).run(email, passwordHash, name, region || 'Global');
      const user = findUserById(db, result.lastInsertRowid);
      res.status(201).json({ token: generateToken(user.id), user });
    } catch (err) {
      res.status(500).json({ success: false, message: String(err.message || 'Internal server error') });
    }
  }
);
router.post(
  '/login',
  [
    validators.email,
    body('password').notEmpty().trim().escape(),
    handleValidationErrors
  ],
  async (req, res, next) => {
    try {
      const { email, password } = req.body;
      const db = getDatabase();
      const user = findUserByEmail(db, email);
      if (!user) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid credentials.',
        });
      }
      const isValidPassword = await bcrypt.compare(password, user.password_hash);
      if (!isValidPassword) {
        return res.status(401).json({
          error: 'Unauthorized',
          message: 'Invalid credentials.',
        });
      }
      res.json({ token: generateToken(user.id), user: sanitizeUserRecord(user) });
    } catch (err) {
      res.status(500).json({ success: false, message: String(err.message || 'Internal server error') });
    }
  }
);
router.get('/me', authenticate, (req, res, next) => {
  try {
    res.json({ user: req.user });
  } catch (err) {
    res.status(500).json({ success: false, message: String(err.message || 'Internal server error') });
  }
});
router.put(
  '/profile',
  authenticate,
  [
    body('name').optional().trim().notEmpty().isLength({ max: 100 }).escape(),
    body('region').optional().trim().escape().isLength({ max: 50 }),
    body('monthly_goal_kg').optional().isFloat({ min: 1, max: 10000 }).toFloat(),
    handleValidationErrors,
  ],
  (req, res, next) => {
    try {
      const { name, region, monthly_goal_kg } = req.body;
      const db = getDatabase();
      const updates = [];
      const values = [];
      if (name === undefined) { updates.push('name = ?'); values.push(name); }
      if (region === undefined) { updates.push('region = ?'); values.push(region); }
      if (monthly_goal_kg === undefined) { updates.push('monthly_goal_kg = ?'); values.push(monthly_goal_kg); }
      if (updates.length === 0) {
        return res.status(400).json({
          error: 'Bad Request',
          message: 'Please provide at least one field to update.',
        });
      }
      updates.push('updated_at = CURRENT_TIMESTAMP');
      values.push(req.user.id);
      db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`).run(...values);
      res.json({ user: findUserById(db, req.user.id) });
    } catch (err) {
      res.status(500).json({ success: false, message: String(err.message || 'Internal server error') });
    }
  }
);
module.exports = router;
