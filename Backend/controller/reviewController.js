const { Review } = require('../model/reviewModel.js');
const { ReviewImage } = require('../model/reviewImageModel.js');
const { Product } = require('../model/productModel.js');
const { Order } = require('../model/orderModel.js');
const { OrderItem } = require('../model/orderItemModel.js');
const { User } = require('../model/userModel.js');
const path = require('path');
const fs = require('fs');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db.js');
// import upload from '../middleware/uploadMiddleware.js'; // Assuming upload middleware is handled in routes

// Helper to update product review statistics
const updateProductReviewStats = async (productIdToUpdate, transaction) => {
    try {
        const pId = parseInt(productIdToUpdate);
        if (isNaN(pId)) {
            console.error('Invalid productId for stats update:', productIdToUpdate);
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
        console.error('Error updating product review stats:', error);
        // Do not re-throw error if called from multiple places, let the original caller handle it
    }
};

// Create a new review (for logged-in users)
module.exports.createReview = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { product_id, order_id, rating, review } = req.body;
        const userId = req.user.id; // Authenticated user
        const files = req.files;

        const productId = parseInt(product_id);
        const parsedRating = parseInt(rating);

        if (isNaN(productId) || isNaN(parsedRating)) {
            await transaction.rollback();
            return res.status(400).json({ message: 'Product ID and rating must be valid numbers' });
        }

        if (parsedRating < 1 || parsedRating > 5) {
            await transaction.rollback();
            return res.status(400).json({ message: 'Rating must be between 1 and 5' });
        }

        const product = await Product.findByPk(productId, { transaction });
        if (!product) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Product not found' });
        }

        const existingReview = await Review.findOne({
            where: {
                userId: userId,
                productId: productId
            },
            transaction
        });

        if (existingReview) {
            await transaction.rollback();
            return res.status(400).json({ message: 'You have already reviewed this product' });
        }

        let verifiedPurchase = false;
        let userOrderId = order_id ? parseInt(order_id) : null;

        if (userOrderId && !isNaN(userOrderId)) {
            const order = await Order.findOne({
                where: {
                    id: userOrderId,
                    userId: userId,
                    status: 'delivered' 
                },
                include: [{
                    model: OrderItem,
                    where: { productId: productId }
                }],
                transaction
            });
            if (order) verifiedPurchase = true;
            else userOrderId = null; // Invalid order_id provided
        } else {
            const userOrders = await Order.findAll({
                where: {
                    userId: userId,
                    status: 'delivered'
                },
                include: [{
                    model: OrderItem,
                    where: { productId: productId }
                }],
                transaction
            });
            if (userOrders && userOrders.length > 0) {
                verifiedPurchase = true;
                userOrderId = userOrders[0].id; // Associate with the first found order
            }
        }

        const newReview = await Review.create({
            userId: userId,
            productId: productId,
            // order_id: userOrderId, // Assuming order_id is not a direct field in Review model anymore
            rating: parsedRating,
            review: review || null,
            status: 'pending',
            verified_purchase: verifiedPurchase,
            is_featured: false
        }, { transaction });

        if (files && files.length > 0) {
            const reviewImages = files.map(file => ({
                reviewId: newReview.id,
                fileName: file.filename,
                fileType: file.mimetype.startsWith('video/') ? 'video' : 'image'
            }));
            await ReviewImage.bulkCreate(reviewImages, { transaction });
        }

        // Initial stat update, will be re-calculated if approved
        // await updateProductReviewStats(productId, transaction); 
        // No, don't update stats for pending reviews. Only for approved.

        await transaction.commit();

        const createdReview = await Review.findByPk(newReview.id, {
            include: [
                { model: ReviewImage, as: 'ReviewImages' },
                { model: User, as: 'User', attributes: ['id', 'username', 'profileImage'] }
            ]
        });

        res.status(201).json({
            message: 'Review submitted successfully and pending moderation',
            review: createdReview
        });
    } catch (error) {
        await transaction.rollback();
        console.error('Error creating review:', error);
        res.status(500).json({ message: 'Failed to create review', error: error.message });
    }
};

