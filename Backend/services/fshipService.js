const axios = require('axios');

// FShip API Configuration
const FSHIP_STAGING_URL = 'https://capi-qc.fship.in';
const FSHIP_PRODUCTION_URL = 'https://capi.fship.in';
const FSHIP_API_KEY = process.env.FSHIP_API_KEY;
const FSHIP_ENVIRONMENT = process.env.FSHIP_ENVIRONMENT || 'staging';

const BASE_URL = FSHIP_ENVIRONMENT === 'production' ? FSHIP_PRODUCTION_URL : FSHIP_STAGING_URL;

console.log('FShip Configuration:', {
    environment: FSHIP_ENVIRONMENT,
    baseUrl: BASE_URL,
    apiKey: FSHIP_API_KEY ? 'Present' : 'Missing'
});

/**
 * FShip Service Class
 * Handles all FShip API interactions for Cross-Coin platform
 */
class FShipService {
    constructor() {
        this.baseURL = BASE_URL;
        this.apiKey = FSHIP_API_KEY;
        this.axiosInstance = this.createAxiosInstance();
    }

    /**
     * Create configured axios instance
     */
    createAxiosInstance() {
        return axios.create({
            baseURL: this.baseURL,
            timeout: 30000, // 30 seconds timeout
            headers: {
                'Content-Type': 'application/json',
                'signature': this.apiKey
            }
        });
    }

    /**
     * Handle API errors consistently
     */
    handleApiError(error, operation) {
        console.error(`=== FShip ${operation} Error ===`);
        console.error('Status:', error.response?.status);
        console.error('Status Text:', error.response?.statusText);
        console.error('Error Data:', JSON.stringify(error.response?.data, null, 2));
        console.error('Error Message:', error.message);

        if (error.response?.status === 401) {
            throw new Error('FShip authentication failed: Invalid API key');
        } else if (error.response?.status === 400) {
            throw new Error(`FShip ${operation} failed: ${error.response?.data?.response || 'Bad request'}`);
        } else if (!error.response) {
            throw new Error(`FShip ${operation} failed: Network error`);
        } else {
            throw new Error(`FShip ${operation} failed: ${error.response?.data?.response || error.message}`);
        }
    }

    /**
     * Get list of available couriers
     */
    async getCourierList() {
        try {
            console.log('=== FShip Get Courier List ===');
            const response = await this.axiosInstance.get('/api/getallcourier');
            console.log('Couriers fetched successfully:', response.data.length);
            return response.data;
        } catch (error) {
            this.handleApiError(error, 'Get Courier List');
        }
    }

    /**
     * Add new warehouse/pickup location
     */
    async addWarehouse(warehouseData) {
        try {
            console.log('=== FShip Add Warehouse ===');
            console.log('Warehouse Data:', JSON.stringify(warehouseData, null, 2));

            const payload = {
                warehouseId: 0,
                warehouseName: warehouseData.warehouseName,
                contactName: warehouseData.contactName,
                addressLine1: warehouseData.addressLine1,
                addressLine2: warehouseData.addressLine2 || '',
                pincode: warehouseData.pincode,
                city: warehouseData.city,
                stateId: warehouseData.stateId || 0,
                countryId: warehouseData.countryId || 0,
                phoneNumber: warehouseData.phoneNumber,
                email: warehouseData.email
            };

            const response = await this.axiosInstance.post('/api/addwarehouse', payload);
            console.log('Warehouse added successfully:', response.data);
            return response.data;
        } catch (error) {
            this.handleApiError(error, 'Add Warehouse');
        }
    }

    /**
     * Update existing warehouse
     */
    async updateWarehouse(warehouseData) {
        try {
            console.log('=== FShip Update Warehouse ===');
            const response = await this.axiosInstance.post('/api/updatewarehouse', warehouseData);
            console.log('Warehouse updated successfully:', response.data);
            return response.data;
        } catch (error) {
            this.handleApiError(error, 'Update Warehouse');
        }
    }

    /**
     * Create forward order (seller to customer)
     */
    async createForwardOrder(orderData) {
        try {
            console.log('=== FShip Create Forward Order ===');
            console.log('Order Data:', JSON.stringify(orderData, null, 2));

            // Validate required fields
            this.validateOrderData(orderData);

            // Format order data for FShip API
            const fshipOrderData = this.formatOrderDataForFShip(orderData);

            const response = await this.axiosInstance.post('/api/createforwardorder', fshipOrderData);
            console.log('Order created successfully:', response.data);
            
            return {
                success: true,
                orderId: response.data.apiorderid,
                waybill: response.data.waybill,
                routeCode: response.data.route_code,
                status: response.data.order_status,
                labelUrl: response.data.labelurl,
                response: response.data.response
            };
        } catch (error) {
            this.handleApiError(error, 'Create Forward Order');
        }
    }

