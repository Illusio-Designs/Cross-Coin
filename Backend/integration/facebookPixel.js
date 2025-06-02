import axios from "axios";

const FB_PIXEL_ID = process.env.FB_PIXEL_ID;              // Use environment variable
const FB_ACCESS_TOKEN = process.env.FB_ACCESS_TOKEN;      // Use environment variable

async function sendFacebookPurchaseEvent(order) {
    const eventData = {
        event_name: "Purchase",
        event_time: Math.floor(Date.now() / 1000),
        event_source_url: "https://yourwebsite.com/checkout-success",
        action_source: "website",
        user_data: {
            client_ip_address: order.ip_address,
            client_user_agent: order.user_agent,
        },
        custom_data: {
            value: order.total_amount,
            currency: "USD",
            contents: order.items.map(item => ({
                id: item.product_id.toString(),
                quantity: item.quantity
            }))
        }
    };

    try {
        await axios.post(
            `https://graph.facebook.com/v12.0/${FB_PIXEL_ID}/events?access_token=${FB_ACCESS_TOKEN}`,
            { data: [eventData] }
        );
    } catch (error) {
        console.error("Facebook Pixel Error:", error);
    }
}

export default sendFacebookPurchaseEvent;
