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
const { isAuthenticated, authorize } = require('../middleware/authMiddleware.js');
const { categoryUpload } = require('../middleware/uploadMiddleware.js');

const router = express.Router();

// Public routes
router.get('/public', getPublicCategories);
router.get('/public/name/:name', getPublicCategoryByName);

// Admin routes
router.post('/', isAuthenticated, authorize(['admin']), categoryUpload.single('image'), createCategory);
router.put('/:id', isAuthenticated, authorize(['admin']), categoryUpload.single('image'), updateCategory);
router.delete('/:id', isAuthenticated, authorize(['admin']), deleteCategory);
router.get('/', isAuthenticated, authorize(['admin']), getAllCategories);
router.get('/:id', isAuthenticated, authorize(['admin']), getCategoryById);

module.exports = router;