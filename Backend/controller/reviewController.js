const { Review } = require('../model/reviewModel.js');
const { ReviewImage } = require('../model/reviewImageModel.js');
const { Product } = require('../model/productModel.js');
const { User } = require('../model/userModel.js');
const Brand = require('../model/brandModel.js');
const path = require('path');
const fs = require('fs');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db.js');
const imagekitService = require('../services/imagekitService.js');
const cacheManager = require('../services/cacheManager.js');
const redisService = require('../services/redisService.js');
const { logger } = require('../config/logging.js');
const XLSX = require('xlsx');

// Helper to update product review statistics
const updateProductReviewStats = async (productIdToUpdate, transaction) => {
    try {
        const pId = parseInt(productIdToUpdate);
        if (isNaN(pId)) {
            logger.error('Invalid productId for stats update:', productIdToUpdate);
            return;
        }

        // Calculate average rating and count for approved reviews
        const statsResult = await Review.findOne({
            where: { 
                productId: pId,
                status: 'approved'
            },
            attributes: [
                [sequelize.fn('AVG', sequelize.col('rating')), 'avg_rating'],
                [sequelize.fn('COUNT', sequelize.col('id')), 'review_count']
            ],
            group: ['productId'], // Group by productId to ensure correct aggregation
            raw: true, // Get plain data object
            transaction
        });

        const avgRating = statsResult ? parseFloat(statsResult.avg_rating) : 0;
        const reviewCount = statsResult ? parseInt(statsResult.review_count) : 0;

        // Check if product has video reviews (approved)
        const hasVideoReviews = await ReviewImage.findOne({
            include: [{
                model: Review,
                as: 'Review', // Make sure alias matches if defined in ReviewImage model
                where: { 
                    productId: pId,
                    status: 'approved'
                },
                attributes: [] // We don't need Review attributes, just existence
            }],
            where: { fileType: 'video' },
            transaction
        });

        // Update product statistics
        await Product.update({
            avg_rating: avgRating,
            review_count: reviewCount,
            has_video_reviews: !!hasVideoReviews
        }, {
            where: { id: pId },
            transaction
        });

    } catch (error) {
        logger.error('Error updating product review stats:', error);
        // Do not re-throw error if called from multiple places, let the original caller handle it
    }
};


