const express = require('express');
const {
  getProducts,
  createProduct,
  updateProduct,
} = require('../services/stockService');

function createProductsRouter(db) {
  const router = express.Router();

  // GET /api/products - List all products
  router.get('/', (req, res, next) => {
    try {
      const products = getProducts(db);
      res.json(products);
    } catch (err) {
      next(err);
    }
  });

  // POST /api/products - Create a new product
  router.post('/', (req, res, next) => {
    try {
      const product = createProduct(db, req.body);
      res.status(201).json(product);
    } catch (err) {
      next(err);
    }
  });

  // PATCH /api/products/:id - Edit an existing product
  router.patch('/:id', (req, res, next) => {
    try {
      const updated = updateProduct(db, req.params.id, req.body);
      res.status(200).json(updated);
    } catch (err) {
      next(err);
    }
  });

  return router;
}

module.exports = createProductsRouter;
