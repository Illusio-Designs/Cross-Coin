// AI Image Routes
const express = require('express');
const router = express.Router();
const aiImageController = require('../controller/aiImageController');
const { authenticateToken, isAdmin } = require('../middleware/authMiddleware');

// All routes require admin authentication
router.use(authenticateToken);
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
