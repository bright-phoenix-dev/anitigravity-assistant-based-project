/**
 * CarbonWise — Express Application Entry Point
 *
 * Configures and starts the Express server with all middleware,
 * security headers, rate limiting, and route mounting.
 */

require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');

const { initializeSchema } = require('./db/schema');
const { closeDatabase } = require('./db/connection');

// Route modules
const authRoutes = require('./routes/auth.routes');
const activityRoutes = require('./routes/activity.routes');
const habitsRoutes = require('./routes/habits.routes');
const chatRoutes = require('./routes/chat.routes');

const app = express();
const PORT = process.env.PORT || 3001;
const CLIENT_URL = process.env.FRONTEND_URL || process.env.CLIENT_URL || 'http://localhost:3000';

// ─── Security Middleware ──────────────────────────────────────────
app.use(helmet({
  contentSecurityPolicy: false, // Allow inline styles for development
  crossOriginEmbedderPolicy: false,
}));

// ─── CORS Configuration ──────────────────────────────────────────
app.use(cors({
  origin: CLIENT_URL,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));

// ─── Rate Limiting ────────────────────────────────────────────────
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 200, // Limit each IP to 200 requests per windowMs
  message: {
    error: 'Too many requests',
    message: 'Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20, // Stricter limit for auth endpoints
  message: {
    error: 'Too many authentication attempts',
    message: 'Please try again in 15 minutes.',
  },
});

// ─── Body Parsing ─────────────────────────────────────────────────
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));

// ─── Request Logging ──────────────────────────────────────────────
if (process.env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// ─── Database Initialization + Server Start ──────────────────
async function startServer() {
  await initializeSchema();

  // ─── API Routes ───────────────────────────────────────────────
  app.use('/api/auth', authLimiter, authRoutes);
  app.use('/api/activities', apiLimiter, activityRoutes);
  app.use('/api/habits', apiLimiter, habitsRoutes);
  app.use('/api/chat', apiLimiter, chatRoutes);

  // ─── Health Check ─────────────────────────────────────────────
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      service: 'CarbonWise API',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    });
  });

  // ─── 404 Handler ──────────────────────────────────────────────
  app.use((req, res) => {
    res.status(404).json({
      error: 'Not found',
      message: `The endpoint ${req.method} ${req.path} does not exist.`,
    });
  });

  // ─── Global Error Handler ─────────────────────────────────────
  app.use((err, req, res, next) => {
    console.error('Unhandled error:', err);
    res.status(500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development'
        ? err.message
        : 'An unexpected error occurred.',
    });
  });

  // ─── Start Server ─────────────────────────────────────────────
  if (process.env.NODE_ENV !== 'test') {
    app.listen(PORT, () => {
      console.log(`\n🌍 CarbonWise API running at http://localhost:${PORT}`);
      console.log(`📡 Accepting requests from ${CLIENT_URL}`);
      console.log(`🔑 Auth: POST /api/auth/register, POST /api/auth/login`);
      console.log(`📋 Activities: /api/activities`);
      console.log(`🔄 Habits: /api/habits`);
      console.log(`🤖 Chat: /api/chat\n`);
    });
  }
}

startServer().catch(err => {
  console.error('Failed to start CarbonWise API:', err);
  process.exit(1);
});

// ─── Graceful Shutdown ────────────────────────────────────────────
process.on('SIGINT', () => {
  console.log('\n🛑 Shutting down CarbonWise API...');
  closeDatabase();
  process.exit(0);
});

process.on('SIGTERM', () => {
  closeDatabase();
  process.exit(0);
});

module.exports = app; // Export for testing
