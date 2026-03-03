const express = require('express');
const router = express.Router();
const brandAssignmentController = require('../controller/brandAssignmentController');
const { authenticate, isAdmin } = require('../middleware/authMiddleware');

// All routes require admin authentication
router.use('/', authenticate, isAdmin);

// Product brand assignments
router.post('/products/:productId/brands', brandAssignmentController.assignBrandsToProduct);
router.get('/products/with-brands', brandAssignmentController.getAllProductsWithBrands);

// Category brand assignments
router.post('/categories/:categoryId/brands', brandAssignmentController.assignBrandsToCategory);
router.get('/categories/with-brands', brandAssignmentController.getAllCategoriesWithBrands);

module.exports = router;
