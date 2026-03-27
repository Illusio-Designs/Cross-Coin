const express = require('express');
const router = express.Router();

const instagramController = require('../controller/instagramController');
const { isAuthenticated, authorize } = require('../middleware/authMiddleware.js');

router.get('/feed', instagramController.getFeed);
router.post('/refresh', isAuthenticated, authorize(['admin']), instagramController.refreshFeed);
router.post('/tag', isAuthenticated, authorize(['admin']), instagramController.tagPost);

module.exports = router;

