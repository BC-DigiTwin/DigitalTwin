const express = require('express');
const router = express.Router();

// GET all rooms
router.get('/', (req, res) => {
  try {
    // TODO: Retrieve all rooms from database
    res.status(200).json({
      status: 'success',
      data: {
        rooms: []
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// GET rooms by floor ID
router.get('/floor/:floorId', (req, res) => {
  try {
    const { floorId } = req.params;
    // TODO: Retrieve rooms for specific floor
    res.status(200).json({
      status: 'success',
      data: {
        rooms: []
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// CREATE a new room
router.post('/', (req, res) => {
  try {
    const { floorId, roomNumber, name, description, type } = req.body;
    // TODO: Validate input and create room in database
    res.status(201).json({
      status: 'success',
      data: {
        room: null
      }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

// GET room by ID
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    // TODO: Retrieve room by ID
    res.status(200).json({
      status: 'success',
      data: {
        room: null
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// UPDATE a room
router.patch('/:id', (req, res) => {
  try {
    const { id } = req.params;
    // TODO: Update room in database
    res.status(200).json({
      status: 'success',
      data: {
        room: null
      }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

// DELETE a room
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    // TODO: Delete room from database
    res.status(204).json(null);
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

module.exports = router;
