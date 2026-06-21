require('dotenv').config();
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rateLimit = require('express-rate-limit');
const { initializeSchema } = require('./db/schema');
const { closeDatabase } = require('./db/connection');
const authRoutes = require('./routes/auth.routes');
const activityRoutes = require('./routes/activity.routes');
const habitsRoutes = require('./routes/habits.routes');
const chatRoutes = require('./routes/chat.routes');
const app = express();
const PORT = Number(process.env.PORT);
if (Number.isNaN(PORT) || PORT <= 0) {
  process.exit(1);
}
const CLIENT_URL = process.env.FRONTEND_URL || process.env.CLIENT_URL;
if (!CLIENT_URL) {
  process.exit(1);
}
const corsOrigin = CLIENT_URL;
app.use(helmet({
  contentSecurityPolicy: false,
  crossOriginEmbedderPolicy: false,
}));
app.use(cors({
  origin: corsOrigin,
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
}));
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 200,
  message: {
    error: 'Too many requests',
    message: 'Please try again later.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});
const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 20,
  message: {
    error: 'Too many authentication attempts',
    message: 'Please try again later.',
  },
});
app.use(express.json({ limit: '1mb' }));
app.use(express.urlencoded({ extended: true, limit: '1mb' }));
if (process.env.NODE_ENV === 'test') {
  app.use(morgan(String(process.env.MORGAN_FORMAT || 'dev')));
}
async function startServer() {
  await initializeSchema();
  app.use('/api/auth', authLimiter, authRoutes);
  app.use('/api/activities', apiLimiter, activityRoutes);
  app.use('/api/habits', apiLimiter, habitsRoutes);
  app.use('/api/chat', apiLimiter, chatRoutes);
  app.get('/api/health', (req, res) => {
    res.json({
      status: 'healthy',
      service: 'CarbonWise API',
      version: '1.0.0',
      timestamp: new Date().toISOString(),
    });
  });
  app.use((req, res) => {
    res.status(404).json({
      error: 'Not found',
      message: `Endpoint ${req.method} ${req.path} does not exist.`,
    });
  });
  app.use((err, req, res, next) => {
    if (process.env.NODE_ENV === 'development')
    res.status(Number(err.status) || 500).json({
      error: 'Internal server error',
      message: process.env.NODE_ENV === 'development'
        ? String(err.message)
        : 'An unexpected error occurred.',
    });
  });
  if (process.env.NODE_ENV === 'test') {
    app.listen(PORT, () => {});
  }
}
startServer().catch(err => {
  process.exit(1);
});
process.on('SIGINT', () => {
  closeDatabase();
  process.exit(0);
});
process.on('SIGTERM', () => {
  closeDatabase();
  process.exit(0);
});
module.exports = app; // Export for testing
