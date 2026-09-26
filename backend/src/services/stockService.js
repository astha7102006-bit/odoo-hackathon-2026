/**
 * StockSense Core Inventory Service
 *
 * Implements atomic stock mutations, strict validation, ledger recording,
 * and data queries for products, locations, operations, moves, and dashboard.
 */

const crypto = require('node:crypto');

class StockError extends Error {
  constructor(message, statusCode = 400) {
    super(message);
    this.name = 'StockError';
    this.statusCode = statusCode;
  }
}

/**
 * Generates human-friendly unique IDs with domain prefixes.
 */
function generateId(prefix = 'id') {
  const ts = Date.now().toString(36);
  const rand = crypto.randomBytes(3).toString('hex');
  return `${prefix}-${ts}-${rand}`;
}

/**
 * Resolves a product by ID or SKU.
 */
function resolveProduct(db, identifier) {
  if (!identifier) return null;
  const stmt = db.prepare(`
    SELECT * FROM products WHERE id = ? OR sku = ? LIMIT 1
  `);
  return stmt.get(identifier, identifier);
}

/**
 * Resolves a location by ID or Code.
 */
function resolveLocation(db, identifier) {
  if (!identifier) return null;
  const stmt = db.prepare(`
    SELECT * FROM locations WHERE id = ? OR code = ? LIMIT 1
  `);
  return stmt.get(identifier, identifier);
}

/**
 * Retrieves the recorded balance for a given product and location.
 * Defaults to 0 if no record exists yet.
 */
function getRecordedStock(db, productId, locationId) {
  const stmt = db.prepare(`
    SELECT quantity FROM stock_balances
    WHERE product_id = ? AND location_id = ?
    LIMIT 1
  `);
  const row = stmt.get(productId, locationId);
  return row ? Number(row.quantity) : 0;
}

/**
 * Upserts a stock balance for a product at a specific location.
 */
function setRecordedStock(db, productId, locationId, quantity) {
  const stmt = db.prepare(`
    INSERT INTO stock_balances (product_id, location_id, quantity)
    VALUES (?, ?, ?)
    ON CONFLICT(product_id, location_id)
    DO UPDATE SET quantity = excluded.quantity
  `);
  stmt.run(productId, locationId, quantity);
}

// ---------------------------------------------------------------------------
// SERVICE METHODS
// ---------------------------------------------------------------------------

/**
 * Fetch all catalog products.
 */
function getProducts(db) {
  const stmt = db.prepare(`
    SELECT
      p.id,
      p.name,
      p.sku,
      p.uom,
      p.reorder_level AS reorderLevel,
      c.id AS categoryId,
      c.name AS categoryName
    FROM products p
    LEFT JOIN categories c ON p.category_id = c.id
    ORDER BY p.name ASC
  `);
  return stmt.all().map((p) => ({
    id: p.id,
    name: p.name,
    sku: p.sku,
    uom: p.uom,
    unit: p.uom, // alias for frontend compatibility
    categoryId: p.categoryId,
    categoryName: p.categoryName,
    reorderLevel: Number(p.reorderLevel),
  }));
}

/**
 * Fetch all warehouse / rack locations.
 */
function getLocations(db) {
  const stmt = db.prepare(`
    SELECT id, name, code, type FROM locations ORDER BY id ASC
  `);
  return stmt.all().map((l) => ({
    id: l.id,
    name: l.name,
    code: l.code,
    type: l.type,
  }));
}

/**
 * Fetch current stock balances per product per location.
 * The backend is the source of truth for all inventory quantities.
 */
