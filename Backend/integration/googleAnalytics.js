const axios = require('axios');

const GA_MEASUREMENT_ID = process.env.GA_MEASUREMENT_ID;  // Use environment variable
const GA_API_SECRET = process.env.GA_API_SECRET;          // Use environment variable

async function sendPurchaseEvent(order) {
    const eventData = {
        client_id: order.user_id.toString(),
        events: [
            {
                name: "purchase",
                params: {
                    transaction_id: order.id.toString(),
                    value: order.total_amount,
                    currency: "INR",
                    items: order.items.map(item => ({
                        item_id: item.product_id.toString(),
                        item_name: item.product_name,
                        quantity: item.quantity,
                        price: item.price
                    }))
                }
            }
        ]
    };

    try {
        await axios.post(
            `https://www.google-analytics.com/mp/collect?measurement_id=${GA_MEASUREMENT_ID}&api_secret=${GA_API_SECRET}`,
            eventData
        );
    } catch (error) {
        console.error("Google Analytics Error:", error);
    }
}

module.exports = sendPurchaseEvent;
