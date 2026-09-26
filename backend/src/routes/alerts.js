const express = require('express');
const { getAlerts } = require('../services/stockService');

function createAlertsRouter(db) {
  const router = express.Router();

  // GET /api/alerts - Real-time inventory and operational alerts
  router.get('/', (req, res, next) => {
    try {
      const alerts = getAlerts(db);
      res.json(alerts);
    } catch (err) {
      next(err);
    }
  });

  return router;
}

module.exports = createAlertsRouter;
