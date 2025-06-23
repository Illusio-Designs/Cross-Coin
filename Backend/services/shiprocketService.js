import axios from 'axios';

const SHIPROCKET_EMAIL = process.env.SHIPROCKET_EMAIL;
const SHIPROCKET_PASSWORD = process.env.SHIPROCKET_PASSWORD;
const SHIPROCKET_BASE_URL = 'https://apiv2.shiprocket.in/v1/external';

let token = null;

export async function authenticateShiprocket() {
    const res = await axios.post(`${SHIPROCKET_BASE_URL}/auth/login`, {
        email: SHIPROCKET_EMAIL,
        password: SHIPROCKET_PASSWORD
    });
    token = res.data.token;
    return token;
}

export async function createShiprocketOrder(orderData) {
    if (!token) await authenticateShiprocket();
    const res = await axios.post(
        `${SHIPROCKET_BASE_URL}/orders/create/adhoc`,
        orderData,
        { headers: { Authorization: `Bearer ${token}` } }
    );
    return res.data;
}

export async function getShiprocketTracking(shipmentId) {
    if (!token) await authenticateShiprocket();
    const res = await axios.get(
        `${SHIPROCKET_BASE_URL}/courier/track/shipment/${shipmentId}`,
        { headers: { Authorization: `Bearer ${token}` } }
    );
    return res.data;
}

export async function getShiprocketLabel(shipmentId) {
    if (!token) await authenticateShiprocket();
    const res = await axios.get(
        `${SHIPROCKET_BASE_URL}/courier/generate/label/${shipmentId}`,
        { headers: { Authorization: `Bearer ${token}` } }
    );
    // The response contains a label_url (PDF)
    return res.data;
}

export async function requestShiprocketPickup(shipmentIds, pickupLocation = 'Default') {
    if (!token) await authenticateShiprocket();
    const res = await axios.post(
        `${SHIPROCKET_BASE_URL}/courier/generate/pickup`,
        {
            shipment_id: shipmentIds, // array of shipment IDs
            pickup_location: pickupLocation
        },
        { headers: { Authorization: `Bearer ${token}` } }
    );
    return res.data;
}

export async function cancelShiprocketShipment(shipmentIds) {
    if (!token) await authenticateShiprocket();
    const res = await axios.post(
        `${SHIPROCKET_BASE_URL}/courier/cancel/shipment`,
        { shipment_id: shipmentIds }, // array of shipment IDs
        { headers: { Authorization: `Bearer ${token}` } }
    );
    return res.data;
} 