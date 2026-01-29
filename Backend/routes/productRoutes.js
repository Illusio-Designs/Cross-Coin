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
    getAllPublicProducts,
    getExistingImages,
    uploadImages,
    deleteImages
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

// Multer error handler middleware
const multerErrorHandler = (err, req, res, next) => {
  if (err) {
    console.error('Multer error:', err);
    return res.status(400).json({ success: false, message: err.message });
  }
  next();
};

// Admin routes (specific routes before parameterized routes)
router.get('/', isAuthenticated, authorize(['admin']), getAllProducts);
router.get('/existing-images', isAuthenticated, authorize(['admin']), getExistingImages);
router.post('/upload-images', isAuthenticated, authorize(['admin']), productUpload.any(), multerErrorHandler, uploadImages);
router.delete('/delete-images', isAuthenticated, authorize(['admin']), deleteImages);
router.post('/', isAuthenticated, authorize(['admin']), productUpload.any(), multerErrorHandler, createProduct);
router.put('/:id', isAuthenticated, authorize(['admin']), productUpload.any(), multerErrorHandler, updateProduct);
router.delete('/:id', isAuthenticated, authorize(['admin']), deleteProduct);

// This should be last as it's a parameterized route
router.get('/:id', getProduct);

module.exports = router; 