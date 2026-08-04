const express = require('express');
const { isAuthenticated, isProductManager } = require('../middleware/authMiddleware.js');
const { etagMiddleware } = require('../middleware/etagMiddleware.js');
const {
    createSlider, getAllSliders, getSliderById, updateSlider, deleteSlider,
    getPublicSliders, assignSliderToBrands, removeSliderFromBrand, upload
} = require('../controller/sliderController.js');

const router = express.Router();

// Public
router.get('/listing',              etagMiddleware, getPublicSliders);

// Admin
router.get('/admin/all',            isAuthenticated, isProductManager, getAllSliders);
router.get('/:id',                  getSliderById);
router.post('/',                    isAuthenticated, isProductManager, upload.single('image'), createSlider);
router.put('/:id',                  isAuthenticated, isProductManager, upload.single('image'), updateSlider);
router.delete('/:id',              isAuthenticated, isProductManager, deleteSlider);
router.post('/:id/brands',         isAuthenticated, isProductManager, assignSliderToBrands);
router.delete('/:id/brands/:brandId', isAuthenticated, isProductManager, removeSliderFromBrand);

module.exports = router;
