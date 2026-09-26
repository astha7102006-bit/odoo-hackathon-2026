const { DatabaseSync } = require('node:sqlite');
const path = require('node:path');
const fs = require('node:fs');

/**
 * Initializes and returns a SQLite database connection.
 * Supports file-based database for persistence, or in-memory for testing.
 *
 * @param {string} [dbPath] - Optional custom path or ':memory:'
 * @returns {DatabaseSync} Connected SQLite database instance
 */
function getDatabase(dbPath) {
  const resolvedPath = dbPath || process.env.DB_PATH || path.join(__dirname, '..', '..', 'stocksense.db');

  // Ensure directory exists if using file path
  if (resolvedPath !== ':memory:') {
    const dir = path.dirname(resolvedPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  const db = new DatabaseSync(resolvedPath);

  // Enable WAL mode and foreign keys for performance and data integrity
  if (resolvedPath !== ':memory:') {
    db.exec('PRAGMA journal_mode = WAL;');
  }
  db.exec('PRAGMA foreign_keys = ON;');

  // Initialize database schema
  initSchema(db);

  return db;
}

/**
 * Creates required tables if they don't already exist.
 *
 * @param {DatabaseSync} db
 */
function initSchema(db) {
  db.exec(`
    -- Categories table
    CREATE TABLE IF NOT EXISTS categories (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL UNIQUE
    );

    -- Products master catalog
    CREATE TABLE IF NOT EXISTS products (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      sku TEXT NOT NULL UNIQUE,
      uom TEXT NOT NULL DEFAULT 'kg',
      category_id TEXT REFERENCES categories(id),
      reorder_level REAL NOT NULL DEFAULT 20
    );

    -- Warehouses and internal locations
    CREATE TABLE IF NOT EXISTS locations (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      code TEXT NOT NULL UNIQUE,
      type TEXT NOT NULL DEFAULT 'internal'
    );

    -- Stock balances per product and location (Source of Truth)
    CREATE TABLE IF NOT EXISTS stock_balances (
      product_id TEXT NOT NULL REFERENCES products(id),
      location_id TEXT NOT NULL REFERENCES locations(id),
      quantity REAL NOT NULL DEFAULT 0,
      PRIMARY KEY (product_id, location_id)
    );

    -- Operations table (RECEIPT, DELIVERY, TRANSFER, ADJUSTMENT)
    CREATE TABLE IF NOT EXISTS operations (
      id TEXT PRIMARY KEY,
      type TEXT NOT NULL CHECK(type IN ('RECEIPT', 'DELIVERY', 'TRANSFER', 'ADJUSTMENT')),
      product_id TEXT NOT NULL REFERENCES products(id),
      quantity REAL,
      source_location_id TEXT REFERENCES locations(id),
      destination_location_id TEXT REFERENCES locations(id),
      supplier TEXT,
      counted_quantity REAL,
      status TEXT NOT NULL DEFAULT 'DRAFT' CHECK(status IN ('DRAFT', 'DONE')),
      created_at TEXT NOT NULL,
      validated_at TEXT
    );

    -- Stock Ledger / Move History (Audit trail of validated moves)
    CREATE TABLE IF NOT EXISTS stock_moves (
      id TEXT PRIMARY KEY,
      operation_id TEXT NOT NULL REFERENCES operations(id),
      product_id TEXT NOT NULL REFERENCES products(id),
      type TEXT NOT NULL CHECK(type IN ('RECEIPT', 'DELIVERY', 'TRANSFER', 'ADJUSTMENT')),
      quantity REAL NOT NULL,
      difference REAL,
      source_location_id TEXT REFERENCES locations(id),
      destination_location_id TEXT REFERENCES locations(id),
      timestamp TEXT NOT NULL
    );
  `);
}

module.exports = {
  getDatabase,
  initSchema,
};
