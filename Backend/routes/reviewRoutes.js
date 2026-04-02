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
    createPublicReview,
    getAllPublicReviews
} = require('../controller/reviewController.js');
const { authenticate, isOrderManager } = require('../middleware/authMiddleware.js');
const { upload } = require('../middleware/uploadMiddleware.js');

const router = express.Router();

// Public routes (no auth required)
router.get('/public/all', getAllPublicReviews);
router.get('/public/:productId', getPublicProductReviews);
router.post('/public', upload.array('files', 5), createPublicReview);
router.get('/product/:productId', getProductReviews);

// Order Manager routes — review moderation
router.get('/admin/all', authenticate, isOrderManager, getAllReviews);
router.get('/admin/:reviewId', authenticate, isOrderManager, getReview);
router.put('/admin/:reviewId/moderate', authenticate, isOrderManager, moderateReview);
router.delete('/admin/:reviewId', authenticate, isOrderManager, deleteReview);
router.delete('/admin/images/:imageId', authenticate, isOrderManager, deleteReviewImage);

// User routes (requires authentication)
router.get('/user/:userId?', authenticate, getUserReviews);
router.get('/:reviewId', authenticate, getReview);
router.put('/:reviewId', authenticate, updateReview);
router.delete('/:reviewId', authenticate, deleteReview);

module.exports = router;
