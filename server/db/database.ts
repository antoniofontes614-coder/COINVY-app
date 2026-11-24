import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';

const dataDir = path.resolve(__dirname, '../../data');
if (!fs.existsSync(dataDir)) {
  fs.mkdirSync(dataDir, { recursive: true });
}

const dbPath = path.join(dataDir, 'nexo_finance.db');
export const db = new Database(dbPath);

// Enable WAL mode and foreign keys for high performance and integrity
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      currency TEXT DEFAULT 'BRL',
      date_format TEXT DEFAULT 'DD/MM/YYYY',
      hide_balances INTEGER DEFAULT 0,
      theme TEXT DEFAULT 'light',
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS accounts (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL, -- checking, cash, savings, credit_card, investment
      color TEXT NOT NULL,
      icon TEXT NOT NULL,
      initial_balance REAL DEFAULT 0.0,
      current_balance REAL DEFAULT 0.0,
      is_active INTEGER DEFAULT 1,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      type TEXT NOT NULL, -- income, expense
      icon TEXT NOT NULL,
      color TEXT NOT NULL,
      is_default INTEGER DEFAULT 0,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL, -- income, expense, transfer
      amount REAL NOT NULL,
      description TEXT NOT NULL,
      category_id TEXT,
      account_id TEXT NOT NULL,
      destination_account_id TEXT,
      date TEXT NOT NULL, -- YYYY-MM-DD
      notes TEXT,
      is_recurring INTEGER DEFAULT 0,
      recurring_rule_id TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE,
      FOREIGN KEY (destination_account_id) REFERENCES accounts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS recurring_rules (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      type TEXT NOT NULL, -- income, expense, transfer
      amount REAL NOT NULL,
      description TEXT NOT NULL,
      category_id TEXT,
      account_id TEXT NOT NULL,
      destination_account_id TEXT,
      frequency TEXT NOT NULL, -- weekly, monthly, yearly
      start_date TEXT NOT NULL,
      end_date TEXT,
      next_due_date TEXT NOT NULL,
      last_processed_date TEXT,
      is_active INTEGER DEFAULT 1,
      notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL,
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS budgets (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      category_id TEXT, -- NULL for general budget
      monthly_limit REAL NOT NULL,
      month TEXT NOT NULL, -- e.g. '2026-11' or 'global'
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
      FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS goals (
      id TEXT PRIMARY KEY,
      user_id TEXT NOT NULL,
      name TEXT NOT NULL,
      target_amount REAL NOT NULL,
      current_amount REAL DEFAULT 0.0,
      deadline TEXT,
      icon TEXT NOT NULL,
      color TEXT NOT NULL,
      created_at TEXT NOT NULL,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS goal_contributions (
      id TEXT PRIMARY KEY,
      goal_id TEXT NOT NULL,
      user_id TEXT NOT NULL,
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      notes TEXT,
      created_at TEXT NOT NULL,
      FOREIGN KEY (goal_id) REFERENCES goals(id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
    );

    CREATE INDEX IF NOT EXISTS idx_tx_user_date ON transactions(user_id, date);
    CREATE INDEX IF NOT EXISTS idx_tx_account ON transactions(account_id);
    CREATE INDEX IF NOT EXISTS idx_tx_category ON transactions(category_id);
    CREATE INDEX IF NOT EXISTS idx_recurring_user ON recurring_rules(user_id, is_active);
    CREATE INDEX IF NOT EXISTS idx_budgets_user ON budgets(user_id, month);
    CREATE INDEX IF NOT EXISTS idx_goals_user ON goals(user_id);
  `);
}

/**
 * Recomputes the exact balance of an account from its initial balance
 * and all its transactions (incomes, expenses, and incoming/outgoing transfers).
 */
export function recalculateAccountBalance(accountId: string): number {
  const account = db.prepare('SELECT initial_balance FROM accounts WHERE id = ?').get(accountId) as { initial_balance: number } | undefined;
  if (!account) return 0;

  const incomeRow = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total FROM transactions
    WHERE account_id = ? AND type = 'income'
  `).get(accountId) as { total: number };

  const expenseRow = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total FROM transactions
    WHERE account_id = ? AND type = 'expense'
  `).get(accountId) as { total: number };

  const transferOutRow = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total FROM transactions
    WHERE account_id = ? AND type = 'transfer'
  `).get(accountId) as { total: number };

  const transferInRow = db.prepare(`
    SELECT COALESCE(SUM(amount), 0) as total FROM transactions
    WHERE destination_account_id = ? AND type = 'transfer'
  `).get(accountId) as { total: number };

  const exactBalance = Number(
    (account.initial_balance + incomeRow.total - expenseRow.total - transferOutRow.total + transferInRow.total).toFixed(2)
  );

  db.prepare('UPDATE accounts SET current_balance = ? WHERE id = ?').run(exactBalance, accountId);
  return exactBalance;
}
