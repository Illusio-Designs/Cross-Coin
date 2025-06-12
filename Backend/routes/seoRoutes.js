import express from 'express';
import { 
    getSEOData, 
    getAllSEOData, 
    updateSEOData, 
    createSEOData,
    deleteSEOData
} from '../controller/seoController.js';
import { isAuthenticated, authorize } from '../middleware/authMiddleware.js';
import { upload } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// Public routes
router.get('/', getSEOData); // Get SEO data for a specific page (?page_name=home)

// Admin routes
router.get('/all', isAuthenticated, authorize(['admin']), getAllSEOData);
router.post('/create', 
    isAuthenticated, 
    authorize(['admin']), 
    upload.single('meta_image'), 
    createSEOData
);
router.put('/update', 
    isAuthenticated, 
    authorize(['admin']), 
    upload.single('meta_image'), 
    updateSEOData
);
router.delete('/:pageName', isAuthenticated, authorize(['admin']), deleteSEOData);

export default router; 