// Create a public review (for non-logged-in users)
module.exports.createPublicReview = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        // Rate limiting for public reviews via Redis (15 min window, max 5 submissions)
        const ip = req.ip || req.connection.remoteAddress;
        const rateLimitKey = `ratelimit:review:${ip}`;
        const windowSec = 15 * 60; // 900 seconds
        const maxReviews = 5;
        const count = await redisService.incr(rateLimitKey);
        if (count === 1) {
            // First request in this window — set expiry so key auto-cleans
            await redisService.expire(rateLimitKey, windowSec);
        }
        if (count !== null && count > maxReviews) {
            await transaction.rollback();
            return res.status(429).json({ success: false, message: 'Too many reviews. Please try again later.' });
        }

        const { productId: productIdBody, rating: ratingBody, comment, name, email } = req.body;
        const files = req.files;

        // Sanitize review text to prevent XSS
        const sanitizedComment = (comment || '').replace(/<[^>]*>/g, '').trim();

        const productId = parseInt(productIdBody);
        const parsedRating = parseInt(ratingBody);

        if (!productId || isNaN(productId) || !parsedRating || isNaN(parsedRating) || !sanitizedComment || !name || !email) {
            await transaction.rollback();
            return res.status(400).json({
                success: false,
                message: 'Please provide all required fields: productId, rating, comment, name, and email'
            });
        }
        if (parsedRating < 1 || parsedRating > 5) {
            await transaction.rollback();
            return res.status(400).json({ success: false, message: 'Rating must be between 1 and 5' });
        }

        const product = await Product.findByPk(productId, { transaction });
        if (!product) {
            await transaction.rollback();
            return res.status(404).json({ success: false, message: 'Product not found' });
        }

        const existingReview = await Review.findOne({
            where: {
                productId: productId,
                guestEmail: email // Check by guest email for public reviews
            },
            transaction
        });

        if (existingReview) {
            await transaction.rollback();
            return res.status(400).json({ success: false, message: 'You have already reviewed this product with this email.'});
        }

        const newReview = await Review.create({
            productId: productId,
            rating: parsedRating,
            review: sanitizedComment,
            guestName: name,
            guestEmail: email,
            brandId: req.brandId || null,
            status: 'pending' // All public reviews start as pending
        }, { transaction });

        // Handle review images
        if (files && files.length > 0) {
            // Validate file types and sizes
            const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/webm'];
            const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
            for (const file of files) {
                if (!ALLOWED_TYPES.includes(file.mimetype)) {
                    await transaction.rollback();
                    return res.status(400).json({ success: false, message: `Invalid file type: ${file.mimetype}. Only images and videos are allowed.` });
                }
                if (file.size > MAX_FILE_SIZE) {
                    await transaction.rollback();
                    return res.status(400).json({ success: false, message: `File too large: ${file.originalname}. Maximum size is 10MB.` });
                }
            }

            const reviewImages = [];
            for (const file of files) {
                try {
                    const buffer = await fs.promises.readFile(file.path);
                    const uploadResult = await imagekitService.uploadImage(buffer, file.filename, '/reviews');
                    reviewImages.push({
                        reviewId: newReview.id,
                        fileName: uploadResult.filePath,
                        fileType: file.mimetype.startsWith('video/') ? 'video' : 'image'
                    });
                    fs.unlink(file.path, err => {
                        if (err) logger.error('Failed to delete temp file:', err.message);
                    });
                } catch (uploadErr) {
                    logger.error('Failed to upload review image to ImageKit:', uploadErr.message);
                    reviewImages.push({
                        reviewId: newReview.id,
                        fileName: file.filename,
                        fileType: file.mimetype.startsWith('video/') ? 'video' : 'image'
                    });
                }
            }
            await ReviewImage.bulkCreate(reviewImages, { transaction });
        }

        await transaction.commit();

        // Invalidate reviews cache for this product
        await cacheManager.invalidate(`reviews:${productId}:*`).catch(() => {});

        res.status(201).json({
            success: true,
            message: 'Review submitted successfully and pending moderation',
            review: newReview
        });
    } catch (error) {
        await transaction.rollback();
        logger.error('Error creating public review:', error);
        res.status(500).json({ 
            success: false, 
            message: 'Failed to create review', 
            error: error.message 
        });
    }
};

// Get public reviews for a product (ONLY APPROVED)
module.exports.getPublicProductReviews = async (req, res) => {
    try {
        const { productId } = req.params;
        // Default limit raised 10 → 100 so storefronts that render the full list
        // (and derive the "N reviews" label from the array length) show the real
        // approved count instead of a capped 10. pagination.total still carries
        // the exact total for clients that read it.
        const { page = 1, limit = 100, sort = 'recent' } = req.query;
        
        const pId = parseInt(productId);
        if (isNaN(pId)) {
            return res.status(400).json({ success: false, message: 'Invalid Product ID' });
        }

        // Validate sort param against allowlist
        const allowedSorts = ['recent', 'highest', 'lowest'];
        const validSort = allowedSorts.includes(sort) ? sort : 'recent';

        // Check cache first
        const cacheKey = `reviews:${pId}:${page}:${limit}:${validSort}`;
        const cached = await cacheManager.get(cacheKey);
        if (cached) {
            return res.json(cached);
        }

        const filter = { 
            productId: pId,
            status: 'approved' // Hardcoded to approved for public view
        };
        if (req.brandId) filter.brandId = req.brandId;
        
        let order = [['createdAt', 'DESC']]; 
        if (validSort === 'highest') order = [['rating', 'DESC'], ['createdAt', 'DESC']];
        if (validSort === 'lowest') order = [['rating', 'ASC'], ['createdAt', 'DESC']];
        
        const offset = (parseInt(page) - 1) * parseInt(limit);
        
        const reviewsData = await Review.findAndCountAll({
            where: filter,
            include: [
                { 
                    model: User, 
                    as: 'User', 
                    attributes: ['id', 'username', 'profileImage']
                },
                { 
                    model: ReviewImage, 
                    as: 'ReviewImages'
                }
            ],
            order,
            limit: parseInt(limit),
            offset: offset,
            distinct: true
        });
        
        // Review statistics are now part of the Product model (avg_rating, review_count)
        // We can fetch the product itself to get these pre-calculated stats.
        const productWithStats = await Product.findByPk(pId, {
            attributes: ['avg_rating', 'review_count']
        });

        const ratingDistribution = await Review.findAll({
            where: { productId: pId, status: 'approved' },
            attributes: [
                'rating',
                [sequelize.fn('COUNT', sequelize.col('id')), 'count']
            ],
            group: ['rating']
        });

        const formattedRatingStats = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        ratingDistribution.forEach(stat => {
            formattedRatingStats[stat.rating] = parseInt(stat.getDataValue('count'));
        });
        
        const responseData = {
            success: true,
            reviews: reviewsData.rows.map(r => ({
                ...r.toJSON(),
                // If User is null (guest review), use guestName
                reviewerName: r.User ? r.User.username : r.guestName,
                ReviewImages: r.ReviewImages ? r.ReviewImages.map(img => ({
                    ...img.toJSON(),
                    url: imagekitService.getOptimizedUrl(img.fileName, 'medium')
                })) : []
            })),
            pagination: {
                total: reviewsData.count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(reviewsData.count / parseInt(limit))
            },
            stats: {
                ratings: formattedRatingStats,
                total: productWithStats ? productWithStats.review_count : 0,
                average: productWithStats ? parseFloat(productWithStats.avg_rating) : 0
            }
        };

        // Cache the result for 10 minutes
        await cacheManager.set(cacheKey, responseData, 600).catch(() => {});
        res.json(responseData);
    } catch (error) {
        logger.error('Error getting public product reviews:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to get reviews', 
            error: error.message 
        });
    }
};


