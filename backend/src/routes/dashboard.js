const express = require('express');
const { getDashboard } = require('../services/stockService');

function createDashboardRouter(db) {
  const router = express.Router();

  // GET /api/dashboard - Aggregated inventory intelligence & metrics
  router.get('/', (req, res, next) => {
    try {
      const dashboard = getDashboard(db);
      res.json(dashboard);
    } catch (err) {
      next(err);
    }
  });

  return router;
}

module.exports = createDashboardRouter;
