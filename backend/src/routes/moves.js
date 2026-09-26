const express = require('express');
const { getMoves } = require('../services/stockService');

function createMovesRouter(db) {
  const router = express.Router();

  // GET /api/moves - Stock ledger / Move history
  router.get('/', (req, res, next) => {
    try {
      const moves = getMoves(db);
      res.json(moves);
    } catch (err) {
      next(err);
    }
  });

  return router;
}

module.exports = createMovesRouter;
