const express = require('express');
const { query, body } = require('express-validator');
const { getDatabase } = require('../db/connection');
const { authenticate } = require('../middleware/auth');
const { handleValidationErrors, validators } = require('../middleware/validate');
const { calculateCarbon, getEmissionFactors } = require('../utils/carbon-calculator');
const router = express.Router();
router.use(authenticate);
router.post(
  '/',
  [validators.category, validators.activityType, validators.quantity, validators.logDate,
   body('notes').optional().trim().escape().isLength({ max: 500 }),
   handleValidationErrors],
  (req, res) => {
    try {
      const { category, activity_type, quantity, log_date, notes } = req.body;
      const calculation = calculateCarbon(category, activity_type, quantity);
      const db = getDatabase();
      const result = db.prepare(`
        INSERT INTO activity_logs (user_id, category, activity_type, quantity, unit, carbon_kg, notes, log_date)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        req.user.id,
        category,
        activity_type,
        quantity,
        calculation.unit,
        calculation.carbon_kg,
        notes || '',
        log_date || new Date().toISOString().split('T')[0]
      );
      const activity = db.prepare('SELECT * FROM activity_logs WHERE id = ?')
        .get(result.lastInsertRowid);
      res.status(201).json({
        activity,
        calculation: {
          factor_used: calculation.factor,
          unit: calculation.unit,
          label: calculation.label,
        },
      });
    } catch (err) {
      if (String(err.message).includes('Unknown category') || String(err.message).includes('Unknown activity type')) {
        return res.status(400).json({ success: false, message: String(err.message) });
      }
      res.status(500).json({ success: false, message: String(err.message || 'An internal error occurred.') });
    }
  }
);
router.get(
  '/',
  [
    query('start_date').optional().isISO8601().withMessage('start_date must be YYYY-MM-DD'),
    query('end_date').optional().isISO8601().withMessage('end_date must be YYYY-MM-DD'),
    query('category').optional().isIn(['transport', 'energy', 'food', 'waste', 'shopping']),
    validators.paginationLimit,
    validators.paginationOffset,
    handleValidationErrors,
  ],
  (req, res) => {
    try {
      const { start_date, end_date, category } = req.query;
      const limit = req.query.limit || 50;
      const offset = req.query.offset || 0;
      const db = getDatabase();
      let whereClause = 'WHERE user_id = ?';
      const params = [req.user.id];
      if (start_date) {
        whereClause += ' AND log_date >= ?';
        params.push(start_date);
      }
      if (end_date) {
        whereClause += ' AND log_date <= ?';
        params.push(end_date);
      }
      if (category) {
        whereClause += ' AND category = ?';
        params.push(category);
      }
      const total = db.prepare(
        `SELECT COUNT(*) as count FROM activity_logs ${whereClause}`
      ).get(...params).count;
      const activities = db.prepare(
        `SELECT * FROM activity_logs ${whereClause} ORDER BY log_date DESC, created_at DESC LIMIT ? OFFSET ?`
      ).all(...params, limit, offset);
      res.json({ activities, total, limit, offset });
    } catch (err) {
      res.status(500).json({ success: false, message: String(err.message || 'An internal error occurred.') });
    }
  }
);
const generateSummary = (db, userId, period, goalKg) => {
  const now = new Date();
  let dateFilter;
  let prevNow = new Date(now);
  if (period === 'week') {
    dateFilter = new Date(now.setDate(now.getDate() - 7)).toISOString().split('T')[0];
    prevNow.setDate(prevNow.getDate() - 7);
  } else if (period === 'year') {
    dateFilter = new Date(now.setFullYear(now.getFullYear() - 1)).toISOString().split('T')[0];
    prevNow.setFullYear(prevNow.getFullYear() - 1);
  } else {
    dateFilter = new Date(now.setMonth(now.getMonth() - 1)).toISOString().split('T')[0];
    prevNow.setMonth(prevNow.getMonth() - 1);
  }
  const prevStart = prevNow.toISOString().split('T')[0];
  const prevEnd = dateFilter;
  const getStats = db.transaction(() => {
    const totalEmissions = db.prepare(`SELECT COALESCE(SUM(carbon_kg), 0) as total_kg FROM activity_logs WHERE user_id = ? AND log_date >= ?`).get(userId, dateFilter);
    const byCategory = db.prepare(`SELECT category, COALESCE(SUM(carbon_kg), 0) as total_kg, COUNT(*) as count FROM activity_logs WHERE user_id = ? AND log_date >= ? GROUP BY category ORDER BY total_kg DESC`).all(userId, dateFilter);
    const dailyBreakdown = db.prepare(`SELECT log_date, COALESCE(SUM(carbon_kg), 0) as total_kg FROM activity_logs WHERE user_id = ? AND log_date >= ? GROUP BY log_date ORDER BY log_date ASC`).all(userId, dateFilter);
    const previousTotal = db.prepare(`SELECT COALESCE(SUM(carbon_kg), 0) as total_kg FROM activity_logs WHERE user_id = ? AND log_date >= ? AND log_date < ?`).get(userId, prevStart, prevEnd);
    const activityCount = db.prepare(`SELECT COUNT(*) as count FROM activity_logs WHERE user_id = ? AND log_date >= ?`).get(userId, dateFilter);
    return { totalEmissions, byCategory, dailyBreakdown, previousTotal, activityCount };
  });
  const stats = getStats();
  const currentTotal = stats.totalEmissions.total_kg;
  const prevTotal = stats.previousTotal.total_kg;
  const changePercent = prevTotal > 0 ? parseFloat(((currentTotal - prevTotal) / prevTotal * 100).toFixed(1)) : 0;
  return {
    period,
    total_kg: parseFloat(currentTotal.toFixed(2)),
    previous_total_kg: parseFloat(prevTotal.toFixed(2)),
    change_percent: changePercent,
    activity_count: stats.activityCount.count,
    by_category: stats.byCategory.map(c => ({ ...c, total_kg: parseFloat(c.total_kg.toFixed(2)) })),
    daily_breakdown: stats.dailyBreakdown.map(d => ({ ...d, total_kg: parseFloat(d.total_kg.toFixed(2)) })),
    goal_kg: goalKg,
    goal_progress_percent: parseFloat((currentTotal / goalKg * 100).toFixed(1)),
  };
};
router.get('/summary', (req, res) => {
  try {
    const period = req.query.period || 'month';
    if (!['week', 'month', 'year'].includes(period)) {
      return res.status(400).json({ error: 'Invalid period parameter' });
    }
    const db = getDatabase();
    const summary = generateSummary(db, req.user.id, period, req.user.monthly_goal_kg);
    res.json({ summary });
  } catch (err) {
    res.status(500).json({ success: false, message: String(err.message || 'An internal error occurred.') });
  }
});
router.get('/factors', (req, res) => {
  res.json({ factors: getEmissionFactors() });
});
router.delete(
  '/:id',
  [validators.idParam, handleValidationErrors],
  (req, res) => {
    try {
      const db = getDatabase();
      const activity = db.prepare(
        'SELECT id FROM activity_logs WHERE id = ? AND user_id = ?'
      ).get(req.params.id, req.user.id);
      if (!activity) {
        return res.status(404).json({
          error: 'Activity not found',
          message: 'The specified activity log does not exist or does not belong to you.',
        });
      }
      db.prepare('DELETE FROM activity_logs WHERE id = ?').run(req.params.id);
      res.json({ message: 'Activity log deleted successfully' });
    } catch (err) {
      res.status(500).json({ success: false, message: String(err.message || 'An internal error occurred.') });
    }
  }
);
module.exports = router;
