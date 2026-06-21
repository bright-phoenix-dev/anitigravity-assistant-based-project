const { getDatabase, initDatabase } = require('./connection');
async function initializeSchema() {
  await initDatabase();
  const db = getDatabase();
  const migrate = db.transaction(() => {
    db.exec(`
      CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL COLLATE NOCASE,
        password_hash TEXT NOT NULL,
        name TEXT NOT NULL,
        region TEXT DEFAULT 'Global',
        monthly_goal_kg REAL DEFAULT 200.0,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )
    `);
    db.exec(`
      CREATE TABLE IF NOT EXISTS activity_logs (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        category TEXT NOT NULL,
        activity_type TEXT NOT NULL,
        quantity REAL NOT NULL CHECK (quantity >= 0),
        unit TEXT NOT NULL,
        carbon_kg REAL NOT NULL CHECK (carbon_kg >= 0),
        notes TEXT DEFAULT '',
        log_date DATE NOT NULL DEFAULT (date('now')),
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    db.exec(`
      CREATE TABLE IF NOT EXISTS habits (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        frequency TEXT NOT NULL DEFAULT 'daily',
        estimated_savings_kg REAL DEFAULT 0.0,
        is_active INTEGER DEFAULT 1,
        streak_days INTEGER DEFAULT 0,
        last_completed DATE,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    db.exec(`
      CREATE TABLE IF NOT EXISTS chat_history (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        user_id INTEGER NOT NULL,
        role TEXT NOT NULL CHECK (role IN ('user', 'assistant')),
        content TEXT NOT NULL,
        action_payload TEXT DEFAULT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      )
    `);
    db.exec(`
      CREATE INDEX IF NOT EXISTS idx_activity_user_date
        ON activity_logs(user_id, log_date);
      CREATE INDEX IF NOT EXISTS idx_activity_category
        ON activity_logs(user_id, category);
      CREATE INDEX IF NOT EXISTS idx_habits_user
        ON habits(user_id, is_active);
      CREATE INDEX IF NOT EXISTS idx_chat_user_created
        ON chat_history(user_id, created_at);
    `);
  });
  migrate();
}
module.exports = { initializeSchema };
