import express from 'express';
import { 
    createProduct,
    getAllProducts,
    getProduct,
    updateProduct,
    deleteProduct,
    getProductsByCategory,
    searchProducts,
    getFeaturedProducts,
    getNewArrivals,
    getBestSellers,
    getPublicProductById,
    getAllPublicProducts
} from '../controller/productController.js';
import { isAuthenticated, authorize } from '../middleware/authMiddleware.js';
import { productUpload } from '../middleware/uploadMiddleware.js';

const router = express.Router();

// Public routes
router.get('/public', getAllPublicProducts);
router.get('/public/:id', getPublicProductById);
router.get('/search', searchProducts);
router.get('/featured', getFeaturedProducts);
router.get('/new-arrivals', getNewArrivals);
router.get('/best-sellers', getBestSellers);
router.get('/category/:categoryId', getProductsByCategory);
router.get('/:id', getProduct);

// Admin routes
router.get('/', isAuthenticated, authorize(['admin']), getAllProducts);
router.post('/', isAuthenticated, authorize(['admin']), productUpload.array('images', 5), createProduct);
router.put('/:id', isAuthenticated, authorize(['admin']), productUpload.array('images', 5), updateProduct);
router.delete('/:id', isAuthenticated, authorize(['admin']), deleteProduct);

export default router; 