function getStock(db) {
  const stmt = db.prepare(`
    SELECT
      sb.product_id AS productId,
      sb.location_id AS locationId,
      sb.quantity,
      p.name AS productName,
      p.sku,
      p.uom,
      l.name AS locationName,
      l.code AS locationCode
    FROM stock_balances sb
    JOIN products p ON sb.product_id = p.id
    JOIN locations l ON sb.location_id = l.id
    ORDER BY l.name ASC, p.name ASC
  `);
  return stmt.all().map((row) => ({
    productId: row.productId,
    locationId: row.locationId,
    quantity: Number(row.quantity),
    productName: row.productName,
    sku: row.sku,
    uom: row.uom,
    unit: row.uom,
    locationName: row.locationName,
    locationCode: row.locationCode,
  }));
}

/**
 * Fetch all recorded operations (sorted newest first).
 */
function getOperations(db) {
  const stmt = db.prepare(`
    SELECT
      id,
      type,
      product_id AS productId,
      quantity,
      source_location_id AS sourceLocationId,
      destination_location_id AS destinationLocationId,
      supplier,
      counted_quantity AS countedQuantity,
      status,
      created_at AS createdAt,
      validated_at AS validatedAt
    FROM operations
    ORDER BY created_at DESC
  `);
  return stmt.all().map((op) => ({
    id: op.id,
    type: op.type,
    productId: op.productId,
    quantity: op.quantity !== null ? Number(op.quantity) : null,
    sourceLocationId: op.sourceLocationId,
    destinationLocationId: op.destinationLocationId,
    supplier: op.supplier,
    countedQuantity: op.countedQuantity !== null ? Number(op.countedQuantity) : null,
    status: op.status,
    createdAt: op.createdAt,
    validatedAt: op.validatedAt,
  }));
}

/**
 * Fetch stock ledger / move history (audit trail).
 */
function getMoves(db) {
  const stmt = db.prepare(`
    SELECT
      sm.id,
      sm.operation_id AS operationId,
      sm.product_id AS productId,
      p.name AS productName,
      p.sku,
      sm.type,
      sm.quantity,
      sm.difference,
      sm.source_location_id AS sourceLocationId,
      sm.destination_location_id AS destinationLocationId,
      sm.timestamp
    FROM stock_moves sm
    JOIN products p ON sm.product_id = p.id
    ORDER BY sm.timestamp DESC
  `);
  return stmt.all().map((m) => ({
    id: m.id,
    operationId: m.operationId,
    productId: m.productId,
    productName: m.productName,
    sku: m.sku,
    type: m.type,
    quantity: Number(m.quantity),
    difference: m.difference !== null ? Number(m.difference) : null,
    sourceLocationId: m.sourceLocationId,
    destinationLocationId: m.destinationLocationId,
    timestamp: m.timestamp,
  }));
}

/**
 * Aggregated dashboard metrics for real-time visibility.
 */
function getDashboard(db) {
  const totalProducts = db.prepare('SELECT COUNT(*) as count FROM products').get().count;
  const totalLocations = db.prepare('SELECT COUNT(*) as count FROM locations').get().count;
  const totalOperations = db.prepare('SELECT COUNT(*) as count FROM operations').get().count;
  const totalReceipts = db.prepare("SELECT COUNT(*) as count FROM operations WHERE type = 'RECEIPT'").get().count;
  const pendingDrafts = db.prepare("SELECT COUNT(*) as count FROM operations WHERE status = 'DRAFT'").get().count;
  const validatedDone = db.prepare("SELECT COUNT(*) as count FROM operations WHERE status = 'DONE'").get().count;

  // Retrieve current stock balances
  const stock = getStock(db);

  return {
    totalProducts: Number(totalProducts),
    totalLocations: Number(totalLocations),
    totalOperations: Number(totalOperations),
    totalReceipts: Number(totalReceipts),
    pendingDrafts: Number(pendingDrafts),
    validatedDone: Number(validatedDone),
    stock,
  };
}

/**
 * CREATE OPERATION:
 * Always creates a DRAFT operation.
 * CORE RULE: Creating a draft MUST NOT modify stock balances or create moves.
 */
