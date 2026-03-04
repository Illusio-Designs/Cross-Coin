// AI Image Routes
const express = require('express');
const router = express.Router();
const aiImageController = require('../controller/aiImageController');
const { authenticate, isAdmin } = require('../middleware/authMiddleware');

// All routes require admin authentication
router.use(authenticate);
router.use(isAdmin);

/**
 * Get product variations with images
 * GET /api/ai-images/products/:productId/variations
 */
router.get('/products/:productId/variations', aiImageController.getProductVariations);

/**
 * Generate AI images for selected variations
 * POST /api/ai-images/generate
 * 
 * Body:
 * {
 *   productId: 1,
 *   variations: [
 *     { variationId: 1, baseImageId: 5 },
 *     { variationId: 2, baseImageId: 8 }
 *   ]
 * }
 */
router.post('/generate', aiImageController.generateImages);

/**
 * Delete old images for selected variations (manual cleanup after reviewing AI images)
 * POST /api/ai-images/delete-old-images
 * 
 * Body:
 * {
 *   productId: 1,
 *   variations: [
 *     { variationId: 1, keepImageIds: [101, 102, 103] },
 *     { variationId: 2, keepImageIds: [201, 202, 203] }
 *   ]
 * }
 */
router.post('/delete-old-images', aiImageController.deleteOldImages);

/**
 * Get AI usage statistics
 * GET /api/ai-images/usage-stats
 */
router.get('/usage-stats', aiImageController.getUsageStats);

/**
 * Test AI connection
 * GET /api/ai-images/test-connection
 */
router.get('/test-connection', aiImageController.testConnection);

/**
 * Enhance existing image
 * POST /api/ai-images/enhance
 * 
 * Body:
 * {
 *   imageId: 123
 * }
 */
router.post('/enhance', aiImageController.enhanceImage);

module.exports = router;
