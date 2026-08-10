const express = require('express');
const {
    createReview, getProductReviews, getReview,
    updateReview, deleteReview, moderateReview, deleteReviewImage,
    getAllReviews, getPublicProductReviews, createPublicReview, getAllPublicReviews
} = require('../controller/reviewController.js');
const { authenticate, isOrderManager } = require('../middleware/authMiddleware.js');
const { upload } = require('../middleware/uploadMiddleware.js');

const router = express.Router();

// Public
router.get('/all',                  getAllPublicReviews);
router.get('/product/:productId',   getPublicProductReviews);
router.post('/submit',              upload.array('files', 5), createPublicReview);

// Admin
router.get('/admin/all',            authenticate, isOrderManager, getAllReviews);
router.get('/admin/:reviewId',      authenticate, isOrderManager, getReview);
router.put('/admin/:reviewId/moderate', authenticate, isOrderManager, moderateReview);
router.delete('/admin/:reviewId',   authenticate, isOrderManager, deleteReview);
router.delete('/admin/images/:imageId', authenticate, isOrderManager, deleteReviewImage);

// User
router.get('/:reviewId',           authenticate, getReview);
router.put('/:reviewId',           authenticate, updateReview);
router.delete('/:reviewId',       authenticate, deleteReview);

module.exports = router;
