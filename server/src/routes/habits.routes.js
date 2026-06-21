/**
 * CarbonWise — Habits Tracking Routes
 *
 * CRUD operations for eco-friendly habits with streak tracking.
 *
 * Routes:
 *   POST   /api/habits          — Create a new habit
 *   GET    /api/habits          — List user's habits
 *   PUT    /api/habits/:id      — Update a habit (complete, toggle, edit)
 *   DELETE /api/habits/:id      — Delete a habit
 */

const express = require('express');
const { body } = require('express-validator');
const { getDatabase } = require('../db/connection');
const { authenticate } = require('../middleware/auth');
const { handleValidationErrors, validators } = require('../middleware/validate');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * Predefined habit templates with estimated carbon savings.
 * Used when creating habits to provide default savings estimates.
 */
const HABIT_TEMPLATES = {
  'Meatless Monday': { category: 'food', estimated_savings_kg: 24.4 },
  'Bike to work': { category: 'transport', estimated_savings_kg: 40.0 },
  'Use public transit': { category: 'transport', estimated_savings_kg: 30.0 },
  'Cold water laundry': { category: 'energy', estimated_savings_kg: 8.0 },
  'Recycle all waste': { category: 'waste', estimated_savings_kg: 15.0 },
  'Compost food scraps': { category: 'waste', estimated_savings_kg: 10.0 },
  'LED lighting': { category: 'energy', estimated_savings_kg: 5.0 },
  'Reusable bags': { category: 'shopping', estimated_savings_kg: 2.0 },
  'Shorter showers': { category: 'energy', estimated_savings_kg: 12.0 },
  'Plant-based meals': { category: 'food', estimated_savings_kg: 50.0 },
  'Carpool': { category: 'transport', estimated_savings_kg: 25.0 },
  'Air dry clothes': { category: 'energy', estimated_savings_kg: 6.0 },
  'Buy local produce': { category: 'food', estimated_savings_kg: 8.0 },
  'Unplug electronics': { category: 'energy', estimated_savings_kg: 3.0 },
  'Reusable water bottle': { category: 'shopping', estimated_savings_kg: 4.0 },
};

/**
 * POST /api/habits
 * Creates a new habit for the authenticated user.
 *
 * @body {string} name                    — Habit name
 * @body {string} category                — Category (transport, energy, food, waste, shopping)
 * @body {string} [frequency=daily]       — Frequency (daily, weekly, monthly)
 * @body {number} [estimated_savings_kg]  — Estimated monthly CO₂ savings
 * @returns {{ habit: object }}
 */
router.post(
  '/',
  [
    validators.habitName,
    validators.category,
    validators.frequency,
    body('estimated_savings_kg').optional().isFloat({ min: 0 }).toFloat(),
    handleValidationErrors,
  ],
  (req, res) => {
    try {
      const { name, category, frequency, estimated_savings_kg } = req.body;
      const db = getDatabase();

      // Use template savings if available and no custom value provided
      const template = HABIT_TEMPLATES[name];
      const savings = estimated_savings_kg ?? template?.estimated_savings_kg ?? 0;

      const result = db.prepare(`
        INSERT INTO habits (user_id, name, category, frequency, estimated_savings_kg)
        VALUES (?, ?, ?, ?, ?)
      `).run(req.user.id, name, category, frequency || 'daily', savings);

      const habit = db.prepare('SELECT * FROM habits WHERE id = ?')
        .get(result.lastInsertRowid);

      res.status(201).json({ habit });
    } catch (err) {
      console.error('Habit creation error:', err);
      res.status(500).json({ error: 'Failed to create habit', message: 'An internal error occurred.' });
    }
  }
);

/**
 * GET /api/habits
 * Lists all habits for the authenticated user.
 *
 * @query {string} [active] — Filter by active status ('true' or 'false')
 * @returns {{ habits: array, templates: object }}
 */
router.get('/', (req, res) => {
  try {
    const db = getDatabase();
    let sql = 'SELECT * FROM habits WHERE user_id = ?';
    const params = [req.user.id];

    if (req.query.active !== undefined) {
      sql += ' AND is_active = ?';
      params.push(req.query.active === 'true' ? 1 : 0);
    }

    sql += ' ORDER BY is_active DESC, streak_days DESC, created_at DESC';

    const habits = db.prepare(sql).all(...params);

    res.json({ habits, templates: HABIT_TEMPLATES });
  } catch (err) {
    console.error('Habit list error:', err);
    res.status(500).json({ error: 'Failed to fetch habits', message: 'An internal error occurred.' });
  }
});

