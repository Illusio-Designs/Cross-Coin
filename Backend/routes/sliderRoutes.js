import express from 'express';
import { isAuthenticated, authorize } from '../middleware/authMiddleware.js';
import { 
    createSlider, 
    getAllSliders, 
    getSliderById, 
    updateSlider, 
    deleteSlider,
    getPublicSliders,
    upload 
} from '../controller/sliderController.js';

const router = express.Router();

// Public routes
router.get('/public/sliders', getPublicSliders);
router.get('/:id', getSliderById);

// Admin routes (requires authentication)
router.get('/admin/all', isAuthenticated, authorize(['admin']), getAllSliders);
router.post('/', isAuthenticated, authorize(['admin']), upload.single('image'), createSlider);
router.put('/:id', isAuthenticated, authorize(['admin']), upload.single('image'), updateSlider);
router.delete('/:id', isAuthenticated, authorize(['admin']), deleteSlider);

export default router; 