// Moderate a review (admin only)
module.exports.moderateReview = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { reviewId } = req.params;
        const { status, is_featured, admin_notes } = req.body;
        
        const rId = parseInt(reviewId);
        if (isNaN(rId)) {
            await transaction.rollback();
            return res.status(400).json({ message: 'Invalid Review ID' });
        }

        if (!status || !['pending', 'approved', 'rejected'].includes(status)) {
            await transaction.rollback();
            return res.status(400).json({ message: 'Valid status (pending, approved, rejected) is required' });
        }
        
        const reviewToModerate = await Review.findByPk(rId, { transaction });
        if (!reviewToModerate) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Review not found' });
        }
        
        const oldStatus = reviewToModerate.status;
        reviewToModerate.status = status;
        if (is_featured !== undefined) reviewToModerate.is_featured = !!is_featured;
        if (admin_notes !== undefined) reviewToModerate.admin_notes = admin_notes;
        
        await reviewToModerate.save({ transaction });
        
        // Update product review statistics if status changed to/from approved
        if (oldStatus !== status && (oldStatus === 'approved' || status === 'approved')) {
            await updateProductReviewStats(reviewToModerate.productId, transaction);
        }
        
        // If marking as featured, update Product.featured_review_id
        // (This logic can be complex if multiple reviews can be featured or only one)
        // Simple case: if is_featured, set it on product, else nullify if this was the one
        if (reviewToModerate.is_featured) {
             await Product.update({ featured_review_id: reviewToModerate.id }, 
                { where: { id: reviewToModerate.productId }, transaction });
        } else {
            // If un-featuring, check if this specific review was the featured one
            const product = await Product.findOne({ where: { id: reviewToModerate.productId, featured_review_id: reviewToModerate.id }, transaction });
            if (product) {
                await Product.update({ featured_review_id: null }, { where: { id: reviewToModerate.productId }, transaction });
            }
        }

        await transaction.commit();
        
        // Invalidate reviews cache for this product
        await cacheManager.invalidate(`reviews:${reviewToModerate.productId}:*`).catch(() => {});

        res.json({
            message: 'Review moderated successfully',
            review: reviewToModerate
        });
    } catch (error) {
        await transaction.rollback();
        logger.error('Error moderating review:', error);
        res.status(500).json({ message: 'Failed to moderate review', error: error.message });
    }
};

