const request = require('supertest');
const path = require('path');
process.env.NODE_ENV = 'test';
process.env.DB_PATH = process.env.TEST_DB_PATH || './data/test-carbonwise.db';
process.env.JWT_SECRET = process.env.TEST_JWT_SECRET || require('crypto').randomBytes(32).toString('hex');
const app = require('../src/index');
const { getDatabase, closeDatabase, initDatabase } = require('../src/db/connection');
let authToken;
let userId;
let originalEnv;
beforeEach(() => {
  originalEnv = { ...process.env };
});
afterEach(() => {
  process.env = { ...originalEnv };
});
beforeAll(async () => {
  await initDatabase();
  const db = getDatabase();
  db.exec('DELETE FROM chat_history');
  db.exec('DELETE FROM habits');
  db.exec('DELETE FROM activity_logs');
  db.exec('DELETE FROM users');
});
afterAll(() => {
  const db = getDatabase();
  db.exec('DELETE FROM chat_history');
  db.exec('DELETE FROM habits');
  db.exec('DELETE FROM activity_logs');
  db.exec('DELETE FROM users');
  closeDatabase();
  const fs = require('fs');
  const dbPath = path.resolve(__dirname, '../data/test-carbonwise.db');
  if (fs.existsSync(dbPath)) {
    fs.unlinkSync(dbPath);
  }
  const walPath = dbPath + '-wal';
  const shmPath = dbPath + '-shm';
  if (fs.existsSync(walPath)) fs.unlinkSync(walPath);
  if (fs.existsSync(shmPath)) fs.unlinkSync(shmPath);
});
describe('Auth API', () => {
  describe('POST /api/auth/register', () => {
    test('registers a new user successfully', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@carbonwise.com',
          password: 'password123',
          name: 'Test User',
          region: 'Europe',
        })
        .expect(201);
      expect(res.body).toHaveProperty('token');
      expect(res.body).toHaveProperty('user');
      expect(res.body.user.email).toBe('test@carbonwise.com');
      expect(res.body.user.name).toBe('Test User');
      expect(res.body.user.region).toBe('Europe');
      expect(res.body.user).not.toHaveProperty('password_hash');
      authToken = res.body.token;
      userId = res.body.user.id;
    });
    test('rejects duplicate email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'test@carbonwise.com',
          password: 'password123',
          name: 'Duplicate User',
        })
        .expect(409);
      expect(res.body.error).toBe('Email already registered');
    });
    test('rejects invalid email', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'not-an-email',
          password: 'password123',
          name: 'Bad Email User',
        })
        .expect(400);
      expect(res.body.error).toBe('Validation failed');
    });
    test('rejects short password', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'short@test.com',
          password: '123',
          name: 'Short Pass User',
        })
        .expect(400);
      expect(res.body.error).toBe('Validation failed');
    });
  });
  describe('POST /api/auth/login', () => {
    test('logs in with valid credentials', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@carbonwise.com',
          password: 'password123',
        })
        .expect(200);
      expect(res.body).toHaveProperty('token');
      expect(res.body.user.email).toBe('test@carbonwise.com');
    });
    test('rejects wrong password', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'test@carbonwise.com',
          password: 'wrongpassword',
        })
        .expect(401);
    });
    test('rejects non-existent user', async () => {
      await request(app)
        .post('/api/auth/login')
        .send({
          email: 'nobody@test.com',
          password: 'password123',
        })
        .expect(401);
    });
  });
  describe('GET /api/auth/me', () => {
    test('returns current user with valid token', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      expect(res.body.user.email).toBe('test@carbonwise.com');
    });
    test('rejects request without token', async () => {
      await request(app)
        .get('/api/auth/me')
        .expect(401);
    });
  });
  describe('PUT /api/auth/profile', () => {
    test('updates user profile', async () => {
      const res = await request(app)
        .put('/api/auth/profile')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ name: 'Updated Name', monthly_goal_kg: 150 })
        .expect(200);
      expect(res.body.user.name).toBe('Updated Name');
      expect(res.body.user.monthly_goal_kg).toBe(150);
    });
  });
});
describe('Activities API', () => {
  let activityId;
  describe('POST /api/activities', () => {
    test('logs a transport activity with auto-calculation', async () => {
      const res = await request(app)
        .post('/api/activities')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          category: 'transport',
          activity_type: 'car_gasoline',
          quantity: 50,
          log_date: new Date().toISOString().split('T')[0],
          notes: 'Commute to work',
        })
        .expect(201);
      expect(res.body.activity).toBeDefined();
      expect(res.body.activity.carbon_kg).toBe(10.5);
      expect(res.body.activity.category).toBe('transport');
      expect(res.body.calculation.factor_used).toBe(0.21);
      activityId = res.body.activity.id;
    });
    test('logs a food activity', async () => {
      const res = await request(app)
        .post('/api/activities')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          category: 'food',
          activity_type: 'red_meat',
          quantity: 2,
        })
        .expect(201);
      expect(res.body.activity.carbon_kg).toBe(13.22);
    });
    test('rejects invalid category', async () => {
      await request(app)
        .post('/api/activities')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          category: 'invalid',
          activity_type: 'test',
          quantity: 10,
        })
        .expect(400);
    });
    test('rejects negative quantity', async () => {
      await request(app)
        .post('/api/activities')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          category: 'transport',
          activity_type: 'car_gasoline',
          quantity: -10,
        })
        .expect(400);
    });
  });
  describe('GET /api/activities', () => {
    test('lists user activities', async () => {
      const res = await request(app)
        .get('/api/activities')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      expect(Array.isArray(res.body.activities)).toBe(true);
      expect(res.body.activities.length).toBeGreaterThan(0);
      expect(res.body).toHaveProperty('total');
    });
  });
  describe('GET /api/activities/summary', () => {
    test('returns monthly summary', async () => {
      const res = await request(app)
        .get('/api/activities/summary?period=month')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      expect(res.body.summary).toBeDefined();
      expect(res.body.summary.total_kg).toBeGreaterThan(0);
      expect(res.body.summary).toHaveProperty('by_category');
      expect(res.body.summary).toHaveProperty('daily_breakdown');
      expect(res.body.summary).toHaveProperty('goal_progress_percent');
    });
  });
  describe('GET /api/activities/factors', () => {
    test('returns emission factors', async () => {
      const res = await request(app)
        .get('/api/activities/factors')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      expect(res.body.factors).toHaveProperty('transport');
      expect(res.body.factors).toHaveProperty('energy');
      expect(res.body.factors).toHaveProperty('food');
    });
  });
  describe('DELETE /api/activities/:id', () => {
    test('deletes an activity', async () => {
      await request(app)
        .delete(`/api/activities/${activityId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });
    test('returns 404 for non-existent activity', async () => {
      await request(app)
        .delete('/api/activities/99999')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(404);
    });
  });
});
describe('Habits API', () => {
  let habitId;
  describe('POST /api/habits', () => {
    test('creates a new habit', async () => {
      const res = await request(app)
        .post('/api/habits')
        .set('Authorization', `Bearer ${authToken}`)
        .send({
          name: 'Meatless Monday',
          category: 'food',
          frequency: 'weekly',
          estimated_savings_kg: 24.4,
        })
        .expect(201);
      expect(res.body.habit.name).toBe('Meatless Monday');
      expect(res.body.habit.category).toBe('food');
      expect(res.body.habit.is_active).toBe(1);
      expect(res.body.habit.streak_days).toBe(0);
      habitId = res.body.habit.id;
    });
  });
  describe('GET /api/habits', () => {
    test('lists user habits', async () => {
      const res = await request(app)
        .get('/api/habits')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      expect(Array.isArray(res.body.habits)).toBe(true);
      expect(res.body.habits.length).toBeGreaterThan(0);
      expect(res.body).toHaveProperty('templates');
    });
  });
  describe('PUT /api/habits/:id', () => {
    test('completes a habit and starts streak', async () => {
      const res = await request(app)
        .put(`/api/habits/${habitId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ complete: true })
        .expect(200);
      expect(res.body.habit.streak_days).toBe(1);
      expect(res.body.habit.last_completed).toBeDefined();
    });
    test('toggles habit to inactive', async () => {
      const res = await request(app)
        .put(`/api/habits/${habitId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .send({ is_active: false })
        .expect(200);
      expect(res.body.habit.is_active).toBe(0);
    });
  });
  describe('DELETE /api/habits/:id', () => {
    test('deletes a habit', async () => {
      await request(app)
        .delete(`/api/habits/${habitId}`)
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
    });
  });
});
describe('Chat API', () => {
  describe('POST /api/chat', () => {
    test('processes a greeting message', async () => {
      const res = await request(app)
        .post('/api/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ message: 'Hello!' })
        .expect(200);
      expect(res.body.assistant).toBeDefined();
      expect(res.body.assistant.content).toBeTruthy();
      expect(res.body.assistant.intent).toBe('greeting');
      expect(res.body.user_message.content).toBe('Hello!');
    });
    test('processes a score check message', async () => {
      const res = await request(app)
        .post('/api/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ message: 'What is my carbon score?' })
        .expect(200);
      expect(res.body.assistant.intent).toBe('check_score');
      expect(res.body.assistant.content).toBeTruthy();
    });
    test('processes a tips request', async () => {
      const res = await request(app)
        .post('/api/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ message: 'How can I reduce my carbon footprint?' })
        .expect(200);
      expect(res.body.assistant.intent).toBe('get_tips');
    });
    test('rejects empty message', async () => {
      await request(app)
        .post('/api/chat')
        .set('Authorization', `Bearer ${authToken}`)
        .send({ message: '' })
        .expect(400);
    });
  });
  describe('GET /api/chat/history', () => {
    test('returns chat history', async () => {
      const res = await request(app)
        .get('/api/chat/history')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      expect(Array.isArray(res.body.messages)).toBe(true);
      expect(res.body.messages.length).toBeGreaterThan(0);
    });
  });
  describe('GET /api/chat/insights', () => {
    test('returns AI insights', async () => {
      const res = await request(app)
        .get('/api/chat/insights')
        .set('Authorization', `Bearer ${authToken}`)
        .expect(200);
      expect(Array.isArray(res.body.insights)).toBe(true);
    });
  });
});
describe('Health Check', () => {
  test('GET /api/health returns healthy status', async () => {
    const res = await request(app)
      .get('/api/health')
      .expect(200);
    expect(res.body.status).toBe('healthy');
    expect(res.body.service).toBe('CarbonWise API');
  });
});
describe('Error Handling', () => {
  test('returns 404 for unknown endpoints', async () => {
    const res = await request(app)
      .get('/api/nonexistent')
      .expect(404);
    expect(res.body.error).toBe('Not found');
  });
});
