const express = require('express');
const router = express.Router();
const brandAssignmentController = require('../controller/brandAssignmentController');
const { authenticate, isAdmin, isProductManager } = require('../middleware/authMiddleware');

// All routes require product manager or admin authentication
router.use('/', authenticate, isProductManager);

// Product brand assignments
router.post('/products/:productId/brands', brandAssignmentController.assignBrandsToProduct);
router.get('/products/with-brands', brandAssignmentController.getAllProductsWithBrands);

// Category brand assignments
router.post('/categories/:categoryId/brands', brandAssignmentController.assignBrandsToCategory);
router.get('/categories/with-brands', brandAssignmentController.getAllCategoriesWithBrands);

module.exports = router;
