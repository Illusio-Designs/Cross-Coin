const express = require('express');
const {
    createCategory, getAllCategories, getCategoryById,
    updateCategory, deleteCategory, getPublicCategories, getPublicCategoryByName
} = require('../controller/categoryController.js');
const { isAuthenticated, isProductManager } = require('../middleware/authMiddleware.js');
const { categoryUpload } = require('../middleware/uploadMiddleware.js');
const { etagMiddleware } = require('../middleware/etagMiddleware.js');

const router = express.Router();

// Public
router.get('/listing',          etagMiddleware, getPublicCategories);
router.get('/public',           etagMiddleware, getPublicCategories);  // backward compat
router.get('/by-name/:name',    getPublicCategoryByName);
router.get('/public/name/:name', getPublicCategoryByName);            // backward compat

// Admin
router.post('/',                isAuthenticated, isProductManager, categoryUpload.single('image'), createCategory);
router.put('/:id',              isAuthenticated, isProductManager, categoryUpload.single('image'), updateCategory);
router.delete('/:id',          isAuthenticated, isProductManager, deleteCategory);
router.get('/',                 isAuthenticated, isProductManager, getAllCategories);
router.get('/:id',              isAuthenticated, isProductManager, getCategoryById);

module.exports = router;
