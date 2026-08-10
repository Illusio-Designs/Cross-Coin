const express = require('express');
const { sequelize } = require('../config/db.js');
const axios = require('axios');

const router = express.Router();

const GA_MEASUREMENT_ID = process.env.GA_MEASUREMENT_ID;  // Use environment variable
const GA_API_SECRET = process.env.GA_API_SECRET;          // Use environment variable
const FB_PIXEL_ID = process.env.FB_PIXEL_ID;              // Use environment variable
const FB_ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN;      // Use environment variable

// (GET /analytics/advanced-analytics removed — it was unused, and its query
//  referenced a non-existent `total_amount` column while calling GA/FB with
//  broken URLs. Real analytics live in dashboardService + adsReport.)

module.exports = router;