/**
 * PUT /api/habits/:id
 * Updates a habit. Supports completing, toggling active, and editing fields.
 *
 * @param {number} id                     — Habit ID
 * @body {boolean} [complete]             — Mark as completed today (updates streak)
 * @body {boolean} [is_active]            — Toggle active/inactive
 * @body {string}  [name]                 — Update habit name
 * @body {string}  [frequency]            — Update frequency
 * @body {number}  [estimated_savings_kg] — Update savings estimate
 * @returns {{ habit: object }}
 */
router.put(
  '/:id',
  [
    validators.idParam,
    body('complete').optional().isBoolean().toBoolean(),
    body('is_active').optional().isBoolean().toBoolean(),
    body('name').optional().trim().notEmpty().isLength({ max: 200 }).escape(),
    body('frequency').optional().isIn(['daily', 'weekly', 'monthly']),
    body('estimated_savings_kg').optional().isFloat({ min: 0 }).toFloat(),
    handleValidationErrors,
  ],
  (req, res) => {
    try {
      const db = getDatabase();

      // Verify ownership
      const habit = db.prepare(
        'SELECT * FROM habits WHERE id = ? AND user_id = ?'
      ).get(req.params.id, req.user.id);

      if (!habit) {
        return res.status(404).json({
          error: 'Habit not found',
          message: 'The specified habit does not exist or does not belong to you.',
        });
      }

      const { complete, is_active, name, frequency, estimated_savings_kg } = req.body;

      // Handle completion with streak tracking
      if (complete === true) {
        const today = new Date().toISOString().split('T')[0];
        const lastCompleted = habit.last_completed;

        let newStreak = habit.streak_days;
        if (lastCompleted) {
          const lastDate = new Date(lastCompleted);
          const todayDate = new Date(today);
          const diffDays = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));

          if (diffDays === 1) {
            // Consecutive day — increment streak
            newStreak += 1;
          } else if (diffDays === 0) {
            // Same day — no change
          } else {
            // Streak broken — reset to 1
            newStreak = 1;
          }
        } else {
          newStreak = 1;
        }

        db.prepare(`
          UPDATE habits SET streak_days = ?, last_completed = ? WHERE id = ?
        `).run(newStreak, today, habit.id);
      }

      // Handle field updates
      const updates = [];
      const values = [];

      if (is_active !== undefined) { updates.push('is_active = ?'); values.push(is_active ? 1 : 0); }
      if (name !== undefined) { updates.push('name = ?'); values.push(name); }
      if (frequency !== undefined) { updates.push('frequency = ?'); values.push(frequency); }
      if (estimated_savings_kg !== undefined) {
        updates.push('estimated_savings_kg = ?');
        values.push(estimated_savings_kg);
      }

      if (updates.length > 0) {
        values.push(habit.id);
        db.prepare(`UPDATE habits SET ${updates.join(', ')} WHERE id = ?`).run(...values);
      }

      const updatedHabit = db.prepare('SELECT * FROM habits WHERE id = ?').get(habit.id);
      res.json({ habit: updatedHabit });
    } catch (err) {
      console.error('Habit update error:', err);
      res.status(500).json({ error: 'Failed to update habit', message: 'An internal error occurred.' });
    }
  }
);

/**
 * DELETE /api/habits/:id
 * Deletes a habit owned by the authenticated user.
 */
router.delete(
  '/:id',
  [validators.idParam, handleValidationErrors],
  (req, res) => {
    try {
      const db = getDatabase();

      const habit = db.prepare(
        'SELECT id FROM habits WHERE id = ? AND user_id = ?'
      ).get(req.params.id, req.user.id);

      if (!habit) {
        return res.status(404).json({
          error: 'Habit not found',
          message: 'The specified habit does not exist or does not belong to you.',
        });
      }

      db.prepare('DELETE FROM habits WHERE id = ?').run(req.params.id);
      res.json({ message: 'Habit deleted successfully' });
    } catch (err) {
      console.error('Habit delete error:', err);
      res.status(500).json({ error: 'Failed to delete habit', message: 'An internal error occurred.' });
    }
  }
);

module.exports = router;
