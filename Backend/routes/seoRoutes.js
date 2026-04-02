const express = require('express');
const {
    getSEOData, 
    getAllSEOData, 
    updateSEOData, 
    createSEOData,
    deleteSEOData
} = require('../controller/seoController.js');
const { isAuthenticated, authorize, isProductManager } = require('../middleware/authMiddleware.js');
const { upload } = require('../middleware/uploadMiddleware.js');

const router = express.Router();

// Public routes
router.get('/', getSEOData);

// Product Manager routes
router.get('/all', isAuthenticated, isProductManager, getAllSEOData);
router.post('/create', isAuthenticated, isProductManager, upload.single('meta_image'), createSEOData);
router.put('/update', isAuthenticated, isProductManager, upload.single('meta_image'), updateSEOData);
router.delete('/:pageName', isAuthenticated, isProductManager, deleteSEOData);

module.exports = router; 