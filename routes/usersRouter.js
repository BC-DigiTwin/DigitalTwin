const express = require('express');
const router = express.Router();

// GET all users
router.get('/', (req, res) => {
  try {
    // TODO: Retrieve all users from database
    res.status(200).json({
      status: 'success',
      data: {
        users: []
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// CREATE a new user (registration)
router.post('/register', (req, res) => {
  try {
    const { email, password, name } = req.body;
    // TODO: Validate input, hash password, and create user in database
    res.status(201).json({
      status: 'success',
      data: {
        user: null
      }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

// LOGIN user
router.post('/login', (req, res) => {
  try {
    const { email, password } = req.body;
    // TODO: Authenticate user and create session/token
    res.status(200).json({
      status: 'success',
      data: {
        user: null,
        token: null
      }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

// GET user by ID
router.get('/:id', (req, res) => {
  try {
    const { id } = req.params;
    // TODO: Retrieve user by ID
    res.status(200).json({
      status: 'success',
      data: {
        user: null
      }
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      message: error.message
    });
  }
});

// UPDATE user profile
router.patch('/:id', (req, res) => {
  try {
    const { id } = req.params;
    // TODO: Update user in database
    res.status(200).json({
      status: 'success',
      data: {
        user: null
      }
    });
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

// DELETE user
router.delete('/:id', (req, res) => {
  try {
    const { id } = req.params;
    // TODO: Delete user from database
    res.status(204).json(null);
  } catch (error) {
    res.status(400).json({
      status: 'error',
      message: error.message
    });
  }
});

module.exports = router;
