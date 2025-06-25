const express = require('express');
const {
    createReview,
    getProductReviews,
    getUserReviews,
    getReview,
    updateReview,
    deleteReview,
    moderateReview,
    deleteReviewImage,
    getAllReviews,
    getPublicProductReviews,
    createPublicReview
} = require('../controller/reviewController.js');
const { authenticate, isAdmin } = require('../middleware/authMiddleware.js');
const { upload } = require('../middleware/uploadMiddleware.js');

const router = express.Router();

// Public routes (no auth required)
router.get('/public/:productId', getPublicProductReviews);
router.post('/public', upload.array('files', 5), createPublicReview);
router.get('/product/:productId', getProductReviews);

// Admin routes (requires auth and admin role)
router.get('/admin/all', authenticate, isAdmin, getAllReviews);
router.get('/admin/:reviewId', authenticate, isAdmin, getReview);
router.put('/admin/:reviewId/moderate', authenticate, isAdmin, moderateReview);
router.delete('/admin/:reviewId', authenticate, isAdmin, deleteReview);
router.delete('/admin/images/:imageId', authenticate, isAdmin, deleteReviewImage);

// User routes (requires authentication)
router.get('/user/:userId?', authenticate, getUserReviews);
router.get('/:reviewId', authenticate, getReview);
router.put('/:reviewId', authenticate, updateReview);
router.delete('/:reviewId', authenticate, deleteReview);

module.exports = router; 