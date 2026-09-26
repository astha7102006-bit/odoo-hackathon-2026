const express = require('express');
const { getProducts } = require('../services/stockService');

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

  return router;
}

module.exports = createProductsRouter;
