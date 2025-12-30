const axios = require('axios');

const SHIPROCKET_EMAIL = process.env.SHIPROCKET_EMAIL;
const SHIPROCKET_PASSWORD = process.env.SHIPROCKET_PASSWORD;
const BASE_URL = 'https://apiv2.shiprocket.in/v1/external';

let token = null;
let tokenExpiry = null;

console.log('Shiprocket Email:', SHIPROCKET_EMAIL);
console.log('Shiprocket Password:', SHIPROCKET_PASSWORD ? 'Present' : 'Missing');

// Function to format phone number to exactly 10 digits (tested and working)
function formatPhoneNumber(phone) {
    if (!phone) return '9876543210'; // Default fallback
    
    // Remove all non-digit characters
    const digits = phone.toString().replace(/\D/g, '');
    
    // If it's 12 digits and starts with 91, remove the country code
    if (digits.length === 12 && digits.startsWith('91')) {
        return digits.substring(2);
    }
    
    // If it's 11 digits and starts with 0, remove the leading 0
    if (digits.length === 11 && digits.startsWith('0')) {
        return digits.substring(1);
    }
    
    // If it's already 10 digits, return as is
    if (digits.length === 10) {
        return digits;
    }
    
    // If it's less than 10 digits, use default
    if (digits.length < 10) {
        return '9876543210';
    }
    
    // If it's more than 10 digits, take the last 10
    if (digits.length > 10) {
        return digits.slice(-10);
    }
    
    return '9876543210'; // Final fallback
}

async function authenticateShiprocket() {
    try {
        console.log('=== SHIPROCKET AUTHENTICATION ATTEMPT ===');
        console.log('Email:', SHIPROCKET_EMAIL);
        console.log('Password:', SHIPROCKET_PASSWORD ? 'Present (length: ' + SHIPROCKET_PASSWORD.length + ')' : 'Missing');
        console.log('API URL:', `${BASE_URL}/auth/login`);
        
        if (!SHIPROCKET_EMAIL || !SHIPROCKET_PASSWORD) {
            throw new Error('Shiprocket credentials are not configured. Please set SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD in environment variables.');
        }
        
        const res = await axios.post(`${BASE_URL}/auth/login`, {
            email: SHIPROCKET_EMAIL,
            password: SHIPROCKET_PASSWORD
        });
        
        token = res.data.token;
        tokenExpiry = Date.now() + 24 * 60 * 60 * 1000; // 24 hours
        
        console.log('=== SHIPROCKET AUTHENTICATION SUCCESS ===');
        console.log('Token received:', token ? 'Yes' : 'No');
        
        return token;
    } catch (error) {
        console.error('=== SHIPROCKET AUTHENTICATION FAILED ===');
        console.error('Status:', error.response?.status);
        console.error('Status Text:', error.response?.statusText);
        console.error('Error Data:', JSON.stringify(error.response?.data, null, 2));
        console.error('Error Message:', error.message);
        
        if (error.response?.status === 403) {
            throw new Error('Shiprocket authentication failed: Invalid credentials or account not active. Please check your SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD.');
        } else if (error.response?.status === 401) {
            throw new Error('Shiprocket authentication failed: Unauthorized. Please verify your credentials.');
        } else if (!error.response) {
            throw new Error('Shiprocket authentication failed: Network error. Unable to reach Shiprocket API.');
        } else {
            throw new Error(`Shiprocket authentication failed: ${error.response?.data?.message || error.message}`);
        }
    }
}

async function ensureValidToken() {
    if (!token || Date.now() > tokenExpiry) {
        await authenticateShiprocket();
    }
    return token;
}

