import express from 'express';
import { 
    createCategory,
    getAllCategories,
    getCategoryById,
    updateCategory,
    deleteCategory,
    getPublicCategories,
    getPublicCategoryById
} from '../controller/categoryController.js';
import { isAuthenticated, authorize } from '../middleware/authMiddleware.js';
import { categoryUpload } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// Public routes
router.get('/public', getPublicCategories);
router.get('/public/:id', getPublicCategoryById);

// Admin routes
router.post('/', isAuthenticated, authorize(['admin']), categoryUpload.single('image'), createCategory);
router.put('/:id', isAuthenticated, authorize(['admin']), categoryUpload.single('image'), updateCategory);
router.delete('/:id', isAuthenticated, authorize(['admin']), deleteCategory);
router.get('/', isAuthenticated, authorize(['admin']), getAllCategories);
router.get('/:id', isAuthenticated, authorize(['admin']), getCategoryById);

export default router;