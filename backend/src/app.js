const express = require('express');
const cors = require('cors');

const createProductsRouter = require('./routes/products');
const createLocationsRouter = require('./routes/locations');
const createStockRouter = require('./routes/stock');
const createOperationsRouter = require('./routes/operations');
const createMovesRouter = require('./routes/moves');
const createDashboardRouter = require('./routes/dashboard');
const createAlertsRouter = require('./routes/alerts');

/**
 * Creates and configures the Express application.
 *
 * @param {import('node:sqlite').DatabaseSync} db - SQLite database instance
 * @returns {express.Application}
 */
function createApp(db) {
  const app = express();

  // Middleware
  app.use(cors());
  app.use(express.json());

  // Health check & welcome
  app.get('/', (req, res) => {
    res.json({
      name: 'StockSense Inventory API',
      status: 'healthy',
      version: '1.0.0',
      routes: [
        'GET /api/products',
        'GET /api/locations',
        'GET /api/stock',
        'POST /api/operations',
        'POST /api/operations/:id/validate',
        'GET /api/operations',
        'GET /api/moves',
        'GET /api/dashboard',
        'GET /api/alerts',
      ],
    });
  });

  app.get('/api/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
  });

  // Mount API Contract Routes
  app.use('/api/products', createProductsRouter(db));
  app.use('/api/locations', createLocationsRouter(db));
  app.use('/api/stock', createStockRouter(db));
  app.use('/api/operations', createOperationsRouter(db));
  app.use('/api/moves', createMovesRouter(db));
  app.use('/api/dashboard', createDashboardRouter(db));
  app.use('/api/alerts', createAlertsRouter(db));

  // 404 Not Found Handler
  app.use((req, res) => {
    res.status(404).json({
      error: `Route not found: ${req.method} ${req.originalUrl}`,
    });
  });

  // Centralized Error Handler (Clean JSON errors, no stack traces leaked)
  app.use((err, req, res, next) => {
    const statusCode = err.statusCode || (err.name === 'StockError' ? 400 : 500);
    const message = err.message || 'Internal Server Error';

    // Log internally for debugging, but never expose stack traces to client
    if (statusCode >= 500) {
      console.error('[ServerError]', err);
    }

    res.status(statusCode).json({
      error: message,
      message, // provides message property for frontend convenience
    });
  });

  return app;
}

module.exports = createApp;
