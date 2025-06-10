import express from 'express';
import { 
    createCategory,
    getAllCategories,
    getCategory,
    updateCategory,
    deleteCategory,
    getPublicCategories,
    getPublicCategoryById
} from '../controller/categoryController.js';
import { isAuthenticated, authorize } from '../middleware/authMiddleware.js';
import upload from '../middleware/uploadMiddleware.js';

const router = express.Router();

// Public routes
router.get('/public', getPublicCategories);
router.get('/public/:id', getPublicCategoryById);

// Admin routes (requires authentication)
router.get('/admin', isAuthenticated, authorize(['admin']), getAllCategories);
router.get('/admin/:id', isAuthenticated, authorize(['admin']), getCategory);
router.post('/admin', isAuthenticated, authorize(['admin']), upload.single('image'), createCategory);
router.put('/admin/:id', isAuthenticated, authorize(['admin']), upload.single('image'), updateCategory);
router.delete('/admin/:id', isAuthenticated, authorize(['admin']), deleteCategory);

export default router;