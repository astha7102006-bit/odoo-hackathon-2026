/**
 * Automated Test Suite for StockSense Real-Time Alerts
 *
 * Verifies:
 * - GET /api/alerts returns correct response structure
 * - Out-of-stock alert generation
 * - Reorder-level alert (low stock) generation
 * - No-alert case when stock is healthy
 * - Pending draft operations alerts
 * - Discrepancy alerts on inventory adjustments
 * - Stock / product functionality remains unaffected
 */

const assert = require('node:assert');
const { getDatabase } = require('../src/db/connection');
const { seedDatabase } = require('../src/db/seed');
const createApp = require('../src/app');

// Helper to simulate HTTP requests without network overhead
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

async function runAlertsTestSuite() {
  console.log('\n======================================================');
  console.log('🧪 Starting StockSense Alerts Verification Suite');
  console.log('======================================================\n');

  const db = getDatabase(':memory:');
  seedDatabase(db);
  const app = createApp(db);

  console.log('--- Phase 1: Initial Seed State & Out-of-Stock Alert ---');

  await itAsync('GET /api/alerts returns array and 200 status', async () => {
    const { status, data } = await makeRequest(app, 'GET', '/api/alerts');
    assert.strictEqual(status, 200);
    assert(Array.isArray(data), 'Alerts must return an array');
  });

  await itAsync('Out-of-stock product triggers OUT_OF_STOCK alert (severity: error)', async () => {
    const { status, data } = await makeRequest(app, 'GET', '/api/alerts');
    assert.strictEqual(status, 200);

    // Initial seed product Steel Rods has 0 stock at both locations
    const oosAlert = data.find((a) => a.productId === 'prod-1' && a.type === 'OUT_OF_STOCK');
    assert(oosAlert, 'Must have an OUT_OF_STOCK alert for prod-1');
    assert.strictEqual(oosAlert.severity, 'error');
    assert(oosAlert.title.includes('Out of Stock'), 'Title must indicate Out of Stock');
    assert(oosAlert.message.includes('Steel Rods'), 'Message must mention product name');
    assert(oosAlert.message.includes('STEEL-001'), 'Message must mention SKU');
    assert(oosAlert.createdAt, 'Alert must have createdAt timestamp');
  });

  console.log('\n--- Phase 2: Low Stock (Reorder-Level) Alert ---');

  await itAsync('Setting stock to reorder level triggers LOW_STOCK alert (severity: warning)', async () => {
    // prod-1 reorder level is 20 kg. Set stock to 15 kg (at or below reorder level, > 0)
    db.prepare('UPDATE stock_balances SET quantity = 15 WHERE product_id = ? AND location_id = ?').run('prod-1', 'loc-1');
    db.prepare('UPDATE stock_balances SET quantity = 0 WHERE product_id = ? AND location_id = ?').run('prod-1', 'loc-2');

    const { status, data } = await makeRequest(app, 'GET', '/api/alerts');
    assert.strictEqual(status, 200);

    const lowAlert = data.find((a) => a.productId === 'prod-1' && a.type === 'LOW_STOCK');
    assert(lowAlert, 'Must have a LOW_STOCK alert for prod-1');
    assert.strictEqual(lowAlert.severity, 'warning');
    assert(lowAlert.title.includes('Low Stock'), 'Title must indicate Low Stock');
    assert(lowAlert.message.includes('15 kg'), 'Message must reflect 15 kg remaining');
    assert(lowAlert.message.includes('20 kg'), 'Message must reflect 20 kg threshold');

    // OUT_OF_STOCK should no longer be present
    const oosAlert = data.find((a) => a.productId === 'prod-1' && a.type === 'OUT_OF_STOCK');
    assert.strictEqual(oosAlert, undefined, 'OUT_OF_STOCK should not appear when stock > 0');
  });

  console.log('\n--- Phase 3: No-Alert Case (Healthy Stock) ---');

  await itAsync('No alerts when stock is above reorder level and no pending operations', async () => {
    // Increase stock to 100 kg (> 20 kg threshold)
    db.prepare('UPDATE stock_balances SET quantity = 100 WHERE product_id = ? AND location_id = ?').run('prod-1', 'loc-1');

    const { status, data } = await makeRequest(app, 'GET', '/api/alerts');
    assert.strictEqual(status, 200);
    assert.strictEqual(data.length, 0, 'Should have 0 alerts when stock is healthy');
  });

  console.log('\n--- Phase 4: Pending Operation & Discrepancy Alerts ---');

  await itAsync('Creating a draft operation triggers PENDING_OPERATION alert (severity: info)', async () => {
    const { data: draftOp } = await makeRequest(app, 'POST', '/api/operations', {
      type: 'RECEIPT',
      productId: 'prod-1',
      destinationLocationId: 'loc-1',
      quantity: 50,
      supplier: 'Acme Steel Inc',
    });

    const { status, data } = await makeRequest(app, 'GET', '/api/alerts');
    assert.strictEqual(status, 200);

    const pendingAlert = data.find((a) => a.type === 'PENDING_OPERATION' && a.operationId === draftOp.id);
    assert(pendingAlert, 'Must have PENDING_OPERATION alert for the draft');
    assert.strictEqual(pendingAlert.severity, 'info');
    assert(pendingAlert.title.includes('Draft RECEIPT'), 'Title must indicate draft receipt');
    assert.strictEqual(pendingAlert.operationId, draftOp.id);
  });

  await itAsync('Validating an operation removes its PENDING_OPERATION alert', async () => {
    const ops = await makeRequest(app, 'GET', '/api/operations');
    const draftOp = ops.data.find((o) => o.status === 'DRAFT');
    assert(draftOp, 'Draft operation must exist');

    await makeRequest(app, 'POST', `/api/operations/${draftOp.id}/validate`);

    const { data } = await makeRequest(app, 'GET', '/api/alerts');
    const pendingAlert = data.find((a) => a.operationId === draftOp.id && a.type === 'PENDING_OPERATION');
    assert.strictEqual(pendingAlert, undefined, 'Pending alert must be removed once validated');
  });

  await itAsync('Adjustment with physical discrepancy triggers DISCREPANCY alert', async () => {
    // Current stock at loc-1 is 150 kg (100 initial + 50 from validated receipt).
    // Perform adjustment with countedQuantity = 145 kg (discrepancy = -5 kg)
    const { data: adjDraft } = await makeRequest(app, 'POST', '/api/operations', {
      type: 'ADJUSTMENT',
      productId: 'prod-1',
      destinationLocationId: 'loc-1',
      countedQuantity: 145,
    });

    await makeRequest(app, 'POST', `/api/operations/${adjDraft.id}/validate`);

    const { data } = await makeRequest(app, 'GET', '/api/alerts');
    const discAlert = data.find((a) => a.type === 'DISCREPANCY' && a.operationId === adjDraft.id);
    assert(discAlert, 'Must have DISCREPANCY alert for adjustment difference');
    assert.strictEqual(discAlert.severity, 'warning', 'Negative discrepancy must have warning severity');
    assert(discAlert.message.includes('-5 kg'), 'Message must contain -5 kg discrepancy');
  });

  console.log('\n--- Phase 5: Existing Product & Stock Functionality Remains Intact ---');

  await itAsync('GET /api/products, GET /api/stock, GET /api/operations remain intact', async () => {
    const prodRes = await makeRequest(app, 'GET', '/api/products');
    assert.strictEqual(prodRes.status, 200);
    assert(Array.isArray(prodRes.data), 'Products should be an array');
    assert(prodRes.data.length >= 1, 'Products list intact');

    const stockRes = await makeRequest(app, 'GET', '/api/stock');
    assert.strictEqual(stockRes.status, 200);
    assert(Array.isArray(stockRes.data), 'Stock should be an array');

    const opsRes = await makeRequest(app, 'GET', '/api/operations');
    assert.strictEqual(opsRes.status, 200);
    assert(Array.isArray(opsRes.data), 'Operations should be an array');
  });

  console.log('\n======================================================');
  console.log(`🎉 All ${passedTests}/${totalTests} alert tests passed successfully!`);
  console.log('======================================================\n');
}

runAlertsTestSuite().catch((err) => {
  console.error('Alerts test suite failed:', err);
  process.exit(1);
});
