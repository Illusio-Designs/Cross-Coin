const express = require('express');
const multer = require('multer');
const {
    createReview, getProductReviews, getReview,
    updateReview, deleteReview, moderateReview, deleteReviewImage,
    getAllReviews, getPublicProductReviews, createPublicReview, getAllPublicReviews,
    bulkUploadReviews
} = require('../controller/reviewController.js');
const { authenticate, isOrderManager } = require('../middleware/authMiddleware.js');
const { upload } = require('../middleware/uploadMiddleware.js');

const router = express.Router();

// Dedicated in-memory upload for the bulk-review spreadsheet (parsed, never
// written to disk). Accepts Excel / CSV only, one file, up to 5 MB.
const SHEET_MIMES = [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
    'application/vnd.ms-excel',                                          // .xls
    'text/csv', 'application/csv', 'text/plain',                         // .csv
    'application/octet-stream',                                          // some browsers
];
const sheetUpload = multer({
    storage: multer.memoryStorage(),
    limits: { fileSize: 5 * 1024 * 1024, files: 1 },
    fileFilter: (req, file, cb) => {
        const ok = SHEET_MIMES.includes(file.mimetype) || /\.(xlsx|xls|csv)$/i.test(file.originalname || '');
        cb(ok ? null : new Error('Only .xlsx, .xls or .csv files are allowed'), ok);
    },
});

// Public
router.get('/all',                  getAllPublicReviews);
router.get('/product/:productId',   getPublicProductReviews);
router.post('/submit',              upload.array('files', 5), createPublicReview);

// Admin
router.post('/admin/bulk-upload',   authenticate, isOrderManager, sheetUpload.single('file'), bulkUploadReviews);
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
