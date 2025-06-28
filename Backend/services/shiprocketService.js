const axios = require('axios');

const SHIPROCKET_EMAIL = process.env.SHIPROCKET_EMAIL;
const SHIPROCKET_PASSWORD = process.env.SHIPROCKET_PASSWORD;
const SHIPROCKET_BASE_URL = 'https://apiv2.shiprocket.in/v1/external';

let token = null;
let tokenExpiry = null;

async function authenticateShiprocket() {
    try {
        console.log('=== SHIPROCKET AUTHENTICATION START ===');
        console.log('Email:', SHIPROCKET_EMAIL ? 'Present' : 'Missing');
        console.log('Password:', SHIPROCKET_PASSWORD ? 'Present' : 'Missing');
        console.log('Base URL:', SHIPROCKET_BASE_URL);
        
        if (!SHIPROCKET_EMAIL || !SHIPROCKET_PASSWORD) {
            throw new Error('Shiprocket credentials are missing. Please check SHIPROCKET_EMAIL and SHIPROCKET_PASSWORD environment variables.');
        }

        const authPayload = {
            email: SHIPROCKET_EMAIL,
            password: SHIPROCKET_PASSWORD
        };
        
        console.log('Auth payload:', { email: SHIPROCKET_EMAIL, password: '***' });
        console.log('Auth URL:', `${SHIPROCKET_BASE_URL}/auth/login`);

        const res = await axios.post(`${SHIPROCKET_BASE_URL}/auth/login`, authPayload, {
            headers: {
                'Content-Type': 'application/json'
            }
        });
        
        console.log('Auth response status:', res.status);
        console.log('Auth response data:', res.data);
        
        if (!res.data.token) {
            throw new Error('No token received from Shiprocket authentication');
        }
        
        token = res.data.token;
        tokenExpiry = Date.now() + (24 * 60 * 60 * 1000); // Token expires in 24 hours
        console.log('=== SHIPROCKET AUTHENTICATION SUCCESS ===');
        return token;
    } catch (error) {
        console.error('=== SHIPROCKET AUTHENTICATION FAILED ===');
        console.error('Error message:', error.message);
        console.error('Response status:', error.response?.status);
        console.error('Response data:', error.response?.data);
        console.error('Response headers:', error.response?.headers);
        console.error('Request config:', {
            url: error.config?.url,
            method: error.config?.method,
            headers: error.config?.headers
        });
        
        if (error.response?.status === 403) {
            throw new Error('Invalid Shiprocket credentials. Please check your email and password.');
        }
        throw new Error(`Shiprocket authentication failed: ${error.response?.data?.message || error.message}`);
    }
}

async function ensureValidToken() {
    // Check if token is expired or will expire soon (within 5 minutes)
    if (!token || !tokenExpiry || Date.now() > (tokenExpiry - 5 * 60 * 1000)) {
        console.log('Token expired or missing, re-authenticating...');
        await authenticateShiprocket();
    }
    return token;
}

async function createShiprocketOrder(orderData) {
    try {
        console.log('=== CREATING SHIPROCKET ORDER ===');
        await ensureValidToken();
        
        console.log('Order data:', JSON.stringify(orderData, null, 2));
        console.log('Using token:', token ? 'Present' : 'Missing');
        
        // Validate required fields
        const requiredFields = ['order_id', 'order_date', 'pickup_location', 'billing_customer_name', 'billing_address', 'billing_city', 'billing_pincode', 'billing_state', 'billing_country', 'billing_email', 'billing_phone', 'order_items', 'payment_method', 'sub_total'];
        const missingFields = requiredFields.filter(field => {
            const value = orderData[field];
            return !value || (typeof value === 'string' && value.trim() === '');
        });
        
        if (missingFields.length > 0) {
            console.error('Missing or empty required fields:', missingFields);
            console.error('Field values:', missingFields.map(field => ({
                field,
                value: orderData[field],
                type: typeof orderData[field]
            })));
            throw new Error(`Missing required fields: ${missingFields.join(', ')}`);
        }
        
        // Use the correct endpoint as per Shiprocket API documentation
        const res = await axios.post(
            `${SHIPROCKET_BASE_URL}/orders/create/adhoc`,
            orderData,
            { 
                headers: { 
                    Authorization: `Bearer ${token}`,
                    'Content-Type': 'application/json'
                } 
            }
        );
        
        console.log('=== SHIPROCKET ORDER CREATED SUCCESSFULLY ===');
        console.log('Response status:', res.status);
        console.log('Response data:', res.data);
        return res.data;
    } catch (error) {
        console.error('=== FAILED TO CREATE SHIPROCKET ORDER ===');
        console.error('Error message:', error.message);
        console.error('Response status:', error.response?.status);
        console.error('Response data:', error.response?.data);
        console.error('Request payload:', JSON.stringify(orderData, null, 2));
        console.error('Request config:', {
            url: error.config?.url,
            method: error.config?.method,
            headers: error.config?.headers
        });
        
        if (error.response?.status === 403) {
            console.error('=== 403 ERROR DETAILS ===');
            console.error('This usually means:');
            console.error('1. Invalid or expired token');
            console.error('2. Account suspended or inactive');
            console.error('3. API access disabled');
            console.error('4. IP restrictions');
            console.error('5. Rate limiting');
            
            // Token might be expired, try to re-authenticate
            console.log('Token expired, re-authenticating...');
            token = null;
            tokenExpiry = null;
            await ensureValidToken();
            
            // Retry once
            console.log('Retrying with new token...');
            const retryRes = await axios.post(
                `${SHIPROCKET_BASE_URL}/orders/create/adhoc`,
                orderData,
                { 
                    headers: { 
                        Authorization: `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    } 
                }
            );
            console.log('Retry successful:', retryRes.data);
            return retryRes.data;
        }
        
        throw error;
    }
}

async function getShiprocketTracking(shipmentId) {
    try {
        await ensureValidToken();
        const res = await axios.get(
            `${SHIPROCKET_BASE_URL}/courier/track/shipment/${shipmentId}`,
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
            `${SHIPROCKET_BASE_URL}/courier/generate/label/${shipmentId}`,
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
            `${SHIPROCKET_BASE_URL}/courier/generate/pickup`,
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
            `${SHIPROCKET_BASE_URL}/courier/cancel/shipment`,
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
            `${SHIPROCKET_BASE_URL}/orders`,
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
    authenticateShiprocket,
    createShiprocketOrder,
    getShiprocketTracking,
    getShiprocketLabel,
    requestShiprocketPickup,
    cancelShiprocketShipment,
    getAllShiprocketOrders
}; 