/**
 * CarbonWise — Activity Logging Routes
 *
 * CRUD operations for carbon-emitting activities.
 * Automatically calculates CO₂ emissions using the carbon calculator engine.
 *
 * Routes:
 *   POST   /api/activities          — Log a new activity
 *   GET    /api/activities          — List activities (with date filters)
 *   GET    /api/activities/summary  — Aggregated emissions statistics
 *   GET    /api/activities/factors  — Get available emission factors
 *   DELETE /api/activities/:id      — Delete an activity log
 */

const express = require('express');
const { query, body } = require('express-validator');
const { getDatabase } = require('../db/connection');
const { authenticate } = require('../middleware/auth');
const { handleValidationErrors, validators } = require('../middleware/validate');
const { calculateCarbon, getEmissionFactors } = require('../utils/carbon-calculator');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * POST /api/activities
 * Logs a new carbon-emitting activity with auto-calculated emissions.
 *
 * @body {string} category      — Emission category (transport, energy, food, waste, shopping)
 * @body {string} activity_type — Specific activity within the category
 * @body {number} quantity      — Amount of activity
 * @body {string} [log_date]    — Date of activity (default: today)
 * @body {string} [notes]       — Optional notes
 * @returns {{ activity: object, calculation: object }}
 */
router.post(
  '/',
  [validators.category, validators.activityType, validators.quantity, validators.logDate,
   body('notes').optional().trim().escape().isLength({ max: 500 }),
   handleValidationErrors],
  (req, res) => {
    try {
      const { category, activity_type, quantity, log_date, notes } = req.body;

      // Calculate carbon emissions
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
      // Handle known calculator errors
      if (err.message.includes('Unknown category') || err.message.includes('Unknown activity type')) {
        return res.status(400).json({ error: 'Invalid activity', message: err.message });
      }
      console.error('Activity log error:', err);
      res.status(500).json({ error: 'Failed to log activity', message: 'An internal error occurred.' });
    }
  }
);

/**
 * GET /api/activities
 * Lists the authenticated user's activity logs with optional date range filtering.
 *
 * @query {string} [start_date] — Filter start date (YYYY-MM-DD)
 * @query {string} [end_date]   — Filter end date (YYYY-MM-DD)
 * @query {string} [category]   — Filter by category
 * @query {number} [limit=50]   — Results per page
 * @query {number} [offset=0]   — Pagination offset
 * @returns {{ activities: array, total: number }}
 */
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
      console.error('Activity list error:', err);
      res.status(500).json({ error: 'Failed to fetch activities', message: 'An internal error occurred.' });
    }
  }
);

/**
 * GET /api/activities/summary
 * Returns aggregated emission statistics for the authenticated user.
 *
 * @query {string} [period=month] — Aggregation period: 'week', 'month', 'year'
 * @returns {{ summary: object }}
 */
router.get('/summary', (req, res) => {
  try {
    const db = getDatabase();
    const period = req.query.period || 'month';

    // Calculate date range based on period
    let dateFilter;
    const now = new Date();
    switch (period) {
      case 'week':
        dateFilter = new Date(now.setDate(now.getDate() - 7)).toISOString().split('T')[0];
        break;
      case 'year':
        dateFilter = new Date(now.setFullYear(now.getFullYear() - 1)).toISOString().split('T')[0];
        break;
      case 'month':
      default:
        dateFilter = new Date(now.setMonth(now.getMonth() - 1)).toISOString().split('T')[0];
        break;
    }

    // Total emissions in period
    const totalEmissions = db.prepare(`
      SELECT COALESCE(SUM(carbon_kg), 0) as total_kg
      FROM activity_logs
      WHERE user_id = ? AND log_date >= ?
    `).get(req.user.id, dateFilter);

    // Emissions by category
    const byCategory = db.prepare(`
      SELECT category, COALESCE(SUM(carbon_kg), 0) as total_kg, COUNT(*) as count
      FROM activity_logs
      WHERE user_id = ? AND log_date >= ?
      GROUP BY category
      ORDER BY total_kg DESC
    `).all(req.user.id, dateFilter);

    // Daily breakdown for charting
    const dailyBreakdown = db.prepare(`
      SELECT log_date, COALESCE(SUM(carbon_kg), 0) as total_kg
      FROM activity_logs
      WHERE user_id = ? AND log_date >= ?
      GROUP BY log_date
      ORDER BY log_date ASC
    `).all(req.user.id, dateFilter);

    // Previous period comparison
    const prevEnd = dateFilter;
    const prevNow = new Date(dateFilter);
    switch (period) {
      case 'week':
        prevNow.setDate(prevNow.getDate() - 7);
        break;
      case 'year':
        prevNow.setFullYear(prevNow.getFullYear() - 1);
        break;
      default:
        prevNow.setMonth(prevNow.getMonth() - 1);
    }
    const prevStart = prevNow.toISOString().split('T')[0];

    const previousTotal = db.prepare(`
      SELECT COALESCE(SUM(carbon_kg), 0) as total_kg
      FROM activity_logs
      WHERE user_id = ? AND log_date >= ? AND log_date < ?
    `).get(req.user.id, prevStart, prevEnd);

    // Activity count
    const activityCount = db.prepare(`
      SELECT COUNT(*) as count
      FROM activity_logs
      WHERE user_id = ? AND log_date >= ?
    `).get(req.user.id, dateFilter);

    const currentTotal = totalEmissions.total_kg;
    const prevTotal = previousTotal.total_kg;
    const changePercent = prevTotal > 0
      ? parseFloat(((currentTotal - prevTotal) / prevTotal * 100).toFixed(1))
      : 0;

    res.json({
      summary: {
        period,
        total_kg: parseFloat(currentTotal.toFixed(2)),
        previous_total_kg: parseFloat(prevTotal.toFixed(2)),
        change_percent: changePercent,
        activity_count: activityCount.count,
        by_category: byCategory.map(c => ({
          ...c,
          total_kg: parseFloat(c.total_kg.toFixed(2)),
        })),
        daily_breakdown: dailyBreakdown.map(d => ({
          ...d,
          total_kg: parseFloat(d.total_kg.toFixed(2)),
        })),
        goal_kg: req.user.monthly_goal_kg,
        goal_progress_percent: parseFloat(
          (currentTotal / req.user.monthly_goal_kg * 100).toFixed(1)
        ),
      },
    });
  } catch (err) {
    console.error('Summary error:', err);
    res.status(500).json({ error: 'Failed to generate summary', message: 'An internal error occurred.' });
  }
});

/**
 * GET /api/activities/factors
 * Returns all available emission factors for frontend dropdowns.
 */
router.get('/factors', (req, res) => {
  res.json({ factors: getEmissionFactors() });
});

/**
 * DELETE /api/activities/:id
 * Deletes a specific activity log owned by the authenticated user.
 *
 * @param {number} id — Activity log ID
 * @returns {{ message: string }}
 */
router.delete(
  '/:id',
  [validators.idParam, handleValidationErrors],
  (req, res) => {
    try {
      const db = getDatabase();

      // Ensure the activity belongs to the authenticated user
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
      console.error('Activity delete error:', err);
      res.status(500).json({ error: 'Failed to delete activity', message: 'An internal error occurred.' });
    }
  }
);

module.exports = router;
