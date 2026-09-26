/**
 * Seed data for StockSense Inventory System.
 * Ensures required demo entities exist without duplicating on server restarts.
 *
 * Requirements:
 * - Product: Steel Rods, SKU: STEEL-001, Unit: kg, Reorder level: 20
 * - Locations: Main Warehouse, Production Rack
 * - Initial Stock: 0 kg at both locations
 */

function seedDatabase(db) {
  // 1. Seed Category
  const insertCategory = db.prepare(`
    INSERT OR IGNORE INTO categories (id, name)
    VALUES (?, ?)
  `);
  insertCategory.run('cat-1', 'Raw Materials');

  // 2. Seed Locations
  const insertLocation = db.prepare(`
    INSERT OR IGNORE INTO locations (id, name, code, type)
    VALUES (?, ?, ?, ?)
  `);
  insertLocation.run('loc-1', 'Main Warehouse', 'WH-MAIN', 'warehouse');
  insertLocation.run('loc-2', 'Production Rack', 'RACK-PROD', 'internal');

  // 3. Seed Products
  const insertProduct = db.prepare(`
    INSERT OR IGNORE INTO products (id, name, sku, uom, category_id, reorder_level)
    VALUES (?, ?, ?, ?, ?, ?)
  `);
  insertProduct.run('prod-1', 'Steel Rods', 'STEEL-001', 'kg', 'cat-1', 20);

  // 4. Seed Initial Stock Balances (0 kg tracked separately for each product & location)
  const insertStock = db.prepare(`
    INSERT OR IGNORE INTO stock_balances (product_id, location_id, quantity)
    VALUES (?, ?, ?)
  `);
  insertStock.run('prod-1', 'loc-1', 0);
  insertStock.run('prod-1', 'loc-2', 0);
}

module.exports = {
  seedDatabase,
};