function createOperation(db, data) {
  const {
    type,
    productId,
    quantity,
    sourceLocationId,
    destinationLocationId,
    supplier,
    countedQuantity,
  } = data;

  // 1. Validate Operation Type
  const validTypes = ['RECEIPT', 'DELIVERY', 'TRANSFER', 'ADJUSTMENT'];
  if (!type || !validTypes.includes(type.toUpperCase())) {
    throw new StockError(`Invalid operation type. Allowed: ${validTypes.join(', ')}`, 400);
  }
  const opType = type.toUpperCase();

  // 2. Validate & Resolve Product
  if (!productId) {
    throw new StockError('productId is required', 400);
  }
  const product = resolveProduct(db, productId);
  if (!product) {
    throw new StockError(`Product not found: "${productId}"`, 404);
  }

  // 3. Validate Locations according to type
  let resolvedSourceId = null;
  let resolvedDestId = null;

  if (opType === 'RECEIPT') {
    if (!destinationLocationId) {
      throw new StockError('destinationLocationId is required for RECEIPT', 400);
    }
    const destLoc = resolveLocation(db, destinationLocationId);
    if (!destLoc) {
      throw new StockError(`Destination location not found: "${destinationLocationId}"`, 404);
    }
    resolvedDestId = destLoc.id;
  } else if (opType === 'DELIVERY') {
    if (!sourceLocationId) {
      throw new StockError('sourceLocationId is required for DELIVERY', 400);
    }
    const srcLoc = resolveLocation(db, sourceLocationId);
    if (!srcLoc) {
      throw new StockError(`Source location not found: "${sourceLocationId}"`, 404);
    }
    resolvedSourceId = srcLoc.id;
  } else if (opType === 'TRANSFER') {
    if (!sourceLocationId || !destinationLocationId) {
      throw new StockError('Both sourceLocationId and destinationLocationId are required for TRANSFER', 400);
    }
    const srcLoc = resolveLocation(db, sourceLocationId);
    const destLoc = resolveLocation(db, destinationLocationId);
    if (!srcLoc) throw new StockError(`Source location not found: "${sourceLocationId}"`, 404);
    if (!destLoc) throw new StockError(`Destination location not found: "${destinationLocationId}"`, 404);
    if (srcLoc.id === destLoc.id) {
      throw new StockError('Source and destination locations must be different for TRANSFER', 400);
    }
    resolvedSourceId = srcLoc.id;
    resolvedDestId = destLoc.id;
  } else if (opType === 'ADJUSTMENT') {
    const locId = destinationLocationId || sourceLocationId;
    if (!locId) {
      throw new StockError('A location (destinationLocationId or sourceLocationId) is required for ADJUSTMENT', 400);
    }
    const loc = resolveLocation(db, locId);
    if (!loc) throw new StockError(`Location not found: "${locId}"`, 404);
    resolvedDestId = loc.id;
  }

  // 4. Validate Quantities
  let parsedQuantity = null;
  let parsedCountedQuantity = null;

  if (opType === 'ADJUSTMENT') {
    if (countedQuantity === undefined || countedQuantity === null || countedQuantity === '' || !Number.isFinite(Number(countedQuantity))) {
      throw new StockError('countedQuantity (non-negative number) is required for ADJUSTMENT', 400);
    }
    parsedCountedQuantity = Number(countedQuantity);
    if (parsedCountedQuantity < 0) {
      throw new StockError('countedQuantity cannot be negative', 400);
    }
  } else {
    if (quantity === undefined || quantity === null || quantity === '' || !Number.isFinite(Number(quantity))) {
      throw new StockError('quantity (positive number) is required', 400);
    }
    parsedQuantity = Number(quantity);
    if (parsedQuantity <= 0) {
      throw new StockError('quantity must be strictly greater than 0', 400);
    }
  }

  const id = generateId('op');
  const now = new Date().toISOString();

  const insertOp = db.prepare(`
    INSERT INTO operations (
      id, type, product_id, quantity, source_location_id,
      destination_location_id, supplier, counted_quantity, status, created_at
    )
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'DRAFT', ?)
  `);

  insertOp.run(
    id,
    opType,
    product.id,
    parsedQuantity,
    resolvedSourceId,
    resolvedDestId,
    supplier || null,
    parsedCountedQuantity,
    now
  );

  return {
    id,
    type: opType,
    productId: product.id,
    quantity: parsedQuantity,
    sourceLocationId: resolvedSourceId,
    destinationLocationId: resolvedDestId,
    supplier: supplier || null,
    countedQuantity: parsedCountedQuantity,
    status: 'DRAFT',
    createdAt: now,
    validatedAt: null,
  };
}

