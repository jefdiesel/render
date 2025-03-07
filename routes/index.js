const express = require('express');
const scanRoutes = require('./scan');
const reportRoutes = require('./reports');

const router = express.Router();

// Health check endpoint
router.get('/', (req, res) => {
  res.json({ 
    status: 'ok',
    message: 'A11yscan API is running',
    version: '1.0.0'
  });
});

// Register route modules
router.use('/api', scanRoutes);
router.use('/api', reportRoutes);

module.exports = router;
