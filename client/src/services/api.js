/**
 * StockSense API Client
 * Strictly adheres to README.md API contract:
 * - GET /api/products
 * - GET /api/locations
 * - GET /api/stock
 * - POST /api/operations
 * - POST /api/operations/:id/validate
 * - GET /api/operations
 * - GET /api/moves
 * - GET /api/dashboard
 *
 * Operation fields: type, productId, quantity, sourceLocationId, destinationLocationId, supplier, countedQuantity, status.
 * Types: RECEIPT, DELIVERY, TRANSFER, ADJUSTMENT.
 * Statuses: DRAFT, DONE.
 */

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || '';

// Fallback seed data matching the demo flow in README.md:
// "Receive 100 kg Steel Rods into Main Warehouse"
// "Transfer 30 kg to Production Rack"
const mockProducts = [
  { id: 'prod-1', name: 'Steel Rods', sku: 'SR-100', uom: 'kg' },
  { id: 'prod-2', name: 'Aluminum Sheets', sku: 'AS-200', uom: 'sheets' },
  { id: 'prod-3', name: 'Fasteners M8', sku: 'FM-008', uom: 'pcs' },
];

const mockLocations = [
  { id: 'loc-1', name: 'Main Warehouse', code: 'WH-MAIN' },
  { id: 'loc-2', name: 'Production Rack', code: 'RACK-PROD' },
  { id: 'loc-3', name: 'Scrap Yard', code: 'SCRAP-01' },
];

let mockOperations = [
  {
    id: 'op-001',
    type: 'RECEIPT',
    productId: 'prod-1',
    quantity: 100,
    sourceLocationId: null,
    destinationLocationId: 'loc-1',
    supplier: 'Apex Steel Industries',
    countedQuantity: null,
    status: 'DRAFT',
    createdAt: new Date(Date.now() - 3600000).toISOString(),
  },
];

let mockMoves = [];

let mockStock = [
  { productId: 'prod-1', locationId: 'loc-1', quantity: 0 },
  { productId: 'prod-1', locationId: 'loc-2', quantity: 0 },
];

async function request(endpoint, options = {}) {
  const url = `${API_BASE_URL}${endpoint}`;
  try {
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      ...options,
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.message || `Request failed with status ${res.status}`);
    }
    return await res.json();
  } catch (error) {
    // If backend is not yet running or network fails, provide graceful local state
    // so development and UI preview work smoothly without breaking.
    if (error.name === 'TypeError' || error.message.includes('Failed to fetch')) {
      console.warn(`[StockSense API] Backend unavailable at ${url}. Falling back to in-memory store.`, error.message);
      return handleMockFallback(endpoint, options);
    }
    throw error;
  }
}

function handleMockFallback(endpoint, options) {
  const method = (options.method || 'GET').toUpperCase();

  // GET /api/products
  if (endpoint === '/api/products' && method === 'GET') {
    return Promise.resolve(mockProducts);
  }

  // GET /api/locations
  if (endpoint === '/api/locations' && method === 'GET') {
    return Promise.resolve(mockLocations);
  }

  // GET /api/stock
  if (endpoint === '/api/stock' && method === 'GET') {
    return Promise.resolve(mockStock);
  }

  // GET /api/operations
  if (endpoint === '/api/operations' && method === 'GET') {
    return Promise.resolve(mockOperations);
  }

  // POST /api/operations
  if (endpoint === '/api/operations' && method === 'POST') {
    const body = JSON.parse(options.body || '{}');
    const newOp = {
      id: `op-${Date.now()}`,
      type: body.type || 'RECEIPT',
      productId: body.productId,
      quantity: body.quantity,
      sourceLocationId: body.sourceLocationId || null,
      destinationLocationId: body.destinationLocationId || null,
      supplier: body.supplier || null,
      countedQuantity: body.countedQuantity ?? null,
      status: body.status || 'DRAFT',
      createdAt: new Date().toISOString(),
    };
    mockOperations = [newOp, ...mockOperations];
    return Promise.resolve(newOp);
  }

  // POST /api/operations/:id/validate
  const validateMatch = endpoint.match(/^\/api\/operations\/([^/]+)\/validate$/);
  if (validateMatch && method === 'POST') {
    const opId = validateMatch[1];
    const op = mockOperations.find((o) => o.id === opId);
    if (!op) {
      return Promise.reject(new Error('Operation not found'));
    }
    op.status = 'DONE';

    // Integration rule: Validating an operation changes stock once and creates one move-history entry
    if (op.type === 'RECEIPT') {
      const stockEntry = mockStock.find(
        (s) => s.productId === op.productId && s.locationId === op.destinationLocationId
      );
      if (stockEntry) {
        stockEntry.quantity += op.quantity;
      } else {
        mockStock.push({ productId: op.productId, locationId: op.destinationLocationId, quantity: op.quantity });
      }

      mockMoves.push({
        id: `move-${Date.now()}`,
        operationId: op.id,
        productId: op.productId,
        quantity: op.quantity,
        sourceLocationId: null,
        destinationLocationId: op.destinationLocationId,
        type: op.type,
        timestamp: new Date().toISOString(),
      });
    }

    return Promise.resolve(op);
  }

  // GET /api/moves
  if (endpoint === '/api/moves' && method === 'GET') {
    return Promise.resolve(mockMoves);
  }

  // GET /api/dashboard
  if (endpoint === '/api/dashboard' && method === 'GET') {
    const totalReceipts = mockOperations.filter((o) => o.type === 'RECEIPT').length;
    const pendingDrafts = mockOperations.filter((o) => o.status === 'DRAFT').length;
    const validatedDone = mockOperations.filter((o) => o.status === 'DONE').length;
    return Promise.resolve({
      totalProducts: mockProducts.length,
      totalLocations: mockLocations.length,
      totalOperations: mockOperations.length,
      totalReceipts,
      pendingDrafts,
      validatedDone,
    });
  }

  return Promise.reject(new Error(`Endpoint not matched: ${method} ${endpoint}`));
}

export const api = {
  // Products
  getProducts: () => request('/api/products'),

  // Locations
  getLocations: () => request('/api/locations'),

  // Stock
  getStock: () => request('/api/stock'),

  // Operations
  getOperations: () => request('/api/operations'),

  createOperation: (operationData) =>
    request('/api/operations', {
      method: 'POST',
      body: JSON.stringify(operationData),
    }),

  validateOperation: (operationId) =>
    request(`/api/operations/${operationId}/validate`, {
      method: 'POST',
    }),

  // Move History
  getMoves: () => request('/api/moves'),

  // Dashboard
  getDashboard: () => request('/api/dashboard'),
};