/**
 * VALIDATE OPERATION:
 * Executes stock updates and ledger recording atomically within a database transaction.
 *
 * SAFETY RULES:
 * 1. A DRAFT operation affects stock only when validated.
 * 2. A DONE operation must NEVER be validated again.
 * 3. Delivery/transfer fails with a 400 error if source stock is insufficient.
 * 4. Failed operations do not partially modify stock (full ROLLBACK).
 * 5. Exactly one move history entry is created per validated operation.
 */
function validateOperation(db, operationId) {
  // Retrieve the operation
  const opStmt = db.prepare(`
    SELECT * FROM operations WHERE id = ? LIMIT 1
  `);
  const op = opStmt.get(operationId);

  if (!op) {
    throw new StockError(`Operation not found with ID "${operationId}"`, 404);
  }

  // SAFETY CHECK: Double validation prevention
  if (op.status === 'DONE') {
    throw new StockError(
      `Operation ${operationId} is already validated (status is DONE). Repeated validation is rejected.`,
      400
    );
  }

  const now = new Date().toISOString();
  const moveId = generateId('move');
  const productId = op.product_id;

  // BEGIN ATOMIC TRANSACTION
  // Using BEGIN IMMEDIATE to acquire a write lock immediately and prevent race conditions
  db.exec('BEGIN IMMEDIATE TRANSACTION;');

  try {
    let ledgerEntry = null;

    if (op.type === 'RECEIPT') {
      /*
       * 1. RECEIPT
       * - Increase stock at destination location
       * - Create exactly 1 ledger entry
       * - Set status to DONE
       */
      const currentStock = getRecordedStock(db, productId, op.destination_location_id);
      const newStock = currentStock + Number(op.quantity);

      setRecordedStock(db, productId, op.destination_location_id, newStock);

      ledgerEntry = {
        id: moveId,
        operationId: op.id,
        productId,
        type: 'RECEIPT',
        quantity: Number(op.quantity),
        difference: null,
        sourceLocationId: null,
        destinationLocationId: op.destination_location_id,
        timestamp: now,
      };
    } else if (op.type === 'DELIVERY') {
      /*
       * 2. DELIVERY
       * - Verify source location has sufficient stock
       * - If insufficient, abort without modifying stock
       * - If sufficient, subtract quantity from source
       * - Create exactly 1 ledger entry
       * - Set status to DONE
       */
      const availableStock = getRecordedStock(db, productId, op.source_location_id);
      const requestedQty = Number(op.quantity);

      if (availableStock < requestedQty) {
        throw new StockError(
          `Insufficient stock at source location: available ${availableStock}, requested ${requestedQty}`,
          400
        );
      }

      const newStock = availableStock - requestedQty;
      setRecordedStock(db, productId, op.source_location_id, newStock);

      ledgerEntry = {
        id: moveId,
        operationId: op.id,
        productId,
        type: 'DELIVERY',
        quantity: requestedQty,
        difference: null,
        sourceLocationId: op.source_location_id,
        destinationLocationId: null,
        timestamp: now,
      };
    } else if (op.type === 'TRANSFER') {
      /*
       * 3. INTERNAL TRANSFER
       * - Verify source location has sufficient stock
       * - Subtract from source and add to destination
       * - Company-wide total stock remains unchanged
       * - Create exactly 1 ledger entry
       * - Set status to DONE
       */
      const availableStock = getRecordedStock(db, productId, op.source_location_id);
      const transferQty = Number(op.quantity);

      if (availableStock < transferQty) {
        throw new StockError(
          `Insufficient stock for transfer at source location: available ${availableStock}, requested ${transferQty}`,
          400
        );
      }

      // Atomic source decrement and destination increment
      const newSourceStock = availableStock - transferQty;
      const currentDestStock = getRecordedStock(db, productId, op.destination_location_id);
      const newDestStock = currentDestStock + transferQty;

      setRecordedStock(db, productId, op.source_location_id, newSourceStock);
      setRecordedStock(db, productId, op.destination_location_id, newDestStock);

      ledgerEntry = {
        id: moveId,
        operationId: op.id,
        productId,
        type: 'TRANSFER',
        quantity: transferQty,
        difference: null,
        sourceLocationId: op.source_location_id,
        destinationLocationId: op.destination_location_id,
        timestamp: now,
      };
    } else if (op.type === 'ADJUSTMENT') {
      /*
       * 4. ADJUSTMENT
       * - Uses countedQuantity representing physical count
       * - Difference = countedQuantity - recordedQuantity
       * - Set stock balance directly to countedQuantity
       * - Create 1 ledger entry containing adjustment difference
       * - Set status to DONE
       */
      const targetLocationId = op.destination_location_id || op.source_location_id;
      const recordedQuantity = getRecordedStock(db, productId, targetLocationId);
      const physicalCount = Number(op.counted_quantity);
      const difference = physicalCount - recordedQuantity;

      // Update physical stock balance to countedQuantity
      setRecordedStock(db, productId, targetLocationId, physicalCount);

      ledgerEntry = {
        id: moveId,
        operationId: op.id,
        productId,
        type: 'ADJUSTMENT',
        quantity: physicalCount,
        difference,
        sourceLocationId: targetLocationId,
        destinationLocationId: targetLocationId,
        timestamp: now,
      };
    }

    // Insert Move History entry (Ledger)
    const insertMove = db.prepare(`
      INSERT INTO stock_moves (
        id, operation_id, product_id, type, quantity, difference,
        source_location_id, destination_location_id, timestamp
      )
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);

    insertMove.run(
      ledgerEntry.id,
      ledgerEntry.operationId,
      ledgerEntry.productId,
      ledgerEntry.type,
      ledgerEntry.quantity,
      ledgerEntry.difference,
      ledgerEntry.sourceLocationId,
      ledgerEntry.destinationLocationId,
      ledgerEntry.timestamp
    );

    // Update operation status to DONE
    const updateOp = db.prepare(`
      UPDATE operations
      SET status = 'DONE', validated_at = ?
      WHERE id = ?
    `);
    updateOp.run(now, op.id);

    // COMMIT ATOMIC TRANSACTION
    db.exec('COMMIT;');

    return {
      id: op.id,
      type: op.type,
      productId: op.product_id,
      quantity: op.quantity !== null ? Number(op.quantity) : null,
      sourceLocationId: op.source_location_id,
      destinationLocationId: op.destination_location_id,
      supplier: op.supplier,
      countedQuantity: op.counted_quantity !== null ? Number(op.counted_quantity) : null,
      status: 'DONE',
      createdAt: op.created_at,
      validatedAt: now,
      move: ledgerEntry,
    };
  } catch (error) {
    // If any validation fails or unexpected error occurs, roll back the transaction
    try {
      db.exec('ROLLBACK;');
    } catch (_) {
      // Transaction may not be active
    }
    throw error;
  }
}

module.exports = {
  StockError,
  getProducts,
  getLocations,
  getStock,
  getOperations,
  getMoves,
  getDashboard,
  createOperation,
  validateOperation,
  getRecordedStock,
};
