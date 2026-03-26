const express = require('express');
const { isAuthenticated, authorize } = require('../middleware/authMiddleware.js');
const { etagMiddleware } = require('../middleware/etagMiddleware.js');
const {
    createSlider, 
    getAllSliders, 
    getSliderById, 
    updateSlider, 
    deleteSlider,
    getPublicSliders,
    assignSliderToBrands,
    removeSliderFromBrand,
    upload 
} = require('../controller/sliderController.js');

const router = express.Router();

// Public routes - MUST come before parameterized routes
router.get('/public', etagMiddleware, getPublicSliders);

// Admin routes (requires authentication)
router.get('/admin/all', isAuthenticated, authorize(['admin']), getAllSliders);
router.get('/:id', getSliderById);
router.post('/', isAuthenticated, authorize(['admin']), upload.single('image'), createSlider);
router.put('/:id', isAuthenticated, authorize(['admin']), upload.single('image'), updateSlider);
router.delete('/:id', isAuthenticated, authorize(['admin']), deleteSlider);

// Brand assignment routes
router.post('/:id/brands', isAuthenticated, authorize(['admin']), assignSliderToBrands);
router.delete('/:id/brands/:brandId', isAuthenticated, authorize(['admin']), removeSliderFromBrand);

module.exports = router; 