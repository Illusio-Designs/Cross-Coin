import express from 'express';
import { 
    getSEOData, 
    getAllSEOData, 
    updateSEOData, 
    createSEOData
} from '../controller/seoController.js';
import { isAuthenticated, authorize } from '../middleware/authMiddleware.js';
import upload from '../middleware/uploadMiddleware.js';

const router = express.Router();

// Public routes
router.get('/', getSEOData); // Get SEO data for a specific page (?page_name=home)

// Admin routes
router.get('/all', isAuthenticated, authorize(['admin']), getAllSEOData);
router.post('/create', isAuthenticated, authorize(['admin']), createSEOData);
router.put('/update', 
    isAuthenticated, 
    authorize(['admin']), 
    upload.single('image'), 
    updateSEOData
);

export default router; 