    /**
     * Validate order data before sending to FShip
     */
    validateOrderData(orderData) {
        const required = [
            'customer_Name', 'customer_Mobile', 'customer_Address', 
            'customer_PinCode', 'customer_City', 'orderId', 
            'payment_Mode', 'express_Type', 'shipment_Weight',
            'shipment_Length', 'shipment_Width', 'shipment_Height',
            'pick_Address_ID', 'products'
        ];

        for (const field of required) {
            if (!orderData[field]) {
                throw new Error(`Missing required field: ${field}`);
            }
        }

        if (!Array.isArray(orderData.products) || orderData.products.length === 0) {
            throw new Error('Products array is required and cannot be empty');
        }
    }

    /**
     * Format Cross-Coin order data for FShip API
     */
    formatOrderDataForFShip(orderData) {
        // Calculate volumetric weight (L x W x H / 5000)
        const volumetricWeight = (
            orderData.shipment_Length * 
            orderData.shipment_Width * 
            orderData.shipment_Height
        ) / 5000;

        return {
            customer_Name: orderData.customer_Name,
            customer_Mobile: this.formatPhoneNumber(orderData.customer_Mobile),
            customer_Emailid: orderData.customer_Emailid || '',
            customer_Address: orderData.customer_Address,
            landMark: orderData.landMark || '',
            customer_Address_Type: orderData.customer_Address_Type || 'Home',
            customer_PinCode: orderData.customer_PinCode,
            customer_City: orderData.customer_City,
            orderId: orderData.orderId,
            invoice_Number: orderData.invoice_Number || '',
            payment_Mode: orderData.payment_Mode, // 1=COD, 2=PREPAID
            express_Type: orderData.express_Type, // 'air' or 'surface'
            is_Ndd: orderData.is_Ndd || 0, // Next Day Delivery
            order_Amount: orderData.order_Amount || 0,
            tax_Amount: orderData.tax_Amount || 0,
            extra_Charges: orderData.extra_Charges || 0,
            total_Amount: orderData.total_Amount || orderData.order_Amount,
            cod_Amount: orderData.payment_Mode === 1 ? orderData.total_Amount : 0,
            shipment_Weight: orderData.shipment_Weight,
            shipment_Length: orderData.shipment_Length,
            shipment_Width: orderData.shipment_Width,
            shipment_Height: orderData.shipment_Height,
            volumetric_Weight: volumetricWeight,
            latitude: orderData.latitude || 0,
            longitude: orderData.longitude || 0,
            pick_Address_ID: orderData.pick_Address_ID,
            return_Address_ID: orderData.return_Address_ID || orderData.pick_Address_ID,
            products: orderData.products.map(product => ({
                productId: product.productId || '',
                productName: product.productName,
                unitPrice: product.unitPrice || 0,
                quantity: product.quantity || 1,
                productCategory: product.productCategory || '',
                hsnCode: product.hsnCode || '',
                sku: product.sku || '',
                taxRate: product.taxRate || 0,
                productDiscount: product.productDiscount || 0
            })),
            courierId: orderData.courierId || 0 // 0 for auto-selection
        };
    }

    /**
     * Format phone number to 10 digits
     */
    formatPhoneNumber(phone) {
        if (!phone) return '9876543210';
        
        const digits = phone.toString().replace(/\D/g, '');
        
        if (digits.length === 12 && digits.startsWith('91')) {
            return digits.substring(2);
        }
        
        if (digits.length === 11 && digits.startsWith('0')) {
            return digits.substring(1);
        }
        
        if (digits.length === 10) {
            return digits;
        }
        
        if (digits.length > 10) {
            return digits.slice(-10);
        }
        
        return '9876543210';
    }

    /**
     * Cancel order
     */
    async cancelOrder(waybill, reason = 'Order cancelled by customer') {
        try {
            console.log('=== FShip Cancel Order ===');
            console.log('Waybill:', waybill, 'Reason:', reason);

            const payload = {
                waybill: waybill,
                reason: reason
            };

            const response = await this.axiosInstance.post('/api/cancelorder', payload);
            console.log('Order cancelled successfully:', response.data);
            return response.data;
        } catch (error) {
            this.handleApiError(error, 'Cancel Order');
        }
    }

    /**
     * Ship order (generate AWB for created order)
     */
    async shipOrder(apiOrderId, courierId = null) {
        try {
            console.log('=== FShip Ship Order ===');
            console.log('API Order ID:', apiOrderId, 'Courier ID:', courierId);

            const payload = {
                apiorderid: apiOrderId,
                courierId: courierId
            };

            const response = await this.axiosInstance.post('/api/shiporder', payload);
            console.log('Order shipped successfully:', response.data);
            return response.data;
        } catch (error) {
            this.handleApiError(error, 'Ship Order');
        }
    }

    /**
     * Register pickup for orders
     */
    async registerPickup(waybills) {
        try {
            console.log('=== FShip Register Pickup ===');
            console.log('Waybills:', waybills);

            const payload = {
                waybills: Array.isArray(waybills) ? waybills : [waybills]
            };

            const response = await this.axiosInstance.post('/api/registerpickup', payload);
            console.log('Pickup registered successfully:', response.data);
            return response.data;
        } catch (error) {
            this.handleApiError(error, 'Register Pickup');
        }
    }