// Delete a review
module.exports.deleteReview = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { reviewId } = req.params;
        const rId = parseInt(reviewId);

        if (isNaN(rId)) {
            await transaction.rollback();
            return res.status(400).json({ message: "Invalid Review ID" });
        }

        const reviewToDelete = await Review.findByPk(rId, {
            include: [{ model: ReviewImage, as: 'ReviewImages' }],
            transaction
        });

        if (!reviewToDelete) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Review not found' });
        }

        // Authorization check: only owner or admin can delete
        if (req.user.id !== reviewToDelete.userId && req.user.role !== 'admin') {
            await transaction.rollback();
            return res.status(403).json({ message: 'Access denied. You can only delete your own reviews.' });
        }

        const productId = reviewToDelete.productId;
        const oldStatus = reviewToDelete.status;

        // Delete associated images from storage and database
        if (reviewToDelete.ReviewImages && reviewToDelete.ReviewImages.length > 0) {
            const deleteFilePromises = reviewToDelete.ReviewImages.map(image => {
                // Delete from ImageKit if it's an ImageKit path
                if (image.fileName && (image.fileName.startsWith('/reviews/') || image.fileName.includes('ik.imagekit.io'))) {
                    return imagekitService.deleteImage(image.fileName).catch(err =>
                        logger.error('Failed to delete review image from ImageKit:', err.message)
                    );
                }
                // Otherwise delete from local storage
                const imagePath = path.join(__dirname, '../uploads/reviews', image.fileName);
                return fs.promises.unlink(imagePath).catch(err => logger.error("Failed to delete image file:", err));
            });
            await Promise.all(deleteFilePromises);
            // DB records for ReviewImages will be cascade deleted due to Review.hasMany association with onDelete: 'CASCADE'
        }

        await reviewToDelete.destroy({ transaction });

        // If the deleted review was approved, update product stats
        if (oldStatus === 'approved') {
            await updateProductReviewStats(productId, transaction);
        }
        
        // If this was the featured review, nullify it on product
        const product = await Product.findOne({ where: { id: productId, featured_review_id: rId }, transaction });
        if (product) {
            await Product.update({ featured_review_id: null }, { where: { id: productId }, transaction });
        }

        await transaction.commit();
        res.json({ message: 'Review deleted successfully' });
    } catch (error) {
        await transaction.rollback();
        logger.error('Error deleting review:', error);
        res.status(500).json({ message: 'Failed to delete review', error: error.message });
    }
};

// Get all reviews (Admin purpose)
module.exports.getAllReviews = async (req, res) => {
    try {
        const { page = 1, limit = 10, status, search, sort = 'createdAt_desc' } = req.query;
        const cappedLimit = Math.min(parseInt(limit) || 20, 100);
        const offset = (parseInt(page) - 1) * cappedLimit;

        let order = [['createdAt', 'DESC']];
        if (sort === 'createdAt_asc') order = [['createdAt', 'ASC']];
        if (sort === 'rating_desc') order = [['rating', 'DESC'], ['createdAt', 'DESC']];
        if (sort === 'rating_asc') order = [['rating', 'ASC'], ['createdAt', 'DESC']];

        const whereClause = {};
        if (status && status !== 'all') whereClause.status = status;
        if (req.brandId) whereClause.brandId = req.brandId;

        // Server-side search so it matches across ALL pages, not just the loaded
        // page. Spans the review text, the guest name, and the joined registered
        // user / product names (subQuery must be off for the $assoc.col$ filters
        // to apply alongside limit/offset; distinct still counts unique reviews).
        const q = (search || '').trim();
        if (q) {
            whereClause[Op.or] = [
                { review: { [Op.like]: `%${q}%` } },
                { guestName: { [Op.like]: `%${q}%` } },
                { '$User.username$': { [Op.like]: `%${q}%` } },
                { '$Product.name$': { [Op.like]: `%${q}%` } },
            ];
        }

        const productInclude = {
            model: Product,
            as: 'Product',
            attributes: ['id', 'name'],
        };

        const reviews = await Review.findAndCountAll({
            where: whereClause,
            include: [
                { model: User, as: 'User', attributes: ['id', 'username'] },
                productInclude,
                { model: ReviewImage, as: 'ReviewImages' },
                { model: Brand, as: 'Brand', attributes: ['id', 'name', 'display_name', 'slug'] }
            ],
            order,
            limit: cappedLimit,
            offset,
            distinct: true,
            ...(q ? { subQuery: false } : {}),
        });
        
        res.json({
            reviews: reviews.rows.map(r => {
                const json = r.toJSON();
                return {
                    ...json,
                    productName: r.Product ? r.Product.name : 'N/A',
                    customerName: r.User ? r.User.username : r.guestName || 'Guest',
                    brandName: r.Brand ? (r.Brand.display_name || r.Brand.name) : null,
                };
            }),
            pagination: {
                total: reviews.count,
                page: parseInt(page),
                limit: cappedLimit,
                totalPages: Math.ceil(reviews.count / cappedLimit)
            }
        });
    } catch (error) {
        logger.error('Error fetching all reviews:', error);
        res.status(500).json({ message: 'Failed to fetch reviews', error: error.message });
    }
};

