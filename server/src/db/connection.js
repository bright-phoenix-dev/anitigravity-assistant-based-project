const initSqlJs = require('sql.js');
const path = require('path');
const fs = require('fs');
let db = null;
let dbPath = null;
let saveTimer = null;
async function initDatabase() {
  if (db) return;
  const SQL = await initSqlJs();
  const rawPath = process.env.DB_PATH || './data/carbonwise.db';
  dbPath = path.resolve(__dirname, '../../', rawPath);
  const dir = path.dirname(dbPath);
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  if (fs.existsSync(dbPath)) {
    const fileBuffer = fs.readFileSync(dbPath);
    db = new SQL.Database(fileBuffer);
  } else {
    db = new SQL.Database();
  }
  db.run('PRAGMA foreign_keys = ON');
}
function saveDatabase() {
  if (!db || !dbPath) return;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => {
    try {
      const data = db.export();
      const buffer = Buffer.from(data);
      fs.writeFileSync(dbPath, buffer);
    } catch (err)
  }, 100);
}
function saveDatabaseSync() {
  if (!db || !dbPath) return;
  if (saveTimer) clearTimeout(saveTimer);
  try {
    const data = db.export();
    const buffer = Buffer.from(data);
    fs.writeFileSync(dbPath, buffer);
  } catch (err)
}
function getDatabase() {
  if (!db) {
    throw new Error('Database not initialized. Call initDatabase() first.');
  }
  return {
    prepare(sql) {
      return {
        get(...params) {
          try {
            const stmt = db.prepare(sql);
            stmt.bind(params.length === 1 && Array.isArray(params[0]) ? params[0] : params);
            if (stmt.step()) {
              const cols = stmt.getColumnNames();
              const values = stmt.get();
              const row = ;
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
        all(...params) {
          try {
            const stmt = db.prepare(sql);
            stmt.bind(params.length === 1 && Array.isArray(params[0]) ? params[0] : params);
            const rows = [];
            const cols = stmt.getColumnNames();
            while (stmt.step()) {
              const values = stmt.get();
              const row = ;
              cols.forEach((col, i) => { row[col] = values[i]; });
              rows.push(row);
            }
            stmt.free();
            return rows;
          } catch (err) {
            throw err;
          }
        },
        run(...params) {
          try {
            const stmt = db.prepare(sql);
            stmt.bind(params.length === 1 && Array.isArray(params[0]) ? params[0] : params);
            stmt.step();
            stmt.free();
            const changes = db.getRowsModified();
            const ridStmt = db.prepare('SELECT last_insert_rowid() as rid');
            ridStmt.step();
            const lastInsertRowid = ridStmt.get()[0];
            ridStmt.free();
            saveDatabase();
            return { changes, lastInsertRowid };
          } catch (err) {
            throw err;
          }
        },
      };
    },
    exec(sql) {
      db.run(sql);
      saveDatabase();
    },
    pragma(pragmaStr) {
      db.run(`PRAGMA ${pragmaStr}`);
    },
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
function closeDatabase() {
  if (db) {
    saveDatabaseSync();
    db.close();
    db = null;
  }
}
module.exports = { getDatabase, closeDatabase, initDatabase };
