const express = require('express');
const router = express.Router();
const LocationService = require('../services/locationsService');
// instantiate service (will attempt to create a PrismaClient if available)
let locationsService;
try {
  locationsService = new LocationService();
} catch (e) {
  // If no DB client is available, keep `locationsService` undefined;
  // routes will return a helpful error.
  locationsService = null;
}

// GET all locations (full hierarchy)
router.get('/', async (req, res) => {
  try {
    if (!locationsService) throw new Error('LocationService not initialized. Provide a DB client or install @prisma/client');
    const locations = await locationsService.getAllLocations();
    res.status(200).json({
      status: 'success',
      data: { locations }
    });
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ status: 'error', message: error.message });
  }
});

// CREATE a new location
router.post('/', async (req, res) => {
  try {
    const payload = req.body;
    if (!locationsService) throw new Error('LocationService not initialized. Provide a DB client or install @prisma/client');
    const created = await locationsService.createLocation(payload);
    res.status(201).json({ status: 'success', data: { location: created } });
  } catch (error) {
    const status = error.statusCode || 400;
    res.status(status).json({ status: 'error', message: error.message });
  }
});

// GET location by ID (with children)
router.get('/:id', async (req, res) => {
  try {
    const { id } = req.params;
    if (!locationsService) throw new Error('LocationService not initialized. Provide a DB client or install @prisma/client');
    if (typeof locationsService.getLocationById === 'function') {
      const location = await locationsService.getLocationById(id);
      res.status(200).json({ status: 'success', data: { location } });
    } else {
      res.status(501).json({ status: 'error', message: 'getLocationById not implemented in LocationService' });
    }
  } catch (error) {
    const status = error.statusCode || 500;
    res.status(status).json({ status: 'error', message: error.message });
  }
});

module.exports = router;