// Get a single review (mainly for admin or specific user check)
module.exports.getReview = async (req, res) => {
    try {
        const { reviewId } = req.params;
        const rId = parseInt(reviewId);
        if (isNaN(rId)) {
            return res.status(400).json({ message: 'Invalid Review ID' });
        }

        const review = await Review.findByPk(rId, {
            include: [
                { model: User, as: 'User', attributes: ['id', 'username', 'profileImage'] },
                { model: Product, as: 'Product', attributes: ['id', 'name', 'slug'] },
                { model: ReviewImage, as: 'ReviewImages' }
            ]
        });

        if (!review) {
            return res.status(404).json({ message: 'Review not found' });
        }

        // Strip moderation fields for non-admin users
        const reviewData = review.toJSON();
        if (!req.user || req.user.role !== 'admin') {
            delete reviewData.status;
            delete reviewData.admin_notes;
        }

        res.json(reviewData);
    } catch (error) {
        logger.error('Error fetching review:', error);
        res.status(500).json({ message: 'Failed to fetch review', error: error.message });
    }
};

// Delete a review image (by owner or admin)
module.exports.deleteReviewImage = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { imageId } = req.params;
        const imgId = parseInt(imageId);
        if (isNaN(imgId)) {
            await transaction.rollback();
            return res.status(400).json({ message: "Invalid Image ID" });
        }
        
        const image = await ReviewImage.findByPk(imgId, {
            include: [{ model: Review, as: 'Review' }], // Assuming ReviewImage.belongsTo(Review, {as: 'Review'})
            transaction
        });
        
        if (!image) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Image not found' });
        }
        
        if (!image.Review) { // Should not happen if FK is enforced
            await transaction.rollback();
            return res.status(500).json({ message: 'Image is orphaned or Review association is missing.' });
        }

        // Permission check
        if (req.user.id !== image.Review.userId && req.user.role !== 'admin') {
            await transaction.rollback();
            return res.status(403).json({ message: 'Access denied to delete this image' });
        }
        
        const imagePath = path.join(__dirname, '../uploads/reviews', image.fileName);
        try {
        if (fs.existsSync(imagePath)) {
                await fs.promises.unlink(imagePath);
            }
        } catch (fileError) {
            logger.error("Error deleting image file from disk:", fileError);
            // Potentially log this but don't fail the DB operation if file is already gone
        }

        await image.destroy({ transaction });
        
        // If this was a video, check if the product still has video reviews
        if (image.fileType === 'video') {
            const product = await Product.findByPk(image.Review.productId, { transaction });
            if (product) {
                 // Re-check if any other approved video reviews exist for this product
                const otherVideoReviews = await ReviewImage.findOne({
                    where: { fileType: 'video', reviewId: { [Op.ne]: image.Review.id } }, // Exclude current review if it has other videos
                include: [{
                        model: Review, as: 'Review',
                        where: { productId: image.Review.productId, status: 'approved' }
                    }],
                    transaction
                });
                if (!otherVideoReviews) {
                    await Product.update({ has_video_reviews: false }, 
                        { where: { id: image.Review.productId }, transaction });
                }
            }
        }
        
        await transaction.commit();
        res.json({ message: 'Image deleted successfully' });
    } catch (error) {
        await transaction.rollback();
        logger.error('Error deleting review image:', error);
        res.status(500).json({ message: 'Failed to delete review image', error: error.message });
    }
};


