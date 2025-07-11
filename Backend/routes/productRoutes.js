const express = require('express');
const {
    createProduct,
    getAllProducts,
    getProduct,
    updateProduct,
    deleteProduct,
    getProductsByCategory,
    searchProducts,
    getFeaturedProducts,
    getNewArrivals,
    getBestSellers,
    getPublicProductBySlug,
    getAllPublicProducts
} = require('../controller/productController.js');
const { isAuthenticated, authorize } = require('../middleware/authMiddleware.js');
const { productUpload } = require('../middleware/uploadMiddleware.js');

const router = express.Router();

// Public routes
router.get('/public', getAllPublicProducts);
router.get('/public/:slug', getPublicProductBySlug);
router.get('/search', searchProducts);
router.get('/featured', getFeaturedProducts);
router.get('/new-arrivals', getNewArrivals);
router.get('/best-sellers', getBestSellers);
router.get('/category/:categoryId', getProductsByCategory);
router.get('/:id', getProduct);

// Multer error handler middleware
const multerErrorHandler = (err, req, res, next) => {
  if (err) {
    console.error('Multer error:', err);
    return res.status(400).json({ success: false, message: err.message });
  }
  next();
};

// Admin routes
router.get('/', isAuthenticated, authorize(['admin']), getAllProducts);
router.post('/', isAuthenticated, authorize(['admin']), productUpload.any(), multerErrorHandler, createProduct);
router.put('/:id', isAuthenticated, authorize(['admin']), productUpload.any(), multerErrorHandler, updateProduct);
router.delete('/:id', isAuthenticated, authorize(['admin']), deleteProduct);

module.exports = router; 