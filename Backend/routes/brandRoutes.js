const express = require('express');
const router = express.Router();
const brandController = require('../controller/brandController');
const { authenticate, isAdmin } = require('../middleware/authMiddleware');

// All routes require admin authentication
router.use('/', authenticate, isAdmin);

// Search brands (must be before /:id route)
router.get('/brands/search', brandController.searchBrands);

// Get all brands
router.get('/brands', brandController.getAllBrands);

// Get brand by ID
router.get('/brands/:id', brandController.getBrandById);

// Create new brand
router.post('/brands', brandController.createBrand);

// Update brand
router.put('/brands/:id', brandController.updateBrand);

// Toggle brand status
router.patch('/brands/:id/toggle-status', brandController.toggleBrandStatus);

// Delete brand
router.delete('/brands/:id', brandController.deleteBrand);

module.exports = router;
