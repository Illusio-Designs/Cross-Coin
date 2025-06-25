const express = require('express');
const { sequelize } = require('../config/db.js');
const axios = require('axios');

const router = express.Router();

const GA_MEASUREMENT_ID = process.env.GA_MEASUREMENT_ID;  // Use environment variable
const GA_API_SECRET = process.env.GA_API_SECRET;          // Use environment variable
const FB_PIXEL_ID = process.env.FB_PIXEL_ID;              // Use environment variable
const FB_ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN;      // Use environment variable

router.get("/dashboard/advanced-analytics", async (req, res) => {
    try {
        const [totalOrders] = await sequelize.query("SELECT COUNT(*) AS total FROM orders");
        const [totalRevenue] = await sequelize.query("SELECT SUM(total_amount) AS revenue FROM orders WHERE status = 'completed'");

        // Fetch Google Analytics Data
        const googleAnalyticsData = await axios.get(
            `https://www.googleapis.com/analytics/v3/data?measurement_id=${GA_MEASUREMENT_ID}&api_secret=${GA_API_SECRET}`
        );

        // Fetch Facebook Pixel Data
        const facebookPixelData = await axios.get(
            `https://graph.facebook.com/v12.0/${FB_PIXEL_ID}/events?access_token=${FB_ACCESS_TOKEN}`
        );

        res.json({
            totalOrders: totalOrders.total,
            totalRevenue: totalRevenue.revenue || 0,
            googleAnalytics: googleAnalyticsData.data,
            facebookPixel: facebookPixelData.data
        });

    } catch (error) {
        console.error("Dashboard Analytics Error:", error);
        res.status(500).json({ error: "Failed to fetch analytics data" });
    }
});

module.exports = router;
