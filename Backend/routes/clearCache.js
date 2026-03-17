const express = require('express');
const router = express.Router();
const cacheManager = require('../services/cacheManager');

// Clear all cache - useful after database updates
router.post('/clear-all', async (req, res) => {
  try {
    await cacheManager.invalidate('*');
    res.json({
      success: true,
      message: 'All cache cleared successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error clearing cache',
      error: error.message
    });
  }
});

// Clear category cache only
router.post('/clear-categories', async (req, res) => {
  try {
    await cacheManager.invalidate('category:*');
    await cacheManager.invalidate('categories:*');
    res.json({
      success: true,
      message: 'Category cache cleared successfully'
    });
  } catch (error) {
    res.status(500).json({
      success: false,
      message: 'Error clearing category cache',
      error: error.message
    });
  }
});

module.exports = router;
