/**
 * CarbonWise — Database Connection (SQLite via sql.js)
 *
 * Provides a singleton database connection using sql.js (pure JS/WASM).
 * This avoids native C++ compilation requirements of better-sqlite3.
 *
 * The database is loaded from disk on init and saved back on changes.
 * Provides a compatibility layer that matches the better-sqlite3 API.
 */

const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');

/** @type {Object | null} */
let db = null;
let dbPath = null;
let saveTimer = null;

/**
 * Initializes the database asynchronously (must be called once at startup).
 * @returns {Promise<void>}
 */
async function initDatabase() {
  if (db) return;

  const SQL = await initSqlJs();

  const rawPath = process.env.DB_PATH || './data/carbonwise.db';
  dbPath = path.resolve(__dirname, '../../', rawPath);
  const dir = path.dirname(dbPath);

  // Ensure directory exists
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }

  // Load existing database or create new one
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }

  // Enable foreign keys
  db.run('PRAGMA foreign_keys = ON');
}

/**
 * Saves the database to disk (debounced).
 */
function saveDatabase() {
  if (!db || !dbPath) return;

  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      const data = db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(dbPath, buffer);
    } catch (err) {
      console.error('Failed to save database:', err);
    }
  }, 100);
}

/**
 * Force-saves the database immediately (for shutdown).
 */
function saveDatabaseSync() {
  if (!db || !dbPath) return;
  if (saveTimer) clearTimeout(saveTimer);
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  } catch (err) {
    console.error('Failed to save database:', err);
  }
}

/**
 * Returns a wrapper around the raw sql.js database that provides
 * a better-sqlite3-compatible API (prepare/get/all/run).
 *
 * @returns {Object} Database wrapper with better-sqlite3-like API
 */
function getDatabase() {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }

  return {
    /**
     * Creates a prepared statement wrapper.
     * @param {string} sql - SQL query string
     * @returns {Object} Statement-like object with get/all/run methods
     */
    prepare(sql) {
      return {
        /**
         * Executes query and returns the first row.
         */
        get(...params) {
          try {
            const stmt = db.prepare(sql);
            stmt.bind(params.length === 1 && Array.isArray(params[0]) ? params[0] : params);
            if (stmt.step()) {
              const cols = stmt.getColumnNames();
              const values = stmt.get();
              const row = {};
              cols.forEach((col, i) => { row[col] = values[i]; });
              stmt.free();
              return row;
            }
            stmt.free();
            return undefined;
          } catch (err) {
            throw err;
          }
        },

        /**
         * Executes query and returns all rows.
         */
        all(...params) {
          try {
            const stmt = db.prepare(sql);
            stmt.bind(params.length === 1 && Array.isArray(params[0]) ? params[0] : params);
            const rows = [];
            const cols = stmt.getColumnNames();
            while (stmt.step()) {
              const values = stmt.get();
              const row = {};
              cols.forEach((col, i) => { row[col] = values[i]; });
              rows.push(row);
            }
            stmt.free();
            return rows;
          } catch (err) {
            throw err;
          }
        },

        /**
         * Executes a write query (INSERT/UPDATE/DELETE).
         * Returns { changes, lastInsertRowid }.
         */
        run(...params) {
          try {
            const stmt = db.prepare(sql);
            stmt.bind(params.length === 1 && Array.isArray(params[0]) ? params[0] : params);
            stmt.step();
            stmt.free();

            const changes = db.getRowsModified();
            // Get last insert rowid
            const ridStmt = db.prepare('SELECT last_insert_rowid() as rid');
            ridStmt.step();
            const lastInsertRowid = ridStmt.get()[0];
            ridStmt.free();

            // Auto-save after write operations
            saveDatabase();

            return { changes, lastInsertRowid };
          } catch (err) {
            throw err;
          }
        },
      };
    },

    /**
     * Executes raw SQL (for schema creation, multi-statement, etc.)
     */
    exec(sql) {
      db.run(sql);
      saveDatabase();
    },

    /**
     * Executes a PRAGMA statement.
     */
    pragma(pragmaStr) {
      db.run(`PRAGMA ${pragmaStr}`);
    },

    /**
     * Wraps operations in a transaction.
     */
    transaction(fn) {
      return (...args) => {
        db.run('BEGIN TRANSACTION');
        try {
          fn(...args);
          db.run('COMMIT');
          saveDatabase();
        } catch (err) {
          db.run('ROLLBACK');
          throw err;
        }
      };
    },
  };
}

/**
 * Closes the database connection gracefully.
 * Should be called during application shutdown.
 */
function closeDatabase() {
  if (db) {
    saveDatabaseSync();
    db.close();
    db = null;
  }
}

module.exports = { getDatabase, closeDatabase, initDatabase };
