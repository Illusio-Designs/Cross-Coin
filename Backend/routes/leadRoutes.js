const express = require('express');
const router = express.Router();
const { capturePhoneLead } = require('../controller/leadController.js');

// Public — no auth needed, visitor submits phone
router.post('/phone', capturePhoneLead);

module.exports = router;
