/**
 * CarbonWise — Chat Routes
 *
 * Handles AI assistant chat interactions.
 * Processes user messages through the AI pipeline and stores chat history.
 *
 * Routes:
 *   POST /api/chat          — Send a message to the AI assistant
 *   GET  /api/chat/history  — Retrieve chat history (paginated)
 *   POST /api/chat/action   — Execute an AI-suggested action
 */

const express = require('express');
const { body } = require('express-validator');
const { getDatabase } = require('../db/connection');
const { authenticate } = require('../middleware/auth');
const { handleValidationErrors, validators } = require('../middleware/validate');
const { generateResponse } = require('../ai/response-generator');
const { buildUserContext } = require('../ai/context-builder');
const { evaluateRules } = require('../ai/rules-engine');

const router = express.Router();

// All routes require authentication
router.use(authenticate);

/**
 * POST /api/chat
 * Processes a user message through the AI assistant pipeline.
 *
 * @body {string} message — The user's chat message
 * @returns {{ assistant: object, user_message: object }}
 */
router.post(
  '/',
  [
    body('message')
      .trim()
      .notEmpty()
      .withMessage('Message is required')
      .isLength({ max: 2000 })
      .withMessage('Message must be 2000 characters or less'),
    handleValidationErrors,
  ],
  (req, res) => {
    try {
      const { message } = req.body;
      const db = getDatabase();

      // Store user message
      const userMsg = db.prepare(`
        INSERT INTO chat_history (user_id, role, content)
        VALUES (?, 'user', ?)
      `).run(req.user.id, message);

      // Generate AI response
      const aiResult = generateResponse(req.user.id, message);

      // Build full response text including insights
      let fullResponse = aiResult.response;
      if (aiResult.insights && aiResult.insights.length > 0) {
        fullResponse += '\n\n---\n\n' + aiResult.insights
          .map(i => i.message)
          .join('\n\n');
      }

      // Collect all actions (from response + insights)
      const allActions = [
        ...aiResult.actions,
        ...aiResult.insights.flatMap(i => i.actions || []),
      ];

      // Store assistant response
      const actionPayload = allActions.length > 0
        ? JSON.stringify(allActions)
        : null;

      db.prepare(`
        INSERT INTO chat_history (user_id, role, content, action_payload)
        VALUES (?, 'assistant', ?, ?)
      `).run(req.user.id, fullResponse, actionPayload);

      res.json({
        user_message: {
          id: userMsg.lastInsertRowid,
          role: 'user',
          content: message,
        },
        assistant: {
          role: 'assistant',
          content: fullResponse,
          actions: allActions,
          intent: aiResult.intent,
          confidence: aiResult.confidence,
        },
      });
    } catch (err) {
      console.error('Chat error:', err);
      res.status(500).json({
        error: 'Chat processing failed',
        message: 'An error occurred while processing your message.',
      });
    }
  }
);

/**
 * GET /api/chat/history
 * Retrieves paginated chat history for the authenticated user.
 *
 * @query {number} [limit=50]  — Messages per page
 * @query {number} [offset=0]  — Pagination offset
 * @returns {{ messages: array, total: number }}
 */
router.get(
  '/history',
  [validators.paginationLimit, validators.paginationOffset, handleValidationErrors],
  (req, res) => {
    try {
      const db = getDatabase();
      const limit = req.query.limit || 50;
      const offset = req.query.offset || 0;

      const total = db.prepare(
        'SELECT COUNT(*) as count FROM chat_history WHERE user_id = ?'
      ).get(req.user.id).count;

      const messages = db.prepare(`
        SELECT id, role, content, action_payload, created_at
        FROM chat_history
        WHERE user_id = ?
        ORDER BY created_at ASC
        LIMIT ? OFFSET ?
      `).all(req.user.id, limit, offset);

      // Parse action payloads
      const parsed = messages.map(msg => ({
        ...msg,
        actions: msg.action_payload ? JSON.parse(msg.action_payload) : [],
        action_payload: undefined,
      }));

      res.json({ messages: parsed, total, limit, offset });
    } catch (err) {
      console.error('Chat history error:', err);
      res.status(500).json({
        error: 'Failed to fetch chat history',
        message: 'An internal error occurred.',
      });
    }
  }
);

