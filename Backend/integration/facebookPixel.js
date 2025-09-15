const express = require("express");
const axios = require("axios");

const FB_PIXEL_ID = process.env.FB_PIXEL_ID || "1386995345678287"; // Use env or fallback
const FB_ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN; // Must be set in env

async function sendFacebookEvent(eventName, order, extraData = {}) {
  // Skip Facebook Pixel if no access token is configured
  if (!FB_ACCESS_TOKEN || FB_ACCESS_TOKEN === "YOUR_ACCESS_TOKEN") {
    console.log(
      "Facebook Pixel: Skipping event - no valid access token configured"
    );
    return;
  }

  const eventData = {
    event_name: eventName,
    event_time: Math.floor(Date.now() / 1000),
    event_source_url:
      extraData.event_source_url || "https://yourwebsite.com/checkout-success",
    action_source: "website",
    user_data: {
      client_ip_address: order.ip_address,
      client_user_agent: order.user_agent,
    },
    custom_data: {
      value: order.total_amount,
      currency: order.currency || "INR",
      contents: order.items.map((item) => ({
        id: item.product_id.toString(),
        quantity: item.quantity,
      })),
      ...extraData.custom_data,
    },
  };

  try {
    await axios.post(
      `https://graph.facebook.com/v12.0/${FB_PIXEL_ID}/events?access_token=${FB_ACCESS_TOKEN}`,
      { data: [eventData] }
    );
    console.log("Facebook Pixel: Event sent successfully");
  } catch (error) {
    console.error(
      "Facebook Pixel Error:",
      error.response?.data || error.message
    );
  }
}

const router = express.Router();

// POST /api/facebook-pixel/send-event
router.post("/send-event", async (req, res) => {
  try {
    const { eventName, order, extraData } = req.body;
    await sendFacebookEvent(eventName, order, extraData);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

module.exports = router;
module.exports.sendFacebookEvent = sendFacebookEvent;
