/**
 * Automated Verification Suite for StockSense Backend
 * Tests all required API routes, business logic, safety constraints,
 * and the complete 4-step Odoo Hackathon demo flow.
 */

const assert = require('node:assert');
const { getDatabase } = require('../src/db/connection');
const { seedDatabase } = require('../src/db/seed');
const createApp = require('../src/app');

// Helper to simulate HTTP requests without needing network sockets
async function makeRequest(app, method, url, body = null) {
  return new Promise((resolve, reject) => {
    const http = require('node:http');
    const server = http.createServer(app);

    server.listen(0, '127.0.0.1', async () => {
      const port = server.address().port;
      try {
        const fetchRes = await fetch(`http://127.0.0.1:${port}${url}`, {
          method,
          headers: body ? { 'Content-Type': 'application/json' } : {},
          body: body ? JSON.stringify(body) : null,
        });

        const status = fetchRes.status;
        const data = await fetchRes.json().catch(() => null);
        server.close(() => resolve({ status, data }));
      } catch (err) {
        server.close(() => reject(err));
      }
    });
  });
}

let passedTests = 0;
let totalTests = 0;

function it(name, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(err);
    process.exit(1);
  }
}

async function itAsync(name, fn) {
  totalTests++;
  try {
    await fn();
    console.log(`  ✓ ${name}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✗ ${name}`);
    console.error(err);
    process.exit(1);
  }
}

