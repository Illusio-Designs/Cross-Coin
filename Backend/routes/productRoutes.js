const express = require('express');
const {
    createProduct, getAllProducts, getProduct, updateProduct, deleteProduct,
    getProductsByCategory, searchProducts, getFeaturedProducts,
    getNewArrivals, getBestSellers, getPublicProductBySlug, getAllPublicProducts,
    getExistingImages, uploadImages, deleteImages
} = require('../controller/productController.js');
const { isAuthenticated, isProductManager } = require('../middleware/authMiddleware.js');
const { productUpload } = require('../middleware/uploadMiddleware.js');

const router = express.Router();

const multerErr = (err, req, res, next) => {
  if (err) return res.status(400).json({ success: false, message: err.message });
  next();
};

// ── Public ────────────────────────────────────────────────────────────────
router.get('/catalog',              getAllPublicProducts);
router.get('/by-slug/:slug',        getPublicProductBySlug);
router.get('/search',               searchProducts);
router.get('/featured',             getFeaturedProducts);
router.get('/new-arrivals',         getNewArrivals);
router.get('/best-sellers',         getBestSellers);
router.get('/category/:categoryId', getProductsByCategory);

// ── Admin / Product Manager ───────────────────────────────────────────────
router.get('/',                     isAuthenticated, isProductManager, getAllProducts);
router.get('/existing-images',      isAuthenticated, isProductManager, getExistingImages);
router.post('/upload-images',       isAuthenticated, isProductManager, productUpload.any(), multerErr, uploadImages);
router.delete('/delete-images',     isAuthenticated, isProductManager, deleteImages);
router.post('/',                    isAuthenticated, isProductManager, productUpload.any(), multerErr, createProduct);
router.put('/:id',                  isAuthenticated, isProductManager, productUpload.any(), multerErr, updateProduct);
router.delete('/:id',              isAuthenticated, isProductManager, deleteProduct);

// ── Public by ID (last — parameterized) ───────────────────────────────────
router.get('/:id', getProduct);

module.exports = router;