// Get all public reviews (approved only, for testimonials)
module.exports.getAllPublicReviews = async (req, res) => {
    try {
        // Default raised 20 → 60 so the homepage review slider / testimonials
        // reflect a realistic brand-wide count (pagination.total has the exact).
        const { page = 1, limit = 60, sort = 'recent' } = req.query;
        let order = [['createdAt', 'DESC']];
        if (sort === 'highest') order = [['rating', 'DESC'], ['createdAt', 'DESC']];
        if (sort === 'lowest') order = [['rating', 'ASC'], ['createdAt', 'DESC']];
        // Home testimonials: a random brand-wide sample so the review dates read
        // as spread across the year, instead of only the newest (which all fall
        // on the last day or two). Used by the storefront home marquee.
        if (sort === 'random') order = sequelize.literal('RAND()');

        const offset = (parseInt(page) - 1) * parseInt(limit);

        const whereClause = { status: 'approved' };
        // Filter by brand stored on the review itself
        if (req.brandId) whereClause.brandId = req.brandId;

        const reviewsData = await Review.findAndCountAll({
            where: whereClause,
            include: [
                { model: User, as: 'User', attributes: ['id', 'username', 'profileImage'] },
                { model: Product, as: 'Product', attributes: ['id', 'name'] },
                // ReviewImages are deliberately NOT joined here. This brand-wide
                // feed powers only the home testimonials marquees/sliders, which
                // render text + name + rating (never review photos). Joining the
                // hasMany ReviewImages forced `distinct` + a large payload on
                // every homepage fetch; dropping it makes the query and response
                // far lighter. The PDP review list (which does show photos) uses
                // the separate /api/reviews/product/:id endpoint.
            ],
            order,
            limit: parseInt(limit),
            offset: offset,
        });

        res.json({
            success: true,
            reviews: reviewsData.rows.map(r => ({
                ...r.toJSON(),
                reviewerName: r.User ? r.User.username : r.guestName,
                productName: r.Product ? r.Product.name : 'N/A',
            })),
            pagination: {
                total: reviewsData.count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(reviewsData.count / parseInt(limit))
            }
        });
    } catch (error) {
        logger.error('Error fetching all public reviews:', error);
        res.status(500).json({ success: false, message: 'Failed to fetch reviews', error: error.message });
    }
};


