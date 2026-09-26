const express = require('express');
const { getStock } = require('../services/stockService');

function createStockRouter(db) {
  const router = express.Router();

  // GET /api/stock - Current stock balances per product and location
  router.get('/', (req, res, next) => {
    try {
      const stock = getStock(db);
      res.json(stock);
    } catch (err) {
      next(err);
    }
  });

  return router;
}

module.exports = createStockRouter;
