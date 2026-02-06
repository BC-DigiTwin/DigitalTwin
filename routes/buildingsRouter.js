const express = require('express');
const router = express.Router();

// GET all buildings
router.get('/', (req, res) => {
  try {
    // TODO: Retrieve all buildings from database
    res.status(200).json({
      status: 'success',
      data: {
        buildings: []
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// CREATE a new building
router.post('/', (req, res) => {
  try {
    const { name, latitude, longitude, description } = req.body;
    // TODO: Validate input and create building in database
    res.status(201).json({
      status: 'success',
      data: {
        building: null
      }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

// GET building by ID
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    // TODO: Retrieve building by ID with floors
    res.status(200).json({
      status: 'success',
      data: {
        building: null
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// UPDATE a building
router.patch('/:id', (req, res) => {
  try {
    const { id } = req.params;
    // TODO: Update building in database
    res.status(200).json({
      status: 'success',
      data: {
        building: null
      }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

// DELETE a building
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    // TODO: Delete building from database
    res.status(204).json(null);
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

module.exports = router;
