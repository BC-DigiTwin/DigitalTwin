const express = require('express');
const router = express.Router();

// GET all locations (full hierarchy)
router.get('/', (req, res) => {
  try {
    // TODO: Retrieve all locations from database
    res.status(200).json({
      status: 'success',
      data: {
        locations: []
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// GET location by ID (with children)
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    // TODO: Retrieve location by ID with all children
    res.status(200).json({
      status: 'success',
      data: {
        location: null
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

module.exports = router;
