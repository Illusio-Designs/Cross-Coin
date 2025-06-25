const express = require('express');
const {
    getSEOData, 
    getAllSEOData, 
    updateSEOData, 
    createSEOData,
    deleteSEOData
} = require('../controller/seoController.js');
const { isAuthenticated, authorize } = require('../middleware/authMiddleware.js');
const { upload } = require('../middleware/uploadMiddleware.js');

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

module.exports = router; 