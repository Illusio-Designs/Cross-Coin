const express = require('express');
const {
    createCategory,
    getAllCategories,
    getCategoryById,
    updateCategory,
    deleteCategory,
    getPublicCategories,
    getPublicCategoryByName
} = require('../controller/categoryController.js');
const { isAuthenticated, authorize, isProductManager } = require('../middleware/authMiddleware.js');
const { categoryUpload } = require('../middleware/uploadMiddleware.js');
const { etagMiddleware } = require('../middleware/etagMiddleware.js');

const router = express.Router();

// Public routes
router.get('/public', etagMiddleware, getPublicCategories);
router.get('/public/name/:name', getPublicCategoryByName);

// Product Manager routes
router.post('/', isAuthenticated, isProductManager, categoryUpload.single('image'), createCategory);
router.put('/:id', isAuthenticated, isProductManager, categoryUpload.single('image'), updateCategory);
router.delete('/:id', isAuthenticated, isProductManager, deleteCategory);
router.get('/', isAuthenticated, isProductManager, getAllCategories);
router.get('/:id', isAuthenticated, isProductManager, getCategoryById);

module.exports = router;