/**
 * POST /api/chat/action
 * Executes an AI-suggested action on behalf of the user.
 * Supports: add_habit, set_goal, confirm_log
 *
 * @body {string} action_type — Type of action to execute
 * @body {object} data        — Action-specific data
 * @returns {{ success: boolean, result: object }}
 */
router.post(
  '/action',
  [
    body('action_type')
      .trim()
      .notEmpty()
      .isIn(['add_habit', 'set_goal', 'confirm_log'])
      .withMessage('Invalid action type'),
    body('data')
      .isObject()
      .withMessage('Action data must be an object'),
    handleValidationErrors,
  ],
  (req, res) => {
    try {
      const { action_type, data } = req.body;
      const db = getDatabase();

      let result;

      switch (action_type) {
        case 'add_habit': {
          const { name, category } = data;
          if (!name || !category) {
            return res.status(400).json({ error: 'Habit name and category are required' });
          }

          // Check for duplicate
          const existing = db.prepare(
            'SELECT id FROM habits WHERE user_id = ? AND name = ? AND is_active = 1'
          ).get(req.user.id, name);

          if (existing) {
            return res.status(409).json({
              error: 'Habit already exists',
              message: `You already have an active "${name}" habit.`,
            });
          }

          const insert = db.prepare(`
            INSERT INTO habits (user_id, name, category, frequency, estimated_savings_kg)
            VALUES (?, ?, ?, 'daily', ?)
          `).run(req.user.id, name, category, data.estimated_savings_kg || 10);

          result = db.prepare('SELECT * FROM habits WHERE id = ?')
            .get(insert.lastInsertRowid);
          break;
        }

        case 'set_goal': {
          const { goal_kg } = data;
          if (!goal_kg || goal_kg < 1 || goal_kg > 10000) {
            return res.status(400).json({ error: 'Goal must be between 1 and 10000 kg' });
          }

          db.prepare('UPDATE users SET monthly_goal_kg = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ?')
            .run(goal_kg, req.user.id);

          result = db.prepare(
            'SELECT id, email, name, region, monthly_goal_kg FROM users WHERE id = ?'
          ).get(req.user.id);
          break;
        }

        case 'confirm_log': {
          const { category, activity_type, quantity } = data;
          if (!category || !activity_type || quantity == null) {
            return res.status(400).json({ error: 'Category, activity_type, and quantity are required' });
          }

          const { calculateCarbon } = require('../utils/carbon-calculator');
          const calc = calculateCarbon(category, activity_type, quantity);

          const insert = db.prepare(`
            INSERT INTO activity_logs (user_id, category, activity_type, quantity, unit, carbon_kg, log_date)
            VALUES (?, ?, ?, ?, ?, ?, date('now'))
          `).run(req.user.id, category, activity_type, quantity, calc.unit, calc.carbon_kg);

          result = db.prepare('SELECT * FROM activity_logs WHERE id = ?')
            .get(insert.lastInsertRowid);
          break;
        }
      }

      // Store confirmation message in chat
      const confirmMsg = action_type === 'add_habit'
        ? `✅ Done! I've added "${result.name}" to your habits tracker.`
        : action_type === 'set_goal'
          ? `✅ Your monthly goal has been updated to ${result.monthly_goal_kg} kg CO₂.`
          : `✅ Logged ${result.carbon_kg.toFixed(2)} kg CO₂ from ${result.activity_type}.`;

      db.prepare(`
        INSERT INTO chat_history (user_id, role, content)
        VALUES (?, 'assistant', ?)
      `).run(req.user.id, confirmMsg);

      res.json({ success: true, result, message: confirmMsg });
    } catch (err) {
      console.error('Chat action error:', err);
      res.status(500).json({
        error: 'Action failed',
        message: 'An error occurred while executing the action.',
      });
    }
  }
);

/**
 * GET /api/chat/insights
 * Returns proactive AI insights without requiring a user message.
 * Useful for dashboard insight cards.
 *
 * @returns {{ insights: array }}
 */
router.get('/insights', (req, res) => {
  try {
    const context = buildUserContext(req.user.id);
    const insights = evaluateRules(context, 3);

    res.json({
      insights: insights.map(i => ({
        id: i.id,
        priority: i.priority,
        message: i.message,
        actions: i.actions,
      })),
    });
  } catch (err) {
    console.error('Insights error:', err);
    res.status(500).json({ error: 'Failed to generate insights' });
  }
});

module.exports = router;