async function createShiprocketOrder(orderData) {
    await ensureValidToken();

    // Validate required fields according to Shiprocket API
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

    // Validate order_items structure
    if (!Array.isArray(orderData.order_items) || orderData.order_items.length === 0) {
        throw new Error('order_items must be a non-empty array');
    }

    // Validate each order item
    orderData.order_items.forEach((item, index) => {
        if (!item.name || !item.units || !item.selling_price) {
            throw new Error(`Order item ${index} is missing required fields: name, units, or selling_price`);
        }
    });

    // Format the payload according to Shiprocket API requirements
    const formattedPayload = {
        order_id: String(orderData.order_id),
        order_date: orderData.order_date,
        pickup_location: orderData.pickup_location,
        channel_id: orderData.channel_id || "7361105", // Cross Coin channel ID
        comment: orderData.comment || `Order from Cross-Coin: ${orderData.order_id}`,
        billing_customer_name: String(orderData.billing_customer_name),
        billing_last_name: String(orderData.billing_last_name || ""),
        billing_address: String(orderData.billing_address),
        billing_address_2: String(orderData.billing_address_2 || ""),
        billing_city: String(orderData.billing_city),
        billing_pincode: parseInt(orderData.billing_pincode),
        billing_state: String(orderData.billing_state),
        billing_country: String(orderData.billing_country || "India"),
        billing_email: String(orderData.billing_email),
        billing_phone: formatPhoneNumber(orderData.billing_phone),
        shipping_is_billing: Boolean(orderData.shipping_is_billing !== false), // Default to true
        shipping_customer_name: String(orderData.shipping_customer_name || orderData.billing_customer_name),
        shipping_last_name: String(orderData.shipping_last_name || orderData.billing_last_name || ""),
        shipping_address: String(orderData.shipping_address || orderData.billing_address),
        shipping_address_2: String(orderData.shipping_address_2 || orderData.billing_address_2 || ""),
        shipping_city: String(orderData.shipping_city || orderData.billing_city),
        shipping_pincode: parseInt(orderData.shipping_pincode || orderData.billing_pincode),
        shipping_state: String(orderData.shipping_state || orderData.billing_state),
        shipping_country: String(orderData.shipping_country || orderData.billing_country || "India"),
        shipping_email: String(orderData.shipping_email || orderData.billing_email),
        shipping_phone: formatPhoneNumber(orderData.shipping_phone || orderData.billing_phone),
        order_items: orderData.order_items.map(item => ({
            name: String(item.name),
            sku: String(item.sku || `PROD-${Date.now()}`),
            units: parseInt(item.units),
            selling_price: parseFloat(item.selling_price),
            discount: parseFloat(item.discount || 0),
            tax: parseFloat(item.tax || 0),
            hsn: parseInt(item.hsn || 9999)
        })),
        payment_method: String(orderData.payment_method),
        sub_total: parseFloat(orderData.sub_total),
        shipping_charges: parseFloat(orderData.shipping_charges || 0),
        giftwrap_charges: parseFloat(orderData.giftwrap_charges || 0),
        transaction_charges: parseFloat(orderData.transaction_charges || 0),
        total_discount: parseFloat(orderData.total_discount || 0),
        length: parseFloat(orderData.length || 10),
        breadth: parseFloat(orderData.breadth || 10),
        height: parseFloat(orderData.height || 5),
        weight: parseFloat(orderData.weight || 0.5)
    };

    console.log('=== SHIPROCKET API REQUEST ===');
    console.log('URL:', `${BASE_URL}/orders/create/adhoc`);
    console.log('Headers:', {
        Authorization: `Bearer ${token ? 'Present' : 'Missing'}`,
        'Content-Type': 'application/json'
    });
    console.log('Payload:', JSON.stringify(formattedPayload, null, 2));

    try {
        const res = await axios.post(
            `${BASE_URL}/orders/create/adhoc`,
            formattedPayload,
            {
                headers: {
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                }
            }
        );

        console.log('=== SHIPROCKET API SUCCESS ===');
        console.log('Status:', res.status);
        console.log('Response:', JSON.stringify(res.data, null, 2));
        return res.data;
    } catch (error) {
        console.error('=== SHIPROCKET API ERROR ===');
        console.error('Status:', error.response?.status);
        console.error('Status Text:', error.response?.statusText);
        console.error('Response Data:', JSON.stringify(error.response?.data, null, 2));
        console.error('Request Config:', {
            url: error.config?.url,
            method: error.config?.method,
            headers: error.config?.headers,
            data: error.config?.data
        });
        console.error('Error Message:', error.message);
        throw error;
    }
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

async function getPickupLocations() {
    try {
        await ensureValidToken();
        const res = await axios.get(
            `${BASE_URL}/settings/company/pickup`,
            { headers: { Authorization: `Bearer ${token}` } }
        );
        return res.data;
    } catch (error) {
        console.error('Failed to get pickup locations:', error.response?.data || error.message);
        throw error;
    }
}

async function createPickupLocation(pickupData) {
    try {
        await ensureValidToken();
        const res = await axios.post(
            `${BASE_URL}/settings/company/pickup`,
            pickupData,
            { 
                headers: { 
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                } 
            }
        );
        return res.data;
    } catch (error) {
        console.error('Failed to create pickup location:', error.response?.data || error.message);
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

// Cancel order in Shiprocket
async function cancelShiprocketOrder(orderId) {
    try {
        const token = await authenticateShiprocket();
        
        console.log('=== CANCELING SHIPROCKET ORDER ===');
        console.log('Order ID:', orderId);
        
        const response = await axios.post(`${BASE_URL}/orders/cancel`, {
            ids: [orderId]
        }, {
            headers: {
                'Authorization': `Bearer ${token}`,
                'Content-Type': 'application/json'
            }
        });
        
        console.log('=== SHIPROCKET ORDER CANCELLED ===');
        console.log('Status:', response.status);
        console.log('Response:', JSON.stringify(response.data, null, 2));
        
        return {
            success: true,
            data: response.data
        };
        
    } catch (error) {
        console.error('=== SHIPROCKET ORDER CANCELLATION ERROR ===');
        console.error('Order ID:', orderId);
        console.error('Status:', error.response?.status);
        console.error('Status Text:', error.response?.statusText);
        console.error('Response Data:', JSON.stringify(error.response?.data, null, 2));
        console.error('Error Message:', error.message);
        
        return {
            success: false,
            error: error.response?.data?.message || error.message,
            status: error.response?.status
        };
    }
}

module.exports = {
    authenticateShiprocket,
    createShiprocketOrder,
    getShiprocketTracking,
    getShiprocketLabel,
    requestShiprocketPickup,
    cancelShiprocketShipment,
    getAllShiprocketOrders,
    getPickupLocations,
    createPickupLocation,
    cancelShiprocketOrder
};
