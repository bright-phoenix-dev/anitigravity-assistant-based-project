/**
 * CarbonWise — JWT Authentication Middleware
 *
 * Verifies the JSON Web Token from the Authorization header,
 * decodes the payload, and attaches the user object to `req.user`.
 * Returns 401 for missing/invalid tokens.
 */

const jwt = require('jsonwebtoken');
const { getDatabase } = require('../db/connection');

const JWT_SECRET = process.env.JWT_SECRET || 'carbonwise-dev-secret-change-in-production';

/**
 * Express middleware that authenticates requests via JWT.
 *
 * Expected header format: Authorization: Bearer <token>
 *
 * On success, attaches `req.user` with:
 *   - id: number
 *   - email: string
 *   - name: string
 *   - region: string
 *   - monthly_goal_kg: number
 */
function authenticate(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      error: 'Authentication required',
      message: 'Please provide a valid Bearer token in the Authorization header.',
    });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, JWT_SECRET);

    // Fetch fresh user data to ensure account still exists and data is current
    const db = getDatabase();
    const user = db
      .prepare('SELECT id, email, name, region, monthly_goal_kg, created_at FROM users WHERE id = ?')
      .get(decoded.userId);

    if (!user) {
      return res.status(401).json({
        error: 'User not found',
        message: 'The account associated with this token no longer exists.',
      });
    }

    req.user = user;
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({
        error: 'Token expired',
        message: 'Your session has expired. Please log in again.',
      });
    }

    return res.status(401).json({
      error: 'Invalid token',
      message: 'The provided authentication token is invalid.',
    });
  }
}

/**
 * Generates a signed JWT for the given user ID.
 *
 * @param {number} userId - The user's database ID
 * @returns {string} Signed JWT string
 */
function generateToken(userId) {
  return jwt.sign(
    { userId },
    JWT_SECRET,
    { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
  );
}

module.exports = { authenticate, generateToken, JWT_SECRET };
