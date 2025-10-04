const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const bcrypt = require('bcryptjs');

class Database {
  constructor() {
    this.db = null;
  }

  async initialize() {
    return new Promise(async (resolve, reject) => {
      this.db = new sqlite3.Database(path.join(__dirname, 'helpdesk.sqlite'), async (err) => {
        if (err) {
          reject(err);
        } else {
          try {
            await this.createTables();
            await this.runMigrations();
            console.log('Connected to SQLite database');
            resolve();
          } catch (error) {
            console.error('Database connection error:', error);
            reject(error);
          }
        }
      });
    });
  }

  async createTables() {
    const tables = [
      // Users table
      `CREATE TABLE IF NOT EXISTS users (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        email TEXT UNIQUE NOT NULL,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        role TEXT NOT NULL DEFAULT 'user',
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
      )`,

      // Tickets table
      `CREATE TABLE IF NOT EXISTS tickets (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        description TEXT NOT NULL,
        category TEXT DEFAULT 'general',
        status TEXT DEFAULT 'open',
        priority TEXT DEFAULT 'medium',
        sla_deadline DATETIME,
        assigned_to INTEGER,
        created_by INTEGER NOT NULL,
        version INTEGER DEFAULT 1,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (assigned_to) REFERENCES users (id),
        FOREIGN KEY (created_by) REFERENCES users (id)
      )`,

      // Comments table
      `CREATE TABLE IF NOT EXISTS comments (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticket_id INTEGER NOT NULL,
        user_id INTEGER NOT NULL,
        content TEXT NOT NULL,
        parent_id INTEGER,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (ticket_id) REFERENCES tickets (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users (id),
        FOREIGN KEY (parent_id) REFERENCES comments (id)
      )`,

      // Timeline table for audit logs
      `CREATE TABLE IF NOT EXISTS timeline (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        ticket_id INTEGER NOT NULL,
        user_id INTEGER,
        action TEXT NOT NULL,
        old_value TEXT,
        new_value TEXT,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (ticket_id) REFERENCES tickets (id) ON DELETE CASCADE,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )`,

      // Idempotency keys table
      `CREATE TABLE IF NOT EXISTS idempotency_keys (
        key TEXT PRIMARY KEY,
        user_id INTEGER NOT NULL,
        response TEXT NOT NULL,
        created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
        FOREIGN KEY (user_id) REFERENCES users (id)
      )`
    ];

    for (const table of tables) {
      await this.run(table);
    }

    // Create indexes
    const indexes = [
      'CREATE INDEX IF NOT EXISTS idx_tickets_status ON tickets(status)',
      'CREATE INDEX IF NOT EXISTS idx_tickets_created_by ON tickets(created_by)',
      'CREATE INDEX IF NOT EXISTS idx_tickets_assigned_to ON tickets(assigned_to)',
      'CREATE INDEX IF NOT EXISTS idx_tickets_sla_deadline ON tickets(sla_deadline)',
      'CREATE INDEX IF NOT EXISTS idx_comments_ticket_id ON comments(ticket_id)',
      'CREATE INDEX IF NOT EXISTS idx_timeline_ticket_id ON timeline(ticket_id)',
      'CREATE INDEX IF NOT EXISTS idx_idempotency_keys_user_id ON idempotency_keys(user_id)'
    ];

    for (const index of indexes) {
      await this.run(index);
    }

    // Create default users if they don't exist
    await this.createDefaultUsers();
  }

  async createDefaultUsers() {
    const users = [
      {
        email: 'admin@helpdesk.com',
        password: 'admin123',
        name: 'Admin User',
        role: 'admin'
      },
      {
        email: 'agent@helpdesk.com',
        password: 'agent123',
        name: 'Agent User',
        role: 'agent'
      },
      {
        email: 'user@helpdesk.com',
        password: 'user123',
        name: 'Regular User',
        role: 'user'
      }
    ];

    for (const user of users) {
      const existing = await this.get('SELECT id FROM users WHERE email = ?', [user.email]);
      if (!existing) {
        const hashedPassword = await bcrypt.hash(user.password, 10);
        await this.run(
          'INSERT INTO users (email, password, name, role) VALUES (?, ?, ?, ?)',
          [user.email, hashedPassword, user.name, user.role]
        );
        console.log(`Created default user: ${user.email}`);
      }
    }
  }

  async runMigrations() {
    // Check if category column exists, if not add it
    try {
      const result = await this.all("PRAGMA table_info(tickets)");
      const hasCategory = result.some(col => col.name === 'category');
      
      if (!hasCategory) {
        await this.run("ALTER TABLE tickets ADD COLUMN category TEXT DEFAULT 'general'");
        console.log('Added category column to tickets table');
      }
    } catch (error) {
      console.log('Migration check completed');
    }
  }

  async run(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.run(sql, params, function(err) {
        if (err) {
          reject(err);
        } else {
          resolve({ id: this.lastID, changes: this.changes });
        }
      });
    });
  }

  async get(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.get(sql, params, (err, result) => {
        if (err) {
          reject(err);
        } else {
          resolve(result);
        }
      });
    });
  }

  async all(sql, params = []) {
    return new Promise((resolve, reject) => {
      this.db.all(sql, params, (err, rows) => {
        if (err) {
          reject(err);
        } else {
          resolve(rows);
        }
      });
    });
  }

  close() {
    return new Promise((resolve, reject) => {
      this.db.close((err) => {
        if (err) {
          reject(err);
        } else {
          resolve();
        }
      });
    });
  }
}

module.exports = Database;