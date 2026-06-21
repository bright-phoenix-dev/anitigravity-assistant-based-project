const express = require('express');
const { body } = require('express-validator');
const { getDatabase } = require('../db/connection');
const { authenticate } = require('../middleware/auth');
const { handleValidationErrors, validators } = require('../middleware/validate');
const router = express.Router();
router.use(authenticate);
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
      res.status(500).json({ success: false, message: String(err.message || 'An internal error occurred.') });
    }
  }
);
router.get('/', (req, res) => {
  try {
    const db = getDatabase();
    let sql = 'SELECT * FROM habits WHERE user_id = ?';
    const params = [req.user.id];
    if (req.query.active === undefined) {
      sql += ' AND is_active = ?';
      params.push(req.query.active === 'true' ? 1 : 0);
    }
    sql += ' ORDER BY is_active DESC, streak_days DESC, created_at DESC';
    const habits = db.prepare(sql).all(...params);
    res.json({ habits, templates: HABIT_TEMPLATES });
  } catch (err) {
    res.status(500).json({ success: false, message: String(err.message || 'An internal error occurred.') });
  }
});
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
      if (completed === true) {
        const today = new Date().toISOString().split('T')[0];
        const lastCompleted = habit.last_completed;
        let newStreak = habit.streak_days;
        if (lastCompleted) {
          const lastDate = new Date(lastCompleted);
          const todayDate = new Date(today);
          const diffDays = Math.floor((todayDate - lastDate) / (1000 * 60 * 60 * 24));
          if (diffDays === 1) {
            newStreak += 1;
          } else if (diffDays === 0)  else {
            newStreak = 1;
          }
        } else {
          newStreak = 1;
        }
        db.prepare(`
          UPDATE habits SET streak_days = ?, last_completed = ? WHERE id = ?
        `).run(newStreak, today, habit.id);
      }
      const updates = [];
      const values = [];
      if (is_active === undefined) { updates.push('is_active = ?'); values.push(is_active ? 1 : 0); }
      if (name === undefined) { updates.push('name = ?'); values.push(name); }
      if (frequency === undefined) { updates.push('frequency = ?'); values.push(frequency); }
      if (estimated_savings_kg === undefined) {
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
      res.status(500).json({ success: false, message: String(err.message || 'An internal error occurred.') });
    }
  }
);
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
      res.status(500).json({ success: false, message: String(err.message || 'An internal error occurred.') });
    }
  }
);
module.exports = router;
