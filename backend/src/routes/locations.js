const express = require('express');
const { getLocations } = require('../services/stockService');

function createLocationsRouter(db) {
  const router = express.Router();

  // GET /api/locations - List all warehouses and locations
  router.get('/', (req, res, next) => {
    try {
      const locations = getLocations(db);
      res.json(locations);
    } catch (err) {
      next(err);
    }
  });

  return router;
}

module.exports = createLocationsRouter;
