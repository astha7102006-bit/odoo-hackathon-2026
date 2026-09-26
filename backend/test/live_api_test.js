/**
 * Live HTTP Test Script against running server on http://localhost:5000
 */

const assert = require('node:assert');

const BASE_URL = 'http://localhost:5000';

async function req(method, path, body = null) {
  const options = {
    method,
    headers: body ? { 'Content-Type': 'application/json' } : {},
    body: body ? JSON.stringify(body) : null,
  };
  const res = await fetch(`${BASE_URL}${path}`, options);
  const data = await res.json().catch(() => null);
  return { status: res.status, ok: res.ok, data };
}

const results = [];

async function test(name, fn) {
  try {
    await fn();
    console.log(`[PASS] ${name}`);
    results.push({ name, status: 'PASS' });
  } catch (err) {
    console.error(`[FAIL] ${name}: ${err.message}`);
    results.push({ name, status: 'FAIL', error: err.message });
  }
}

async function run() {
  console.log('\n========================================');
  console.log('Testing Live Backend on ' + BASE_URL);
  console.log('========================================\n');

  // 1. GET /api/products
  await test('GET /api/products', async () => {
    const res = await req('GET', '/api/products');
    assert.strictEqual(res.status, 200);
    assert(Array.isArray(res.data));
    const prod = res.data.find(p => p.sku === 'STEEL-001');
    assert(prod, 'Product Steel Rods exists');
    assert.strictEqual(prod.name, 'Steel Rods');
    assert.strictEqual(prod.uom, 'kg');
    assert.strictEqual(prod.reorderLevel, 20);
  });

  // 2. GET /api/locations
  await test('GET /api/locations', async () => {
    const res = await req('GET', '/api/locations');
    assert.strictEqual(res.status, 200);
    assert(Array.isArray(res.data));
    const wh = res.data.find(l => l.code === 'WH-MAIN');
    const rack = res.data.find(l => l.code === 'RACK-PROD');
    assert(wh, 'Main Warehouse exists');
    assert(rack, 'Production Rack exists');
  });

  // 3. GET /api/stock (initial)
  await test('GET /api/stock (initial zero balances)', async () => {
    const res = await req('GET', '/api/stock');
    assert.strictEqual(res.status, 200);
    assert(Array.isArray(res.data));
    const wh = res.data.find(s => s.locationId === 'loc-1');
    const rack = res.data.find(s => s.locationId === 'loc-2');
    assert.strictEqual(wh.quantity, 0);
    assert.strictEqual(rack.quantity, 0);
  });

  // 4. Test delivering more stock than available is rejected without changing stock
  await test('Reject delivery when stock is insufficient (0 kg available, requesting 10 kg)', async () => {
    const draftRes = await req('POST', '/api/operations', {
      type: 'DELIVERY',
      productId: 'prod-1',
      quantity: 10,
      sourceLocationId: 'loc-1'
    });
    assert.strictEqual(draftRes.status, 201);
    assert.strictEqual(draftRes.data.status, 'DRAFT');

    const valRes = await req('POST', `/api/operations/${draftRes.data.id}/validate`);
    assert.strictEqual(valRes.status, 400);
    assert(valRes.data.error.toLowerCase().includes('insufficient stock'));

    // Check stock remains unchanged at 0
    const stockRes = await req('GET', '/api/stock');
    const wh = stockRes.data.find(s => s.locationId === 'loc-1');
    assert.strictEqual(wh.quantity, 0, 'Stock must not change when delivery validation fails');
  });

  // 5. Complete Demo Flow: Step 1 - Receive 100 kg Steel Rods into Main Warehouse
  let receiptOpId;
  await test('Demo Step 1: Create Draft Receipt (100 kg into Main Warehouse)', async () => {
    const res = await req('POST', '/api/operations', {
      type: 'RECEIPT',
      productId: 'prod-1',
      quantity: 100,
      destinationLocationId: 'loc-1',
      supplier: 'Apex Steel Industries'
    });
    assert.strictEqual(res.status, 201);
    assert.strictEqual(res.data.status, 'DRAFT');
    receiptOpId = res.data.id;

    // Verify draft does not alter stock
    const stock = await req('GET', '/api/stock');
    assert.strictEqual(stock.data.find(s => s.locationId === 'loc-1').quantity, 0);
  });

  await test('Demo Step 1: Validate Receipt (Stock becomes 100 kg)', async () => {
    const res = await req('POST', `/api/operations/${receiptOpId}/validate`);
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.status, 'DONE');

    const stock = await req('GET', '/api/stock');
    const wh = stock.data.find(s => s.locationId === 'loc-1');
    assert.strictEqual(wh.quantity, 100);
  });

  // 6. Complete Demo Flow: Step 2 - Transfer 30 kg to Production Rack
  await test('Demo Step 2: Transfer 30 kg from Main Warehouse to Production Rack', async () => {
    const draft = await req('POST', '/api/operations', {
      type: 'TRANSFER',
      productId: 'prod-1',
      quantity: 30,
      sourceLocationId: 'loc-1',
      destinationLocationId: 'loc-2'
    });
    assert.strictEqual(draft.status, 201);

    const validated = await req('POST', `/api/operations/${draft.data.id}/validate`);
    assert.strictEqual(validated.status, 200);
    assert.strictEqual(validated.data.status, 'DONE');

    const stock = await req('GET', '/api/stock');
    const wh = stock.data.find(s => s.locationId === 'loc-1').quantity;
    const rack = stock.data.find(s => s.locationId === 'loc-2').quantity;
    assert.strictEqual(wh, 70, 'Main Warehouse should be 70 kg');
    assert.strictEqual(rack, 30, 'Production Rack should be 30 kg');
    assert.strictEqual(wh + rack, 100, 'Total stock conserved at 100 kg');
  });

  // 7. Complete Demo Flow: Step 3 - Deliver 10 kg from Production Rack
  await test('Demo Step 3: Deliver 10 kg from Production Rack', async () => {
    const draft = await req('POST', '/api/operations', {
      type: 'DELIVERY',
      productId: 'prod-1',
      quantity: 10,
      sourceLocationId: 'loc-2'
    });
    assert.strictEqual(draft.status, 201);

    const validated = await req('POST', `/api/operations/${draft.data.id}/validate`);
    assert.strictEqual(validated.status, 200);
    assert.strictEqual(validated.data.status, 'DONE');

    const stock = await req('GET', '/api/stock');
    const rack = stock.data.find(s => s.locationId === 'loc-2').quantity;
    assert.strictEqual(rack, 20, 'Production Rack should be 20 kg');
  });

  // 8. Complete Demo Flow: Step 4 - Adjust Production Rack physical count to 18 kg
  await test('Demo Step 4: Adjust Production Rack physical count to 18 kg (Difference = -2 kg)', async () => {
    const draft = await req('POST', '/api/operations', {
      type: 'ADJUSTMENT',
      productId: 'prod-1',
      destinationLocationId: 'loc-2',
      countedQuantity: 18
    });
    assert.strictEqual(draft.status, 201);

    const validated = await req('POST', `/api/operations/${draft.data.id}/validate`);
    assert.strictEqual(validated.status, 200);
    assert.strictEqual(validated.data.status, 'DONE');
    assert.strictEqual(validated.data.move.difference, -2, 'Adjustment difference must be -2');

    const stock = await req('GET', '/api/stock');
    const rack = stock.data.find(s => s.locationId === 'loc-2').quantity;
    assert.strictEqual(rack, 18, 'Production Rack physical stock set to 18 kg');
  });

  // 9. Verify Final Stock Balances
  await test('Final Stock Balances: Main WH = 70 kg, Production Rack = 18 kg, Total = 88 kg', async () => {
    const stock = await req('GET', '/api/stock');
    const wh = stock.data.find(s => s.locationId === 'loc-1').quantity;
    const rack = stock.data.find(s => s.locationId === 'loc-2').quantity;
    const total = wh + rack;

    console.log(`       Main Warehouse:  ${wh} kg (Expected: 70)`);
    console.log(`       Production Rack: ${rack} kg (Expected: 18)`);
    console.log(`       Total Balance:   ${total} kg (Expected: 88)`);

    assert.strictEqual(wh, 70);
    assert.strictEqual(rack, 18);
    assert.strictEqual(total, 88);
  });

  // 10. GET /api/operations
  await test('GET /api/operations (lists all recorded operations)', async () => {
    const res = await req('GET', '/api/operations');
    assert.strictEqual(res.status, 200);
    assert(Array.isArray(res.data));
    assert(res.data.length >= 4);
    const validatedOps = res.data.filter(o => o.status === 'DONE');
    assert.strictEqual(validatedOps.length, 4, '4 operations validated');
  });

  // 11. GET /api/moves
  await test('GET /api/moves (exactly one move history entry per validated operation)', async () => {
    const res = await req('GET', '/api/moves');
    assert.strictEqual(res.status, 200);
    assert(Array.isArray(res.data));
    assert.strictEqual(res.data.length, 4, 'Exactly 4 move history entries logged');

    const types = res.data.map(m => m.type);
    assert(types.includes('RECEIPT'));
    assert(types.includes('TRANSFER'));
    assert(types.includes('DELIVERY'));
    assert(types.includes('ADJUSTMENT'));

    const adj = res.data.find(m => m.type === 'ADJUSTMENT');
    assert.strictEqual(adj.difference, -2, 'Adjustment difference is -2 kg');
  });

  // 12. GET /api/dashboard
  await test('GET /api/dashboard (returns aggregated counts and stock summary)', async () => {
    const res = await req('GET', '/api/dashboard');
    assert.strictEqual(res.status, 200);
    assert.strictEqual(res.data.totalProducts, 1);
    assert.strictEqual(res.data.totalLocations, 2);
    assert.strictEqual(res.data.validatedDone, 4);
    assert(Array.isArray(res.data.stock));
  });

  console.log('\n========================================');
  const passed = results.filter(r => r.status === 'PASS').length;
  const failed = results.filter(r => r.status === 'FAIL').length;
  console.log(`SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log('========================================\n');

  if (failed > 0) {
    process.exit(1);
  }
}

run();