// ---------------------------------------------------------------------------
// Bulk-upload reviews from an Excel / CSV file (admin only).
//
// The admin picks a brand in the dashboard (sent as X-Brand-Name → req.brandId)
// and uploads a spreadsheet. Column headers are matched case / space / under-
// score-insensitively, so "Product ID", "product_id" and "productid" are the
// same column. Each row becomes one review. A per-row report is returned so the
// admin can see exactly which rows were imported and why any were skipped.
//
// Recognised columns (all flexible aliases):
//   product_id | product | sku | title        → product id, NAME/TITLE, or slug
//                                                (one column, any of the three)
//   product_slug | slug | handle              → product slug (optional extra column)
//   product_name | name of product            → product name (optional extra column)
//   rating | stars                            → 1–5 (required)
//   review | comment | review_text | body     → the review text
//   name | reviewer | reviewer_name | customer→ display name (guestName)
//   email | reviewer_email                    → guestEmail (optional)
//   status | state                            → pending | approved | rejected
//                                                (omit → defaults to APPROVED)
//   date | review_date | created_at           → back-dates the review (optional)
//   verified | verified_purchase              → yes/true/1 → verified badge
//   featured | is_featured                    → yes/true/1 → featured review
//   brand | brand_slug                        → per-row brand override (optional)
// ---------------------------------------------------------------------------
module.exports.bulkUploadReviews = async (req, res) => {
    try {
        if (!req.file || !req.file.buffer) {
            return res.status(400).json({ success: false, message: 'No file uploaded. Attach an .xlsx, .xls or .csv file.' });
        }

        // Parse the workbook (xlsx reads .xlsx/.xls/.csv the same way).
        let rows;
        try {
            const workbook = XLSX.read(req.file.buffer, { type: 'buffer', cellDates: true });
            const sheetName = workbook.SheetNames[0];
            if (!sheetName) throw new Error('empty workbook');
            rows = XLSX.utils.sheet_to_json(workbook.Sheets[sheetName], { defval: '', raw: false });
        } catch (parseErr) {
            logger.error('Review bulk-upload parse error:', parseErr.message);
            return res.status(400).json({ success: false, message: 'Could not read the file. Make sure it is a valid Excel (.xlsx/.xls) or CSV file.' });
        }

        if (!Array.isArray(rows) || rows.length === 0) {
            return res.status(400).json({ success: false, message: 'The file has no data rows.' });
        }

        const MAX_ROWS = 2000;
        if (rows.length > MAX_ROWS) {
            return res.status(400).json({ success: false, message: `Too many rows (${rows.length}). Please upload at most ${MAX_ROWS} rows at a time.` });
        }

        // Normalise a row's keys → lowercase, strip spaces/underscores/hyphens.
        const norm = (obj) => {
            const out = {};
            Object.keys(obj).forEach(k => {
                const nk = String(k).toLowerCase().replace(/[\s_\-]+/g, '');
                out[nk] = obj[k];
            });
            return out;
        };
        const pick = (r, ...keys) => {
            for (const k of keys) {
                const v = r[k];
                if (v !== undefined && v !== null && String(v).trim() !== '') return String(v).trim();
            }
            return '';
        };
        const toBool = (v) => ['1', 'true', 'yes', 'y', 'verified', 'featured'].includes(String(v).toLowerCase().trim());
        const toStatus = (v, fallback) => {
            const s = String(v || '').toLowerCase().trim();
            return ['pending', 'approved', 'rejected'].includes(s) ? s : fallback;
        };

        const defaultStatus = toStatus(req.body?.defaultStatus, 'approved');
        const headerBrandId = req.brandId || (req.body?.brandId ? parseInt(req.body.brandId) : null) || null;

        // Cache brand-slug → id lookups for per-row brand overrides.
        const brandCache = new Map();
        const resolveBrand = async (slug) => {
            if (!slug) return null;
            const key = slug.toLowerCase();
            if (brandCache.has(key)) return brandCache.get(key);
            const b = await Brand.findOne({ where: { slug: key } }).catch(() => null);
            const id = b ? b.id : null;
            brandCache.set(key, id);
            return id;
        };

        const created = [];
        const errors = [];
        const affectedApproved = new Set();
        const toCreate = [];

        for (let i = 0; i < rows.length; i++) {
            const rowNo = i + 2; // +1 for 0-index, +1 for header row (what the user sees in Excel)
            const r = norm(rows[i]);

            const rating = parseInt(pick(r, 'rating', 'stars', 'star', 'ratings'), 10);
            if (isNaN(rating) || rating < 1 || rating > 5) {
                errors.push({ row: rowNo, reason: `Invalid rating "${pick(r, 'rating', 'stars')}" (must be 1–5)` });
                continue;
            }

            // Resolve the target brand for this row (per-row override → header brand).
            const rowBrandSlug = pick(r, 'brand', 'brandslug', 'brandname');
            const rowBrandId = (await resolveBrand(rowBrandSlug)) || headerBrandId;

            // Resolve the product. The MAIN product column may hold a numeric id,
            // a product name/title, OR a slug — whichever the admin has in the
            // sheet — so we try all three against it. Dedicated product_slug /
            // product_name / title columns are still honoured when present.
            let product = null;
            const prodCol = pick(r, 'productid', 'product', 'sku', 'id', 'producttitle', 'title'); // main column: id OR name/title OR slug
            const slugCol = pick(r, 'productslug', 'slug', 'handle');
            const nameCol = pick(r, 'productname', 'nameofproduct');
            const brandWhere = rowBrandId ? { brand_id: rowBrandId } : {};

            // 1) Numeric id — only when the whole value is digits.
            if (/^\d+$/.test(prodCol)) {
                product = await Product.findByPk(parseInt(prodCol, 10)).catch(() => null);
            }
            // 2) Slug — a dedicated slug column, or the main column used as a slug.
            if (!product) {
                for (const slug of [slugCol, prodCol].filter(Boolean)) {
                    product = await Product.findOne({ where: { slug, ...brandWhere } }).catch(() => null);
                    if (product) break;
                }
            }
            // 3) Name / title — a dedicated name column, or the main column used as
            //    a name. Exact match first, then a partial (LIKE) match. All lookups
            //    are scoped to the row's brand so the same product name in two brands
            //    resolves to the right one.
            if (!product) {
                for (const nm of [nameCol, prodCol].filter(Boolean)) {
                    product = await Product.findOne({ where: { name: nm, ...brandWhere } }).catch(() => null)
                        || await Product.findOne({ where: { name: { [Op.like]: `%${nm}%` }, ...brandWhere } }).catch(() => null);
                    if (product) break;
                }
            }
            if (!product) {
                errors.push({ row: rowNo, reason: `Product not found (id/name/title/slug: "${prodCol || slugCol || nameCol || '—'}")` });
                continue;
            }

            const reviewText = pick(r, 'review', 'comment', 'reviewtext', 'body', 'text', 'description')
                .replace(/<[^>]*>/g, '').trim();
            const guestName = pick(r, 'name', 'reviewer', 'reviewername', 'customer', 'customername', 'username') || 'Anonymous';
            const guestEmail = pick(r, 'email', 'revieweremail', 'guestemail') || null;
            const status = toStatus(pick(r, 'status', 'state'), defaultStatus);

            // Review date: accept a sheet date ONLY if it's a sane PAST date
            // (never in the future, never absurdly old). Otherwise spread the
            // review deterministically over the last ~180 days, so undated imports
            // don't all land on today and bad/future dates are never stored.
            let createdAt = null;
            const dateRaw = pick(r, 'date', 'reviewdate', 'createdat', 'created');
            if (dateRaw) {
                const d = new Date(dateRaw);
                const now = Date.now();
                if (!isNaN(d.getTime()) && d.getTime() <= now && d.getTime() >= now - 6 * 365 * 864e5) createdAt = d;
            }
            if (!createdAt) {
                const key = `${product.id}|${guestName}|${reviewText}|${rowNo}`;
                let h = 0;
                for (let k = 0; k < key.length; k++) h = (h * 31 + key.charCodeAt(k)) >>> 0;
                createdAt = new Date(Date.now() - (h % 180) * 864e5 - ((h >> 8) % 24) * 36e5);
            }

            // Skip obvious duplicates on re-upload (same product + same email).
            if (guestEmail) {
                const dup = await Review.findOne({ where: { productId: product.id, guestEmail } }).catch(() => null);
                if (dup) {
                    errors.push({ row: rowNo, reason: `Duplicate — a review by ${guestEmail} already exists for "${product.name}"` });
                    continue;
                }
            }

            const record = {
                productId: product.id,
                userId: null,
                rating,
                review: reviewText || null,
                guestName,
                guestEmail,
                brandId: rowBrandId || product.brand_id || null,
                status,
                verified_purchase: toBool(pick(r, 'verified', 'verifiedpurchase', 'isverified')),
                is_featured: toBool(pick(r, 'featured', 'isfeatured')),
            };
            if (createdAt) { record.createdAt = createdAt; record.updatedAt = createdAt; }

            toCreate.push(record);
            if (status === 'approved') affectedApproved.add(product.id);
            created.push({ row: rowNo, product: product.name, rating, name: guestName, status });
        }

        if (toCreate.length === 0) {
            return res.status(200).json({
                success: false,
                message: 'No reviews were imported. See the per-row errors.',
                total: rows.length, created: 0, skipped: errors.length, errors,
            });
        }

        // Insert in one shot. individualHooks:false keeps it fast; timestamps we
        // supplied (back-dated rows) are honoured, the rest default to now.
        await Review.bulkCreate(toCreate);

        // Recompute product stats for every product that gained an approved review,
        // and invalidate its public-reviews cache.
        for (const productId of affectedApproved) {
            const t = await sequelize.transaction();
            try {
                await updateProductReviewStats(productId, t);
                await t.commit();
            } catch (e) {
                await t.rollback();
                logger.error('Bulk-upload stat recompute failed for product', productId, e.message);
            }
            await cacheManager.invalidate(`reviews:${productId}:*`).catch(() => {});
        }

        res.json({
            success: true,
            message: `Imported ${toCreate.length} review${toCreate.length !== 1 ? 's' : ''}` + (errors.length ? `, skipped ${errors.length}` : ''),
            total: rows.length,
            created: toCreate.length,
            skipped: errors.length,
            errors,
            createdRows: created,
        });
    } catch (error) {
        logger.error('Error in bulk review upload:', error);
        res.status(500).json({ success: false, message: 'Failed to import reviews', error: error.message });
    }
};