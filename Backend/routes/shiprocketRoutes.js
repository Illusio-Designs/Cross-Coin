const express = require('express');
const router = express.Router();
const { testShiprocketCredentials } = require('../controller/orderController');

router.get('/test-credentials', testShiprocketCredentials);

module.exports = router; 