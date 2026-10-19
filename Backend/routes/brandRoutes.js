const express = require('express');
const router = express.Router();
const brandController = require('../controller/brandController');
const { authenticate, isProductManager, isStaff } = require('../middleware/authMiddleware');

// Mounted at /api/admin next to other admin routers, so guard only /brands.
// Every staff role can READ brands (order, product and WhatsApp managers all
// filter by brand); changes need a product manager or admin.
router.use('/brands', authenticate);
const canWrite = isProductManager;

// Search brands (must be before /:id route)
router.get('/brands/search', isStaff, brandController.searchBrands);

// Get all brands
router.get('/brands', isStaff, brandController.getAllBrands);

// Get brand by ID
router.get('/brands/:id', isStaff, brandController.getBrandById);

// Create new brand
router.post('/brands', canWrite, brandController.createBrand);

// Update brand
router.put('/brands/:id', canWrite, brandController.updateBrand);

// Toggle brand status
router.patch('/brands/:id/toggle-status', canWrite, brandController.toggleBrandStatus);

// Delete brand
router.delete('/brands/:id', canWrite, brandController.deleteBrand);

module.exports = router;
