const express = require('express');
const router = express.Router();

const instagramController = require('../controller/instagramController');
const { isAuthenticated, authorize, isProductManager } = require('../middleware/authMiddleware.js');

router.get('/feed', instagramController.getFeed);
router.post('/refresh', isAuthenticated, isProductManager, instagramController.refreshFeed);
router.post('/tag', isAuthenticated, isProductManager, instagramController.tagPost);

module.exports = router;

