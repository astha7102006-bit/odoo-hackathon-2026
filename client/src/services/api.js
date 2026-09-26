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

async function request(endpoint, options = {}) {
  try {
    const res = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    });
    if (!res.ok) {
      const errBody = await res.json().catch(() => ({}));
      throw new Error(errBody.message || errBody.error || `Request failed with status ${res.status}`);
    }
    return await res.json();
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error('Cannot connect to the StockSense backend. Check that the server is running and VITE_API_BASE_URL is correct.');
    }
    throw error;
  }
}

export const api = {
  // Products
  getProducts: () => request('/api/products'),
  createProduct: (productData) =>
    request('/api/products', {
      method: 'POST',
      body: JSON.stringify(productData),
    }),
  updateProduct: (productId, productData) =>
    request(`/api/products/${productId}`, {
      method: 'PATCH',
      body: JSON.stringify(productData),
    }),

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

  // Alerts
  getAlerts: () => request('/api/alerts'),
};
