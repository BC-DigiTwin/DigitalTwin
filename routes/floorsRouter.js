const express = require('express');
const router = express.Router();

// GET all floors
router.get('/', (req, res) => {
  try {
    // TODO: Retrieve all floors from database
    res.status(200).json({
      status: 'success',
      data: {
        floors: []
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// GET floors by building ID
router.get('/building/:buildingId', (req, res) => {
  try {
    const { buildingId } = req.params;
    // TODO: Retrieve floors for specific building
    res.status(200).json({
      status: 'success',
      data: {
        floors: []
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// CREATE a new floor
router.post('/', (req, res) => {
  try {
    const { buildingId, floorNumber, name } = req.body;
    // TODO: Validate input and create floor in database
    res.status(201).json({
      status: 'success',
      data: {
        floor: null
      }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

// GET floor by ID
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    // TODO: Retrieve floor by ID with rooms
    res.status(200).json({
      status: 'success',
      data: {
        floor: null
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// UPDATE a floor
router.patch('/:id', (req, res) => {
  try {
    const { id } = req.params;
    // TODO: Update floor in database
    res.status(200).json({
      status: 'success',
      data: {
        floor: null
      }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

// DELETE a floor
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    // TODO: Delete floor from database
    res.status(204).json(null);
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

module.exports = router;