    /**
     * Get shipping label details
     */
    async getShippingLabel(waybills) {
        try {
            console.log('=== FShip Get Shipping Label ===');
            console.log('Waybills:', waybills);

            const waybillString = Array.isArray(waybills) ? waybills.join(',') : waybills;
            const payload = {
                waybill: waybillString
            };

            const response = await this.axiosInstance.post('/api/shippinglabel', payload);
            console.log('Shipping label fetched successfully');
            return response.data;
        } catch (error) {
            this.handleApiError(error, 'Get Shipping Label');
        }
    }

    /**
     * Get tracking history for order
     */
    async getTrackingHistory(waybill) {
        try {
            console.log('=== FShip Get Tracking History ===');
            console.log('Waybill:', waybill);

            const payload = {
                waybill: waybill
            };

            const response = await this.axiosInstance.post('/api/trackinghistory', payload);
            console.log('Tracking history fetched successfully');
            return response.data;
        } catch (error) {
            this.handleApiError(error, 'Get Tracking History');
        }
    }

    /**
     * Get current shipment status
     */
    async getShipmentStatus(waybill) {
        try {
            console.log('=== FShip Get Shipment Status ===');
            console.log('Waybill:', waybill);

            const payload = {
                waybill: waybill
            };

            const response = await this.axiosInstance.post('/api/shipmentsummary', payload);
            console.log('Shipment status fetched successfully');
            return response.data;
        } catch (error) {
            this.handleApiError(error, 'Get Shipment Status');
        }
    }

    /**
     * Calculate shipping rates
     */
    async calculateRates(rateData) {
        try {
            console.log('=== FShip Calculate Rates ===');
            console.log('Rate Data:', JSON.stringify(rateData, null, 2));

            const volumetricWeight = (
                rateData.shipment_Length * 
                rateData.shipment_Width * 
                rateData.shipment_Height
            ) / 5000;

            const payload = {
                source_Pincode: rateData.source_Pincode,
                destination_Pincode: rateData.destination_Pincode,
                payment_Mode: rateData.payment_Mode, // 'COD' or 'P'
                amount: rateData.amount || 0,
                express_Type: rateData.express_Type || 'surface',
                shipment_Weight: rateData.shipment_Weight,
                shipment_Length: rateData.shipment_Length,
                shipment_Width: rateData.shipment_Width,
                shipment_Height: rateData.shipment_Height,
                volumetric_Weight: volumetricWeight
            };

            const response = await this.axiosInstance.post('/api/ratecalculator', payload);
            console.log('Rates calculated successfully');
            return response.data;
        } catch (error) {
            this.handleApiError(error, 'Calculate Rates');
        }
    }

    /**
     * Check pincode serviceability
     */
    async checkServiceability(sourcePincode, destinationPincode) {
        try {
            console.log('=== FShip Check Serviceability ===');
            console.log('Source:', sourcePincode, 'Destination:', destinationPincode);

            const payload = {
                source_Pincode: sourcePincode,
                destination_Pincode: destinationPincode
            };

            const response = await this.axiosInstance.post('/api/pincodeserviceability', payload);
            console.log('Serviceability checked successfully');
            return response.data;
        } catch (error) {
            this.handleApiError(error, 'Check Serviceability');
        }
    }

    /**
     * Re-attempt delivery
     */
    async reattemptOrder(reattemptData) {
        try {
            console.log('=== FShip Re-attempt Order ===');
            console.log('Re-attempt Data:', JSON.stringify(reattemptData, null, 2));

            const response = await this.axiosInstance.post('/api/reattemptorder', reattemptData);
            console.log('Re-attempt registered successfully');
            return response.data;
        } catch (error) {
            this.handleApiError(error, 'Re-attempt Order');
        }
    }

    /**
     * Map FShip status to Cross-Coin status
     */
    mapFShipStatusToCrossCoin(fshipStatus) {
        const statusMapping = {
            'Booked': 'processing',
            'Manifested': 'processing',
            'In Transit': 'shipped',
            'Out for Delivery': 'out_for_delivery',
            'Delivered': 'delivered',
            'RTO': 'returned',
            'Cancelled': 'cancelled',
            'Exception': 'exception'
        };

        return statusMapping[fshipStatus] || 'processing';
    }

    /**
     * Test API connectivity and credentials
     */
    async testConnection() {
        try {
            console.log('=== FShip Test Connection ===');
            const couriers = await this.getCourierList();
            console.log('Connection test successful. Available couriers:', couriers.length);
            return {
                success: true,
                message: 'FShip API connection successful',
                couriers: couriers.length
            };
        } catch (error) {
            console.error('Connection test failed:', error.message);
            return {
                success: false,
                message: error.message
            };
        }
    }
}

module.exports = new FShipService();