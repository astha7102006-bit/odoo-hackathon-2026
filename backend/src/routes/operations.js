const express = require('express');
const {
  getOperations,
  createOperation,
  validateOperation,
} = require('../services/stockService');

function createOperationsRouter(db) {
  const router = express.Router();

  // GET /api/operations - List all operations
  router.get('/', (req, res, next) => {
    try {
      const operations = getOperations(db);
      res.json(operations);
    } catch (err) {
      next(err);
    }
  });

  // POST /api/operations - Create a draft operation (does NOT modify stock)
  router.post('/', (req, res, next) => {
    try {
      const operation = createOperation(db, req.body);
      res.status(201).json(operation);
    } catch (err) {
      next(err);
    }
  });

  // POST /api/operations/:id/validate - Atomically validate operation and modify stock
  router.post('/:id/validate', (req, res, next) => {
    try {
      const result = validateOperation(db, req.params.id);
      res.status(200).json(result);
    } catch (err) {
      next(err);
    }
  });

  return router;
}

module.exports = createOperationsRouter;