// Create a public review (for non-logged-in users)
module.exports.createPublicReview = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { productId: productIdBody, rating: ratingBody, comment, name, email } = req.body;
        const files = req.files;

        const productId = parseInt(productIdBody);
        const parsedRating = parseInt(ratingBody);

        if (!productId || isNaN(productId) || !parsedRating || isNaN(parsedRating) || !comment || !name || !email) {
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
            review: comment,
            guestName: name,
            guestEmail: email,
            status: 'pending' // All public reviews start as pending
        }, { transaction });

        // Handle review images
        if (files && files.length > 0) {
            const reviewImages = files.map(file => ({
                reviewId: newReview.id,
                fileName: file.filename,
                fileType: file.mimetype.startsWith('video/') ? 'video' : 'image'
            }));
            await ReviewImage.bulkCreate(reviewImages, { transaction });
        }

        await transaction.commit();

        res.status(201).json({
            success: true,
            message: 'Review submitted successfully and pending moderation',
            review: newReview
        });
    } catch (error) {
        await transaction.rollback();
        console.error('Error creating public review:', error);
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
        const { page = 1, limit = 10, sort = 'recent' } = req.query;
        
        const pId = parseInt(productId);
        if (isNaN(pId)) {
            return res.status(400).json({ success: false, message: 'Invalid Product ID' });
        }

        const filter = { 
            productId: pId,
            status: 'approved' // Hardcoded to approved for public view
        };
        
        let order = [['createdAt', 'DESC']]; 
        if (sort === 'highest') order = [['rating', 'DESC'], ['createdAt', 'DESC']];
        if (sort === 'lowest') order = [['rating', 'ASC'], ['createdAt', 'DESC']];
        
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
        
        res.json({
            success: true,
            reviews: reviewsData.rows.map(r => ({
                ...r.toJSON(),
                // If User is null (guest review), use guestName
                reviewerName: r.User ? r.User.username : r.guestName,
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
        });
    } catch (error) {
        console.error('Error getting public product reviews:', error);
        res.status(500).json({ 
            success: false,
            message: 'Failed to get reviews', 
            error: error.message 
        });
    }
};


// Get all reviews for a product (can be used by admin, respects query status)
module.exports.getProductReviews = async (req, res) => {
    try {
        const { productId } = req.params;
        const { status, rating, verified, hasImages, hasVideos, featured, page = 1, limit = 10, sort = 'recent' } = req.query;
        
        const pId = parseInt(productId);
        if (isNaN(pId)) {
            return res.status(400).json({ message: 'Invalid Product ID' });
        }

        const filter = { productId: pId };
        
        // For public endpoints or non-admin users, only show approved reviews unless a specific status is requested by admin
        if (!req.user || req.user.role !== 'admin') {
            filter.status = 'approved';
        } else if (status && status !== 'all') { // Admin can filter by specific status or 'all'
            filter.status = status;
        } // If status is 'all' or not provided by admin, no status filter is applied by default for admin
        
        if (rating) filter.rating = parseInt(rating);
        if (verified === 'true') filter.verified_purchase = true;
        if (featured === 'true') filter.is_featured = true;
        
        const includeOptions = [
            { model: User, as: 'User', attributes: ['id', 'username', 'profileImage'] },
            { model: ReviewImage, as: 'ReviewImages', required: false }
        ];
        
        if (hasImages === 'true' || hasVideos === 'true') {
            const imageFilter = {};
            if (hasVideos === 'true') imageFilter.fileType = 'video';
            else if (hasImages === 'true') imageFilter.fileType = 'image';
            includeOptions[1].required = true;
            includeOptions[1].where = imageFilter;
        }
        
        let order = [['createdAt', 'DESC']];
        if (sort === 'highest') order = [['rating', 'DESC'], ['createdAt', 'DESC']];
        if (sort === 'lowest') order = [['rating', 'ASC'], ['createdAt', 'DESC']];
        
        const offset = (parseInt(page) - 1) * parseInt(limit);
        
        const reviewsData = await Review.findAndCountAll({
            where: filter,
            include: includeOptions,
            order,
            limit: parseInt(limit),
            offset: offset,
            distinct: true 
        });
        
        // Simplified stats for this endpoint, more detailed in getPublicProductReviews
        const productStats = await Product.findByPk(pId, { attributes: ['avg_rating', 'review_count'] });
        const ratingDistribution = await Review.findAll({
            where: { productId: pId, ...(filter.status && filter.status !== 'all' && { status: filter.status }) }, // apply status filter if specific
            attributes: ['rating', [sequelize.fn('COUNT', sequelize.col('id')), 'count']],
            group: ['rating']
        });
        const formattedRatingStats = { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 };
        ratingDistribution.forEach(stat => {
            formattedRatingStats[stat.rating] = parseInt(stat.getDataValue('count'));
        });
        const totalFilteredReviews = Object.values(formattedRatingStats).reduce((a,b) => a + b, 0);
        
        res.json({
            reviews: reviewsData.rows.map(r => ({
                ...r.toJSON(),
                reviewerName: r.User ? r.User.username : r.guestName,
            })),
            pagination: {
                total: reviewsData.count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(reviewsData.count / parseInt(limit))
            },
            stats: {
                ratings: formattedRatingStats,
                total: totalFilteredReviews, // Total based on current filter for this admin view
                average: productStats ? parseFloat(productStats.avg_rating) : 0 // Overall average from product table
            }
        });
    } catch (error) {
        console.error('Error getting product reviews:', error);
        res.status(500).json({ message: 'Failed to get reviews', error: error.message });
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
        
        res.json({
            message: 'Review moderated successfully',
            review: reviewToModerate
        });
    } catch (error) {
        await transaction.rollback();
        console.error('Error moderating review:', error);
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

        // Permissions: Admin can delete any. User can delete their own IF NOT APPROVED (or specific policy)
        // Current route setup implies admin for /admin/:reviewId and user for /:reviewId
        // This generic deleteReview is likely called by admin routes based on reviewRoutes.js structure
        // If also for users, add permission check: (req.user.id !== reviewToDelete.userId && req.user.role !== 'admin')

        const productId = reviewToDelete.productId;
        const oldStatus = reviewToDelete.status;

        // Delete associated images from storage and database
        if (reviewToDelete.ReviewImages && reviewToDelete.ReviewImages.length > 0) {
            const deleteFilePromises = reviewToDelete.ReviewImages.map(image => {
                const imagePath = path.join(__dirname, '../uploads/reviews', image.fileName);
                return fs.promises.unlink(imagePath).catch(err => console.error("Failed to delete image file:", err)); // Non-blocking if file not found
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
        console.error('Error deleting review:', error);
        res.status(500).json({ message: 'Failed to delete review', error: error.message });
    }
};

// Get all reviews (Admin purpose)
module.exports.getAllReviews = async (req, res) => {
    try {
        // Add pagination and filtering as needed for admin panel
        const { page = 1, limit = 10, status, sort = 'createdAt_desc' } = req.query;
        const offset = (parseInt(page) - 1) * parseInt(limit);

        let order = [['createdAt', 'DESC']];
        if (sort === 'createdAt_asc') order = [['createdAt', 'ASC']];
        if (sort === 'rating_desc') order = [['rating', 'DESC'], ['createdAt', 'DESC']];
        if (sort === 'rating_asc') order = [['rating', 'ASC'], ['createdAt', 'DESC']];

        const whereClause = {};
        if (status && status !== 'all') {
            whereClause.status = status;
        }
        
        const reviews = await Review.findAndCountAll({
            where: whereClause,
            include: [
                { model: User, as: 'User', attributes: ['id', 'username'] },
                { model: Product, as: 'Product', attributes: ['id', 'name'] },
                { model: ReviewImage, as: 'ReviewImages'}
            ],
            order: order,
            limit: parseInt(limit),
            offset: offset,
            distinct: true
        });
        
        res.json({
            reviews: reviews.rows.map(r => ({
                ...r.toJSON(),
                productName: r.Product ? r.Product.name : 'N/A',
                customerName: r.User ? r.User.username : r.guestName || 'Guest'
            })),
            pagination: {
                total: reviews.count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(reviews.count / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Error fetching all reviews:', error);
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

        // Add permission check if this route is also for non-admins
        // e.g. if (review.userId !== req.user.id && req.user.role !== 'admin' && review.status !== 'approved') ...

        res.json(review);
    } catch (error) {
        console.error('Error fetching review:', error);
        res.status(500).json({ message: 'Failed to fetch review', error: error.message });
    }
};

// Update a review (by user or admin)
module.exports.updateReview = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
        const { reviewId } = req.params;
        const { rating, review } = req.body; // User can only update rating and review text
        // Admin can update status, is_featured via moderateReview
        const files = req.files;
        const rId = parseInt(reviewId);

        if (isNaN(rId)) {
            await transaction.rollback();
            return res.status(400).json({ message: "Invalid Review ID" });
        }

        const reviewToUpdate = await Review.findByPk(rId, { transaction });
        if (!reviewToUpdate) {
            await transaction.rollback();
            return res.status(404).json({ message: 'Review not found' });
        }
        
        // Permission check: User can only update their own review, and only if it's not yet approved.
        // Admin can edit any review (but typically uses moderateReview for status changes).
        if (req.user.id !== reviewToUpdate.userId && req.user.role !== 'admin') {
            await transaction.rollback();
            return res.status(403).json({ message: 'Access denied to update this review' });
        }

        if (req.user.id === reviewToUpdate.userId && reviewToUpdate.status === 'approved' && req.user.role !== 'admin') {
            await transaction.rollback();
            return res.status(403).json({ message: 'Cannot update an already approved review.' });
        }
        
        const parsedRating = rating ? parseInt(rating) : null;
        if (parsedRating && (parsedRating < 1 || parsedRating > 5)) {
                await transaction.rollback();
            return res.status(400).json({ message: 'Rating must be between 1 and 5' });
            }
            
        if (parsedRating) reviewToUpdate.rating = parsedRating;
        if (review !== undefined) reviewToUpdate.review = review; // Allow clearing review text
            
        // If a user updates their review, set it back to pending for re-moderation
        if (req.user.id === reviewToUpdate.userId && req.user.role !== 'admin') {
            reviewToUpdate.status = 'pending';
        }

        await reviewToUpdate.save({ transaction });
        
        // Handle new file uploads if any - existing files are not touched here.
        // Deleting old files would need a separate mechanism or UI option.
        if (files && files.length > 0) {
            // First, delete old images if a policy is to replace them (not implemented here, just adding new)
            // await ReviewImage.destroy({ where: { reviewId: rId }, transaction });
            // Then, add new images:
            const newReviewImages = files.map(file => ({
                reviewId: rId,
                fileName: file.filename,
                fileType: file.mimetype.startsWith('video/') ? 'video' : 'image'
            }));
            await ReviewImage.bulkCreate(newReviewImages, { transaction });
        }
        
        // Product stats update if status changed (relevant if admin is using this endpoint to approve)
        // But typically, `moderateReview` handles status changes and stat updates.
        // If a user edit sets status to pending, stats should reflect removal of previously approved review.
        if (reviewToUpdate.status !== 'approved' && (await Review.count({where: {id: rId, status: 'approved'}, transaction})) === 0) {
             // This logic might be tricky. updateProductReviewStats should be robust.
             // await updateProductReviewStats(reviewToUpdate.productId, transaction);
        }
        
        await transaction.commit();
        
        const updatedReview = await Review.findByPk(rId, {
            include: [
                { model: User, as: 'User', attributes: ['id', 'username', 'profileImage'] },
                { model: ReviewImage, as: 'ReviewImages' }
            ]
        });
        
        res.json({
            message: 'Review updated successfully',
            review: updatedReview
        });
    } catch (error) {
        await transaction.rollback();
        console.error('Error updating review:', error);
        res.status(500).json({ message: 'Failed to update review', error: error.message });
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
            console.error("Error deleting image file from disk:", fileError); 
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
        console.error('Error deleting review image:', error);
        res.status(500).json({ message: 'Failed to delete review image', error: error.message });
    }
};

// Get user's reviews
module.exports.getUserReviews = async (req, res) => {
    try {
        const loggedInUserId = req.user.id;
        const requestedUserId = req.params.userId ? parseInt(req.params.userId) : loggedInUserId;
        const { page = 1, limit = 10, status } = req.query;

        if (isNaN(requestedUserId)) {
            return res.status(400).json({ message: 'Invalid User ID' });
        }

        // Permission check: Users can only see their own reviews.
        // Admins can see any user's reviews and can filter by status.
        if (loggedInUserId !== requestedUserId && req.user.role !== 'admin') {
            return res.status(403).json({ message: 'Access denied. You can only view your own reviews.' });
        }

        const filter = { userId: requestedUserId };

        // For users viewing their own reviews, they see all statuses unless they filter.
        // For admins viewing others, they can filter by status, or see all if no status filter.
        if (status && status !== 'all') {
            if (['pending', 'approved', 'rejected'].includes(status)) {
                filter.status = status;
            }
        } else if (loggedInUserId !== requestedUserId && req.user.role === 'admin' && !status) {
            // If admin is fetching for another user and no status specified, show all by default for admin.
            // No specific status filter needed here unless explicitly requested.
        } else if (loggedInUserId === requestedUserId && !status) {
            // If user is fetching their own and no status specified, show all of their reviews.
        }


        const offset = (parseInt(page) - 1) * parseInt(limit);

        const reviewsData = await Review.findAndCountAll({
            where: filter,
            include: [
                {
                    model: Product,
                    as: 'Product',
                    attributes: ['id', 'name', 'slug']
                },
                {
                    model: ReviewImage,
                    as: 'ReviewImages'
                }
            ],
            order: [['createdAt', 'DESC']],
            limit: parseInt(limit),
            offset: parseInt(offset),
            distinct: true
        });

        res.json({
            success: true,
            reviews: reviewsData.rows.map(r => ({
                ...r.toJSON(),
                // Add any specific transformations if needed
            })),
            pagination: {
                total: reviewsData.count,
                page: parseInt(page),
                limit: parseInt(limit),
                totalPages: Math.ceil(reviewsData.count / parseInt(limit))
            }
        });
    } catch (error) {
        console.error('Error getting user reviews:', error);
        res.status(500).json({ success: false, message: 'Failed to get user reviews', error: error.message });
    }
};