async function runTestSuite() {
  console.log('\n======================================================');
  console.log('🧪 Starting StockSense Backend Verification Suite');
  console.log('======================================================\n');

  // Use an isolated in-memory SQLite database for test execution
  const db = getDatabase(':memory:');
  seedDatabase(db);
  const app = createApp(db);

  console.log('--- Phase 1: Master Data & Initial State ---');

  await itAsync('GET /api/products returns seeded product Steel Rods', async () => {
    const { status, data } = await makeRequest(app, 'GET', '/api/products');
    assert.strictEqual(status, 200);
    assert(Array.isArray(data), 'Products should be an array');
    const steel = data.find((p) => p.sku === 'STEEL-001' || p.name === 'Steel Rods');
    assert(steel, 'Steel Rods must exist in products list');
    assert.strictEqual(steel.name, 'Steel Rods');
    assert.strictEqual(steel.uom, 'kg');
    assert.strictEqual(steel.reorderLevel, 20);
  });

  await itAsync('GET /api/locations returns Main Warehouse and Production Rack', async () => {
    const { status, data } = await makeRequest(app, 'GET', '/api/locations');
    assert.strictEqual(status, 200);
    assert(Array.isArray(data), 'Locations should be an array');
    const mainWh = data.find((l) => l.code === 'WH-MAIN' || l.id === 'loc-1');
    const prodRack = data.find((l) => l.code === 'RACK-PROD' || l.id === 'loc-2');
    assert(mainWh, 'Main Warehouse must exist');
    assert(prodRack, 'Production Rack must exist');
  });

  await itAsync('GET /api/stock returns initial 0 balances for both locations', async () => {
    const { status, data } = await makeRequest(app, 'GET', '/api/stock');
    assert.strictEqual(status, 200);
    assert(Array.isArray(data), 'Stock should be an array');
    const whStock = data.find((s) => s.locationId === 'loc-1' && s.productId === 'prod-1');
    const rackStock = data.find((s) => s.locationId === 'loc-2' && s.productId === 'prod-1');
    assert.strictEqual(whStock?.quantity, 0, 'Main Warehouse stock must initially be 0');
    assert.strictEqual(rackStock?.quantity, 0, 'Production Rack stock must initially be 0');
  });

  console.log('\n--- Phase 2: Receipt Rules & Safety ---');

  let receiptOpId = null;

  await itAsync('POST /api/operations creates DRAFT receipt and MUST NOT change stock', async () => {
    const { status, data } = await makeRequest(app, 'POST', '/api/operations', {
      type: 'RECEIPT',
      productId: 'prod-1',
      quantity: 100,
      destinationLocationId: 'loc-1',
      supplier: 'Apex Steel Industries',
    });
    assert.strictEqual(status, 201);
    assert.strictEqual(data.status, 'DRAFT', 'Created operation must be DRAFT');
    assert.strictEqual(data.quantity, 100);
    receiptOpId = data.id;

    // Verify stock is still 0
    const stockRes = await makeRequest(app, 'GET', '/api/stock');
    const whStock = stockRes.data.find((s) => s.locationId === 'loc-1');
    assert.strictEqual(whStock?.quantity, 0, 'Creating draft receipt MUST NOT change stock');
  });

  await itAsync('POST /api/operations/:id/validate validates receipt, increases stock once, creates 1 move', async () => {
    const { status, data } = await makeRequest(app, 'POST', `/api/operations/${receiptOpId}/validate`);
    assert.strictEqual(status, 200);
    assert.strictEqual(data.status, 'DONE');

    // Verify stock is now 100
    const stockRes = await makeRequest(app, 'GET', '/api/stock');
    const whStock = stockRes.data.find((s) => s.locationId === 'loc-1');
    assert.strictEqual(whStock?.quantity, 100, 'Main Warehouse stock must be 100 kg after validation');

    // Verify exactly 1 move was created
    const movesRes = await makeRequest(app, 'GET', '/api/moves');
    assert.strictEqual(movesRes.data.length, 1, 'Exactly one move must be logged');
    assert.strictEqual(movesRes.data[0].type, 'RECEIPT');
    assert.strictEqual(movesRes.data[0].quantity, 100);
    assert.strictEqual(movesRes.data[0].destinationLocationId, 'loc-1');
  });

  await itAsync('Repeated validation of a DONE operation is rejected and does not change stock again', async () => {
    const { status, data } = await makeRequest(app, 'POST', `/api/operations/${receiptOpId}/validate`);
    assert.strictEqual(status, 400, 'Must return 400 for repeated validation');
    assert(data.error.includes('already validated'), 'Error message should clearly state operation is already validated');

    // Verify stock remains 100 kg
    const stockRes = await makeRequest(app, 'GET', '/api/stock');
    const whStock = stockRes.data.find((s) => s.locationId === 'loc-1');
    assert.strictEqual(whStock?.quantity, 100, 'Stock must not change on failed repeated validation');
  });

  console.log('\n--- Phase 3: Transfer Rules & Insufficient Stock Prevention ---');

  await itAsync('Transfer fails when source stock is insufficient (e.g. 500 kg from Main Warehouse)', async () => {
    const { data: draft } = await makeRequest(app, 'POST', '/api/operations', {
      type: 'TRANSFER',
      productId: 'prod-1',
      quantity: 500,
      sourceLocationId: 'loc-1',
      destinationLocationId: 'loc-2',
    });

    const { status, data } = await makeRequest(app, 'POST', `/api/operations/${draft.id}/validate`);
    assert.strictEqual(status, 400);
    assert(data.error.toLowerCase().includes('insufficient stock'), 'Must reject due to insufficient stock');

    // Stock must be completely unchanged
    const stockRes = await makeRequest(app, 'GET', '/api/stock');
    const whStock = stockRes.data.find((s) => s.locationId === 'loc-1')?.quantity;
    const rackStock = stockRes.data.find((s) => s.locationId === 'loc-2')?.quantity;
    assert.strictEqual(whStock, 100, 'Main Warehouse stock must still be 100');
    assert.strictEqual(rackStock, 0, 'Production Rack stock must still be 0');
  });

  let transferOpId = null;

  await itAsync('Transfer succeeds with sufficient stock (Transfer 30 kg to Production Rack)', async () => {
    const { data: draft } = await makeRequest(app, 'POST', '/api/operations', {
      type: 'TRANSFER',
      productId: 'prod-1',
      quantity: 30,
      sourceLocationId: 'loc-1',
      destinationLocationId: 'loc-2',
    });
    transferOpId = draft.id;

    const { status, data } = await makeRequest(app, 'POST', `/api/operations/${transferOpId}/validate`);
    assert.strictEqual(status, 200);
    assert.strictEqual(data.status, 'DONE');

    // Balances: Main Warehouse: 70, Production Rack: 30, Total: 100 (company-wide conserved)
    const stockRes = await makeRequest(app, 'GET', '/api/stock');
    const whStock = stockRes.data.find((s) => s.locationId === 'loc-1')?.quantity;
    const rackStock = stockRes.data.find((s) => s.locationId === 'loc-2')?.quantity;
    assert.strictEqual(whStock, 70, 'Main Warehouse should have 70 kg');
    assert.strictEqual(rackStock, 30, 'Production Rack should have 30 kg');
    assert.strictEqual(whStock + rackStock, 100, 'Total company stock must remain 100 kg');
  });

  console.log('\n--- Phase 4: Delivery Rules & Insufficient Stock Prevention ---');

  await itAsync('Delivery fails when source stock is insufficient (e.g. 50 kg from Production Rack having 30 kg)', async () => {
    const { data: draft } = await makeRequest(app, 'POST', '/api/operations', {
      type: 'DELIVERY',
      productId: 'prod-1',
      quantity: 50,
      sourceLocationId: 'loc-2',
    });

    const { status, data } = await makeRequest(app, 'POST', `/api/operations/${draft.id}/validate`);
    assert.strictEqual(status, 400);
    assert(data.error.toLowerCase().includes('insufficient stock'));

    // Balances unchanged
    const stockRes = await makeRequest(app, 'GET', '/api/stock');
    const rackStock = stockRes.data.find((s) => s.locationId === 'loc-2')?.quantity;
    assert.strictEqual(rackStock, 30, 'Production Rack stock must remain 30 kg');
  });

  let deliveryOpId = null;

  await itAsync('Delivery succeeds with sufficient stock (Deliver 10 kg from Production Rack)', async () => {
    const { data: draft } = await makeRequest(app, 'POST', '/api/operations', {
      type: 'DELIVERY',
      productId: 'prod-1',
      quantity: 10,
      sourceLocationId: 'loc-2',
    });
    deliveryOpId = draft.id;

    const { status, data } = await makeRequest(app, 'POST', `/api/operations/${deliveryOpId}/validate`);
    assert.strictEqual(status, 200);
    assert.strictEqual(data.status, 'DONE');

    // Balances: Production Rack: 30 - 10 = 20 kg
    const stockRes = await makeRequest(app, 'GET', '/api/stock');
    const rackStock = stockRes.data.find((s) => s.locationId === 'loc-2')?.quantity;
    assert.strictEqual(rackStock, 20, 'Production Rack must now be 20 kg');
  });

  console.log('\n--- Phase 5: Adjustment Rules & Physical Count ---');

  let adjustmentOpId = null;

  await itAsync('Adjustment using countedQuantity = 18 kg (Difference = -2 kg)', async () => {
    // Current recorded stock at Production Rack is 20 kg
    // Physical count is 18 kg
    const { data: draft } = await makeRequest(app, 'POST', '/api/operations', {
      type: 'ADJUSTMENT',
      productId: 'prod-1',
      destinationLocationId: 'loc-2',
      countedQuantity: 18,
    });
    adjustmentOpId = draft.id;

    const { status, data } = await makeRequest(app, 'POST', `/api/operations/${adjustmentOpId}/validate`);
    assert.strictEqual(status, 200);
    assert.strictEqual(data.status, 'DONE');
    assert.strictEqual(data.move.difference, -2, 'Adjustment difference must be -2 (18 - 20)');
    assert.strictEqual(data.move.quantity, 18);

    // Final balance at Production Rack should be exactly 18 kg
    const stockRes = await makeRequest(app, 'GET', '/api/stock');
    const rackStock = stockRes.data.find((s) => s.locationId === 'loc-2')?.quantity;
    assert.strictEqual(rackStock, 18, 'Production Rack stock must be set directly to 18 kg');
  });

  console.log('\n--- Phase 6: Final Demo Balances, Move History & Dashboard ---');

  await itAsync('Final balances match the required Hackathon Demo Flow', async () => {
    const stockRes = await makeRequest(app, 'GET', '/api/stock');
    const whStock = stockRes.data.find((s) => s.locationId === 'loc-1')?.quantity;
    const rackStock = stockRes.data.find((s) => s.locationId === 'loc-2')?.quantity;
    const total = whStock + rackStock;

    console.log(`    -> Main Warehouse: ${whStock} kg (Expected: 70 kg)`);
    console.log(`    -> Production Rack: ${rackStock} kg (Expected: 18 kg)`);
    console.log(`    -> Total Stock:     ${total} kg (Expected: 88 kg)`);

    assert.strictEqual(whStock, 70, 'Main Warehouse final balance must be 70 kg');
    assert.strictEqual(rackStock, 18, 'Production Rack final balance must be 18 kg');
    assert.strictEqual(total, 88, 'Total final stock balance must be 88 kg');
  });

  await itAsync('Every validated operation appears exactly once in Move History', async () => {
    const movesRes = await makeRequest(app, 'GET', '/api/moves');
    const moves = movesRes.data;

    console.log(`    -> Total Move History Entries: ${moves.length}`);
    moves.forEach((m) => {
      console.log(`       [${m.type}] Op: ${m.operationId} | Qty: ${m.quantity} | Diff: ${m.difference} | At: ${m.timestamp}`);
    });

    // We validated: 1 receipt, 1 transfer, 1 delivery, 1 adjustment = 4 total validated ops
    assert.strictEqual(moves.length, 4, 'Must have exactly 4 move entries');

    const types = moves.map((m) => m.type);
    assert(types.includes('RECEIPT'), 'Must include RECEIPT move');
    assert(types.includes('TRANSFER'), 'Must include TRANSFER move');
    assert(types.includes('DELIVERY'), 'Must include DELIVERY move');
    assert(types.includes('ADJUSTMENT'), 'Must include ADJUSTMENT move');

    const adjMove = moves.find((m) => m.type === 'ADJUSTMENT');
    assert.strictEqual(adjMove.difference, -2, 'Adjustment move difference must be -2 kg');
  });

  await itAsync('GET /api/dashboard returns correct aggregated metrics', async () => {
    const dashRes = await makeRequest(app, 'GET', '/api/dashboard');
    assert.strictEqual(dashRes.status, 200);
    const d = dashRes.data;

    assert.strictEqual(d.totalProducts, 1);
    assert.strictEqual(d.totalLocations, 2);
    assert.strictEqual(d.validatedDone, 4);
    assert(Array.isArray(d.stock), 'Dashboard must include stock summary');
  });

  console.log('\n--- Phase 7: Product Management (POST & PATCH) ---');

  let createdProdId = null;

  await itAsync('POST /api/products creates a new product with 201', async () => {
    const { status, data } = await makeRequest(app, 'POST', '/api/products', {
      name: 'Aluminum Sheets',
      sku: 'ALUM-001',
      uom: 'pcs',
      reorderLevel: 15,
    });
    assert.strictEqual(status, 201);
    assert(data.id, 'Created product must have an id');
    assert.strictEqual(data.name, 'Aluminum Sheets');
    assert.strictEqual(data.sku, 'ALUM-001');
    assert.strictEqual(data.uom, 'pcs');
    assert.strictEqual(data.unit, undefined, 'Must not return unit field');
    assert.strictEqual(data.reorderLevel, 15);
    createdProdId = data.id;
  });

  await itAsync('POST /api/products rejects duplicate SKU with 409', async () => {
    const { status, data } = await makeRequest(app, 'POST', '/api/products', {
      name: 'Another Sheet',
      sku: 'ALUM-001',
    });
    assert.strictEqual(status, 409);
    assert(data.error || data.message, 'Must return error message');
  });

  await itAsync('POST /api/products rejects missing required fields with 400', async () => {
    const res1 = await makeRequest(app, 'POST', '/api/products', { sku: 'TEST-SKU' });
    assert.strictEqual(res1.status, 400);

    const res2 = await makeRequest(app, 'POST', '/api/products', { name: 'Test Name' });
    assert.strictEqual(res2.status, 400);
  });

  await itAsync('POST /api/products rejects negative reorderLevel with 400', async () => {
    const { status } = await makeRequest(app, 'POST', '/api/products', {
      name: 'Bad Product',
      sku: 'BAD-001',
      reorderLevel: -5,
    });
    assert.strictEqual(status, 400);
  });

  await itAsync('PATCH /api/products/:id updates product with 200', async () => {
    const { status, data } = await makeRequest(app, 'PATCH', `/api/products/${createdProdId}`, {
      name: 'Aluminum Sheets Premium',
      reorderLevel: 25,
    });
    assert.strictEqual(status, 200);
    assert.strictEqual(data.id, createdProdId);
    assert.strictEqual(data.name, 'Aluminum Sheets Premium');
    assert.strictEqual(data.sku, 'ALUM-001');
    assert.strictEqual(data.uom, 'pcs');
    assert.strictEqual(data.unit, undefined, 'Must not return unit field');
    assert.strictEqual(data.reorderLevel, 25);
  });

  await itAsync('PATCH /api/products/:id with unknown ID returns 404', async () => {
    const { status } = await makeRequest(app, 'PATCH', '/api/products/non-existent-id', {
      name: 'Does Not Exist',
    });
    assert.strictEqual(status, 404);
  });

  await itAsync('PATCH /api/products/:id with duplicate SKU returns 409', async () => {
    // STEEL-001 already exists from seed
    const { status } = await makeRequest(app, 'PATCH', `/api/products/${createdProdId}`, {
      sku: 'STEEL-001',
    });
    assert.strictEqual(status, 409);
  });

  await itAsync('Product creation/editing does NOT modify stock_balances or operations', async () => {
    const stockRes = await makeRequest(app, 'GET', '/api/stock');
    const whStock = stockRes.data.find((s) => s.locationId === 'loc-1')?.quantity;
    const rackStock = stockRes.data.find((s) => s.locationId === 'loc-2')?.quantity;
    assert.strictEqual(whStock, 70, 'Main Warehouse balance unchanged');
    assert.strictEqual(rackStock, 18, 'Production Rack balance unchanged');

    const movesRes = await makeRequest(app, 'GET', '/api/moves');
    assert.strictEqual(movesRes.data.length, 4, 'Move history count unchanged');
  });

  console.log('\n======================================================');
  console.log(`🎉 All ${passedTests}/${totalTests} tests passed successfully!`);
  console.log('======================================================\n');
}

runTestSuite().catch((err) => {
  console.error('Test suite failed:', err);
  process.exit(1);
});
