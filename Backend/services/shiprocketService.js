const axios = require('axios');

const SHIPROCKET_EMAIL = process.env.SHIPROCKET_EMAIL;
const SHIPROCKET_PASSWORD = process.env.SHIPROCKET_PASSWORD;
const BASE_URL = 'https://apiv2.shiprocket.in/v1/external';

let token = null;
let tokenExpiry = null;

console.log('Shiprocket Email:', SHIPROCKET_EMAIL);
console.log('Shiprocket Password:', SHIPROCKET_PASSWORD ? 'Present' : 'Missing');

async function authenticateShiprocket() {
    const res = await axios.post(`${BASE_URL}/auth/login`, {
        email: SHIPROCKET_EMAIL,
        password: SHIPROCKET_PASSWORD
    });
    token = res.data.token;
    tokenExpiry = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
    return token;
}

async function ensureValidToken() {
    if (!token || Date.now() > tokenExpiry) {
        await authenticateShiprocket();
    }
    return token;
}

async function createShiprocketOrder(orderData) {
    await ensureValidToken();

    const required = [
        "order_id", "order_date", "pickup_location", "billing_customer_name",
        "billing_address", "billing_city", "billing_pincode", "billing_state",
        "billing_country", "billing_email", "billing_phone", "order_items",
        "payment_method", "sub_total"
    ];

    const missing = required.filter(f => !orderData[f]);
    if (missing.length > 0) {
        throw new Error(`Missing required fields: ${missing.join(", ")}`);
    }

    const res = await axios.post(
        `${BASE_URL}/orders/create/adhoc`,
        orderData,
        {
            headers: {
                Authorization: `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        }
    );

    return res.data;
}

async function getShiprocketTracking(shipmentId) {
    try {
        await ensureValidToken();
        const res = await axios.get(
            `${BASE_URL}/courier/track/shipment/${shipmentId}`,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return res.data;
    } catch (error) {
        console.error('Failed to get Shiprocket tracking:', error.response?.data || error.message);
        throw error;
    }
}

async function getShiprocketLabel(shipmentId) {
    try {
        await ensureValidToken();
        const res = await axios.get(
            `${BASE_URL}/courier/generate/label/${shipmentId}`,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        // The response contains a label_url (PDF)
        return res.data;
    } catch (error) {
        console.error('Failed to get Shiprocket label:', error.response?.data || error.message);
        throw error;
    }
}

async function requestShiprocketPickup(shipmentIds, pickupLocation = 'Default') {
    try {
        await ensureValidToken();
        const res = await axios.post(
            `${BASE_URL}/courier/generate/pickup`,
            {
                shipment_id: shipmentIds, // array of shipment IDs
                pickup_location: pickupLocation
            },
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return res.data;
    } catch (error) {
        console.error('Failed to request Shiprocket pickup:', error.response?.data || error.message);
        throw error;
    }
}

async function cancelShiprocketShipment(shipmentIds) {
    try {
        await ensureValidToken();
        const res = await axios.post(
            `${BASE_URL}/courier/cancel/shipment`,
            { shipment_id: shipmentIds }, // array of shipment IDs
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return res.data;
    } catch (error) {
        console.error('Failed to cancel Shiprocket shipment:', error.response?.data || error.message);
        throw error;
    }
}

async function getAllShiprocketOrders(params = {}) {
    try {
        await ensureValidToken();
        const res = await axios.get(
            `${BASE_URL}/orders`,
            { 
                params,
                headers: { Authorization: `Bearer ${token}` } 
            }
        );
        return res.data;
    } catch (error) {
        console.error('Failed to get all Shiprocket orders:', error.response?.data || error.message);
        throw error;
    }
}

module.exports = {
    authenticateShiprocket,            // ✅ ADD THIS LINE
    createShiprocketOrder,
    getShiprocketTracking,
    getShiprocketLabel,
    requestShiprocketPickup,
    cancelShiprocketShipment,
    getAllShiprocketOrders
};
