const axios = require('axios');
const { logger } = require('../config/logging.js');
const settingsHelper = require('./settingsHelper');

// FShip API Configuration
const FSHIP_STAGING_URL = 'https://capi-qc.fship.in';

/**
 * FShip Service Class
 * Handles all FShip API interactions for Cross-Coin platform
 */
class FShipService {
    constructor(brandId = 1) {
        this.brandId = brandId;
        this.initialized = false;
    }

    /**
     * Initialize service with brand settings
     */
    async initialize() {
        if (this.initialized) return;
        if (this._initPromise) return this._initPromise;
        
        this._initPromise = (async () => {
            const FSHIP_ENVIRONMENT = await settingsHelper.getSetting(this.brandId, 'FSHIP_ENVIRONMENT', 'staging');
            const FSHIP_PRODUCTION_URL = await settingsHelper.getSetting(this.brandId, 'FSHIP_PRODUCTION_URL', 'https://capi.fship.in');
            this.apiKey = await settingsHelper.getSetting(this.brandId, 'FSHIP_API_KEY');
            this.baseURL = FSHIP_ENVIRONMENT === 'production' ? FSHIP_PRODUCTION_URL : FSHIP_STAGING_URL;
            
            logger.debug('FShip Configuration:', {
                brandId: this.brandId,
                environment: FSHIP_ENVIRONMENT,
                baseUrl: this.baseURL,
                apiKey: this.apiKey ? 'Present' : 'Missing'
            });
            
            this.axiosInstance = this.createAxiosInstance();
            this.initialized = true;
        })();
        
        try {
            await this._initPromise;
        } finally {
            this._initPromise = null;
        }
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
     * Redact PII from data before logging
     */
    _redactPII(data) {
        if (!data) return data;
        const str = JSON.stringify(data);
        // Mask phone numbers (keep last 4 digits)
        return str.replace(/(\d{6,})/g, (match) => '****' + match.slice(-4));
    }

    /**
     * Handle API errors consistently
     */
    handleApiError(error, operation) {
        console.error(`=== FShip ${operation} Error ===`);
        console.error('Status:', error.response?.status);
        console.error('Status Text:', error.response?.statusText);
        console.error('Error Data:', this._redactPII(error.response?.data));
        console.error('Error Message:', error.message);

        if (error.response?.status === 401) {
            throw new Error('FShip authentication failed: Invalid API key');
        } else if (error.response?.status === 400) {
            // Try to get more specific error details
            const errorData = error.response?.data;
            let errorMessage = 'Bad request';
            
            if (errorData) {
                if (errorData.response) {
                    errorMessage = errorData.response;
                } else if (errorData.message) {
                    errorMessage = errorData.message;
                } else if (errorData.error) {
                    errorMessage = errorData.error;
                } else if (typeof errorData === 'string') {
                    errorMessage = errorData;
                } else {
                    errorMessage = `Bad request - ${JSON.stringify(errorData)}`;
                }
            }
            
            throw new Error(`FShip ${operation} failed: ${errorMessage}`);
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
        await this.initialize();
        try {
            logger.debug('=== FShip Get Courier List ===');
            const response = await this.axiosInstance.get('/api/getallcourier');
            logger.debug('Couriers fetched successfully:', response.data.length);
            return response.data;
        } catch (error) {
            this.handleApiError(error, 'Get Courier List');
        }
    }

    /**
     * Add new warehouse/pickup location
     */
    async addWarehouse(warehouseData) {
        await this.initialize();
        try {
            logger.debug('=== FShip Add Warehouse ===');
            logger.debug('Warehouse Data:', this._redactPII(warehouseData));

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
            logger.debug('Warehouse added successfully:', response.data);
            return response.data;
        } catch (error) {
            this.handleApiError(error, 'Add Warehouse');
        }
    }

    /**
     * Update existing warehouse
     */
    async updateWarehouse(warehouseData) {
        await this.initialize();
        try {
            logger.debug('=== FShip Update Warehouse ===');
            const response = await this.axiosInstance.post('/api/updatewarehouse', warehouseData);
            logger.debug('Warehouse updated successfully:', response.data);
            return response.data;
        } catch (error) {
            this.handleApiError(error, 'Update Warehouse');
        }
    }

    /**
     * Create forward order (seller to customer)
     */
    async createForwardOrder(orderData) {
        await this.initialize();
        try {
            logger.debug('=== FShip Create Forward Order ===');
            logger.debug('Order Data:', this._redactPII(orderData));

            // Validate required fields
            this.validateOrderData(orderData);

            // Format order data for FShip API
            const fshipOrderData = this.formatOrderDataForFShip(orderData);

            const response = await this.axiosInstance.post('/api/createforwardorder', fshipOrderData);
            logger.debug('FShip Create Order Response:', JSON.stringify(response.data, null, 2));
            
            // Validate that FShip actually returned meaningful data
            const orderId = response.data.apiorderid || response.data.order_id || response.data.orderId || 0;
            const waybill = response.data.waybill || response.data.awb_number || response.data.awb || '';
            
            if (!orderId && !waybill) {
                // Log the full response for debugging
                console.error('⚠️ FShip returned empty orderId and waybill. Full response:', JSON.stringify(response.data, null, 2));
                
                // Check if FShip returned an error message in the response body
                const fshipMsg = response.data.message || response.data.error || response.data.response || response.data.status || '';
                
                return {
                    success: false,
                    message: fshipMsg 
                        ? `FShip error: ${fshipMsg}` 
                        : 'FShip accepted the request but did not return an order ID or AWB. Check courier assignment settings in FShip dashboard.'
                };
            }

            return {
                success: true,
                orderId: orderId,
                waybill: waybill,
                routeCode: response.data.route_code || response.data.routeCode || null,
                status: response.data.order_status || response.data.status || null,
                labelUrl: response.data.labelurl || response.data.label_url || null,
                courierName: response.data.courier_name || response.data.courierName || response.data.courier || response.data.Courier || null,
                courierId: response.data.courier_id || response.data.courierId || null,
                response: response.data.response
            };
        } catch (error) {
            this.handleApiError(error, 'Create Forward Order');
        }
    }

    /**
     * Create or update forward order with existence check
     */
    async createOrUpdateForwardOrder(orderData) {
        await this.initialize();
        try {
            logger.debug('=== FShip Create or Update Forward Order ===');
            logger.debug('Order ID:', orderData.orderId);

            // First check if order exists
            const existingOrder = await this.findOrderByIdFromAll(orderData.orderId);
            
            if (existingOrder.exists) {
                logger.debug(`📋 Order ${orderData.orderId} already exists in FShip`);
                logger.debug('Existing order details:', existingOrder.data);
                
                // Check if order is in a state that can be updated
                const currentStatus = (existingOrder.data.order_status || existingOrder.data.status || '').toLowerCase();
                const updatableStatuses = ['booked', 'pickup initiated', 'pickup pending', 'processing'];
                
                if (updatableStatuses.includes(currentStatus)) {
                    logger.debug(`🔄 Order status '${currentStatus}' allows updates. Attempting to update...`);
                    return await this.updateExistingOrder(orderData, existingOrder.data);
                } else {
                    logger.debug(`⚠️ Order status '${currentStatus}' cannot be updated. Returning existing order info.`);
                    return {
                        success: true,
                        action: 'existing',
                        orderId: existingOrder.data.apiorderid || existingOrder.data.order_id,
                        waybill: existingOrder.data.waybill || existingOrder.data.awb_number,
                        labelUrl: existingOrder.data.labelurl || existingOrder.data.label_url || null,
                        routeCode: existingOrder.data.route_code || null,
                        courierName: existingOrder.data.courier_name || existingOrder.data.courierName || null,
                        courierId: existingOrder.data.courier_id || existingOrder.data.courierId || null,
                        status: currentStatus,
                        message: `Order already exists with status: ${currentStatus}`,
                        existingData: existingOrder.data
                    };
                }
            } else {
                logger.debug(`✨ Order ${orderData.orderId} not found. Creating new order...`);
                const result = await this.createForwardOrder(orderData);
                return {
                    ...result,
                    action: 'created'
                };
            }
        } catch (error) {
            console.error('Error in createOrUpdateForwardOrder:', error.message);
            throw error;
        }
    }

    /**
     * Update existing order in FShip
     */
    async updateExistingOrder(orderData, existingOrderData) {
        await this.initialize();
        try {
            logger.debug('=== FShip Update Existing Order ===');
            
            // Try to cancel the existing order first if it has a waybill
            const existingWaybill = existingOrderData.waybill || existingOrderData.awb_number;
            
            if (existingWaybill && existingWaybill !== 'N/A') {
                try {
                    logger.debug(`🗑️ Attempting to cancel existing order with waybill: ${existingWaybill}`);
                    await this.cancelOrder(existingWaybill, 'Order updated - cancelling old version');
                    logger.debug('✅ Existing order cancelled successfully');
                } catch (cancelError) {
                    logger.debug(`⚠️ Could not cancel existing order: ${cancelError.message}`);
                    // Continue with creating new order even if cancel fails
                }
            }
            
            // Create new order with updated data
            logger.debug('🆕 Creating new order with updated data...');
            const result = await this.createForwardOrder(orderData);
            
            return {
                ...result,
                action: 'updated',
                previousOrderId: existingOrderData.apiorderid || existingOrderData.order_id,
                previousWaybill: existingWaybill
            };
        } catch (error) {
            console.error('Error updating existing order:', error.message);
            throw error;
        }
    }

    /**
     * Bulk create or update forward orders
     */
    async bulkCreateOrUpdateOrders(ordersArray) {
        await this.initialize();
        try {
            logger.debug('=== FShip Bulk Create/Update Orders ===');
            logger.debug(`Processing ${ordersArray.length} orders...`);

            const results = {
                total: ordersArray.length,
                created: 0,
                updated: 0,
                existing: 0,
                failed: 0,
                details: [],
                errors: []
            };

            // Process orders with controlled concurrency (5 at a time to avoid rate limits)
            const batchSize = 5;
            for (let i = 0; i < ordersArray.length; i += batchSize) {
                const batch = ordersArray.slice(i, i + batchSize);
                logger.debug(`\n📦 Processing batch ${Math.floor(i/batchSize) + 1}/${Math.ceil(ordersArray.length/batchSize)}`);
                
                const batchPromises = batch.map(async (orderData, index) => {
                    const globalIndex = i + index + 1;
                    try {
                        logger.debug(`\n🔄 [${globalIndex}/${ordersArray.length}] Processing order: ${orderData.orderId}`);
                        
                        const result = await this.createOrUpdateForwardOrder(orderData);
                        
                        logger.debug(`✅ [${globalIndex}/${ordersArray.length}] ${result.action.toUpperCase()}: ${orderData.orderId}`);
                        
                        results[result.action]++;
                        results.details.push({
                            orderNumber: orderData.orderId,
                            action: result.action,
                            success: true,
                            fshipOrderId: result.orderId,
                            waybill: result.waybill,
                            status: result.status,
                            message: result.message || `Order ${result.action} successfully`
                        });
                        
                        return result;
                    } catch (error) {
                        console.error(`❌ [${globalIndex}/${ordersArray.length}] Failed: ${orderData.orderId} - ${error.message}`);
                        
                        results.failed++;
                        results.errors.push({
                            orderNumber: orderData.orderId,
                            error: error.message,
                            action: 'failed'
                        });
                        
                        results.details.push({
                            orderNumber: orderData.orderId,
                            action: 'failed',
                            success: false,
                            error: error.message
                        });
                        
                        return null;
                    }
                });

                // Wait for current batch to complete
                await Promise.all(batchPromises);
                
                // Add delay between batches to avoid rate limiting
                if (i + batchSize < ordersArray.length) {
                    logger.debug('⏳ Waiting 2 seconds before next batch...');
                    await new Promise(resolve => setTimeout(resolve, 2000));
                }
            }

            // Generate summary
            logger.debug('\n📊 BULK OPERATION SUMMARY:');
            logger.debug('='.repeat(40));
            logger.debug(`📦 Total Orders: ${results.total}`);
            logger.debug(`✨ Created: ${results.created}`);
            logger.debug(`🔄 Updated: ${results.updated}`);
            logger.debug(`📋 Existing: ${results.existing}`);
            logger.debug(`❌ Failed: ${results.failed}`);
            logger.debug(`✅ Success Rate: ${((results.total - results.failed) / results.total * 100).toFixed(1)}%`);

            return results;
        } catch (error) {
            console.error('Error in bulk operation:', error.message);
            throw error;
        }
    }

    /**
     * Validate order data before sending to FShip
     * Comprehensive checks to prevent bad data reaching the courier API
     */
    validateOrderData(orderData) {
        const errors = [];

        // ── Required fields presence ──────────────────────────────────────
        const required = [
            'customer_Name', 'customer_Mobile', 'customer_Address', 
            'customer_PinCode', 'customer_City', 'orderId', 
            'payment_Mode', 'express_Type', 'shipment_Weight',
            'shipment_Length', 'shipment_Width', 'shipment_Height',
            'pick_Address_ID', 'products'
        ];

        for (const field of required) {
            if (!orderData[field]) {
                errors.push(`Missing required field: ${field}`);
            }
        }

        if (!Array.isArray(orderData.products) || orderData.products.length === 0) {
            errors.push('Products array is required and cannot be empty');
        }

        // ── Customer name ─────────────────────────────────────────────────
        if (orderData.customer_Name) {
            const name = String(orderData.customer_Name).trim();
            if (name.length < 2) errors.push('Customer name is too short (min 2 characters)');
            if (/^\d+$/.test(name)) errors.push('Customer name cannot be only numbers');
        }

        // ── Address quality ───────────────────────────────────────────────
        if (orderData.customer_Address) {
            const addr = String(orderData.customer_Address).trim();
            if (addr.length < 10) errors.push(`Address is too short (${addr.length} chars, min 10) — courier will reject`);
            const junk = [/^test/i, /^asdf/i, /^xxx/i, /^abc$/i, /^na$/i, /^n\/a$/i, /^\.+$/, /^-+$/];
            if (junk.some(p => p.test(addr))) errors.push('Address appears to be a placeholder/test value');
        }

        // ── City ──────────────────────────────────────────────────────────
        if (orderData.customer_City) {
            const city = String(orderData.customer_City).trim();
            if (city.length < 2) errors.push('City name is too short');
            if (/^\d+$/.test(city)) errors.push('City cannot be only numbers');
        }

        // ── Pincode ───────────────────────────────────────────────────────
        if (orderData.customer_PinCode) {
            const pin = String(orderData.customer_PinCode).trim();
            if (!/^\d{6}$/.test(pin)) errors.push(`Pincode "${pin}" is not a valid 6-digit Indian pincode`);
            else if (['000000', '111111', '999999'].includes(pin)) errors.push(`Pincode "${pin}" is a placeholder`);
        }

        // ── Phone ─────────────────────────────────────────────────────────
        if (orderData.customer_Mobile) {
            const digits = String(orderData.customer_Mobile).replace(/\D/g, '');
            let ten = digits;
            if (digits.length === 12 && digits.startsWith('91')) ten = digits.substring(2);
            else if (digits.length === 11 && digits.startsWith('0')) ten = digits.substring(1);
            else if (digits.length > 10) ten = digits.slice(-10);

            if (ten.length !== 10) {
                errors.push(`Phone "${orderData.customer_Mobile}" could not be normalised to 10 digits`);
            } else if (!/^[6-9]\d{9}$/.test(ten)) {
                errors.push(`Phone "${ten}" is not a valid Indian mobile (must start with 6-9)`);
            } else if (/^(\d)\1{9}$/.test(ten)) {
                errors.push(`Phone "${ten}" is a repeated digit — likely fake`);
            } else if (ten === '9876543210' || ten === '1234567890') {
                errors.push(`Phone "${ten}" is a known placeholder`);
            }
        }

        // ── Throw if any errors ───────────────────────────────────────────
        if (errors.length > 0) {
            throw new Error(`Order validation failed: ${errors.join('; ')}`);
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
            customer_PinCode: String(orderData.customer_PinCode).trim(),
            customer_City: orderData.customer_City,
            customer_State: orderData.customer_State || '',
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
        if (!phone) throw new Error('Phone number is required for shipping');
        
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
        
        throw new Error(`Invalid phone number: ${phone}`);
    }

    /**
     * Cancel order
     */
    async cancelOrder(waybill, reason = 'Order cancelled by customer') {
        await this.initialize();
        try {
            logger.debug('=== FShip Cancel Order ===');
            logger.debug('Waybill:', waybill, 'Reason:', reason);

            const payload = {
                waybill: waybill,
                reason: reason
            };

            const response = await this.axiosInstance.post('/api/cancelorder', payload);
            logger.debug('Order cancelled successfully:', response.data);
            return response.data;
        } catch (error) {
            this.handleApiError(error, 'Cancel Order');
        }
    }

    /**
     * Ship order (generate AWB for created order)
     */
    async shipOrder(apiOrderId, courierId = null) {
        await this.initialize();
        try {
            logger.debug('=== FShip Ship Order ===');
            logger.debug('API Order ID:', apiOrderId, 'Courier ID:', courierId);

            const payload = {
                apiorderid: apiOrderId,
                courierId: courierId
            };

            const response = await this.axiosInstance.post('/api/shiporder', payload);
            logger.debug('Order shipped successfully:', response.data);
            return response.data;
        } catch (error) {
            this.handleApiError(error, 'Ship Order');
        }
    }

    /**
     * Register pickup for orders
     */
    async registerPickup(waybills) {
        await this.initialize();
        try {
            logger.debug('=== FShip Register Pickup ===');
            logger.debug('Waybills:', waybills);

            const payload = {
                waybills: Array.isArray(waybills) ? waybills : [waybills]
            };

            const response = await this.axiosInstance.post('/api/registerpickup', payload);
            logger.debug('Pickup registered successfully:', response.data);
            return response.data;
        } catch (error) {
            this.handleApiError(error, 'Register Pickup');
        }
    }

    /**
     * Get shipping label details
     */
    async getShippingLabel(waybills) {
        await this.initialize();
        try {
            logger.debug('=== FShip Get Shipping Label ===');
            logger.debug('Waybills:', waybills);

            const waybillString = Array.isArray(waybills) ? waybills.join(',') : waybills;
            const payload = {
                waybill: waybillString
            };

            const response = await this.axiosInstance.post('/api/shippinglabel', payload);
            logger.debug('Shipping label fetched successfully');
            return response.data;
        } catch (error) {
            this.handleApiError(error, 'Get Shipping Label');
        }
    }

    /**
     * Get tracking history for order
     */
    async getTrackingHistory(waybill) {
        await this.initialize();
        try {
            logger.debug('=== FShip Get Tracking History ===');
            logger.debug('Waybill:', waybill);

            const payload = {
                waybill: waybill
            };

            const response = await this.axiosInstance.post('/api/trackinghistory', payload);
            logger.debug('Tracking history fetched successfully');
            return response.data;
        } catch (error) {
            this.handleApiError(error, 'Get Tracking History');
        }
    }

    /**
     * Get current shipment status
     */
    async getShipmentStatus(waybill) {
        await this.initialize();
        try {
            logger.debug('=== FShip Get Shipment Status ===');
            logger.debug('Waybill:', waybill);

            const payload = {
                waybill: waybill
            };

            const response = await this.axiosInstance.post('/api/shipmentsummary', payload);
            logger.debug('Shipment status fetched successfully');
            return response.data;
        } catch (error) {
            this.handleApiError(error, 'Get Shipment Status');
        }
    }

    /**
     * Calculate shipping rates
     */
    async calculateRates(rateData) {
        await this.initialize();
        try {
            logger.debug('=== FShip Calculate Rates ===');
            logger.debug('Rate Data:', JSON.stringify(rateData, null, 2));

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
            logger.debug('Rates calculated successfully');
            return response.data;
        } catch (error) {
            this.handleApiError(error, 'Calculate Rates');
        }
    }

    /**
     * Check pincode serviceability
     */
    async checkServiceability(sourcePincode, destinationPincode) {
        await this.initialize();
        try {
            logger.debug('=== FShip Check Serviceability ===');
            logger.debug('Source:', sourcePincode, 'Destination:', destinationPincode);

            const payload = {
                source_Pincode: sourcePincode,
                destination_Pincode: destinationPincode
            };

            const response = await this.axiosInstance.post('/api/pincodeserviceability', payload);
            logger.debug('Serviceability response:', JSON.stringify(response.data, null, 2));
            // Normalize: FShip may return { data: [...] }, { response: [...] }, or a bare array
            const raw = response.data;
            if (Array.isArray(raw)) return raw;
            if (raw && Array.isArray(raw.data)) return raw.data;
            if (raw && Array.isArray(raw.response)) return raw.response;
            if (raw && Array.isArray(raw.couriers)) return raw.couriers;
            // If it's a single object (one courier), wrap it
            if (raw && typeof raw === 'object' && !Array.isArray(raw)) return [raw];
            return raw;
        } catch (error) {
            this.handleApiError(error, 'Check Serviceability');
        }
    }

    /**
     * Map FShip status to Cross-Coin status
     */
    mapFShipStatusToCrossCoin(fshipStatus) {
        if (!fshipStatus) return 'processing';
        
        const status = fshipStatus.toLowerCase().trim();
        
        // Valid FShip statuses that we now support directly
        const validStatuses = [
            'booked', 
            'pickup initiated', 
            'manifested', 
            'in transit', 
            'out for delivery', 
            'delivered', 
            'undelivered',
            'rto',
            'rto delivered',
            'cancelled', 
            'order cancelled', 
            'exception'
        ];

        if (validStatuses.includes(status)) {
            logger.debug(`📊 Using FShip status directly: "${fshipStatus}"`);
            return status;
        }
        
        // Legacy mapping for any edge cases
        const legacyMapping = {
            'shipped': 'in transit',
            'processing': 'booked',
            'rto_delivered': 'rto delivered',
            'rtodelivered': 'rto delivered'
        };

        const mappedStatus = legacyMapping[status];
        if (mappedStatus) {
            logger.debug(`📊 Legacy status mapping: "${fshipStatus}" → "${mappedStatus}"`);
            return mappedStatus;
        }
        
        logger.debug(`⚠️ Unknown FShip status: "${fshipStatus}", defaulting to "processing"`);
        return 'processing';
    }

    /**
     * Calculate shipment dimensions for Cross-Coin products
     * Fixed dimensions: 14cm × 3cm × 10cm, 70g per item
     * Items stack vertically (multiply height by quantity)
     */
    calculateShipmentDimensions(items) {
        const totalQuantity = items.reduce((sum, item) => sum + item.quantity, 0);
        
        return {
            shipment_Weight: totalQuantity * 0.07, // 70g per item in kg
            shipment_Length: 14, // Fixed length in cm
            shipment_Width: 3,   // Fixed width in cm  
            shipment_Height: 10 * totalQuantity // Stack items vertically
        };
    }

    /**
     * Test API connectivity and credentials
     */
    async testConnection() {
        await this.initialize();
        try {
            logger.debug('=== FShip Test Connection ===');
            const couriers = await this.getCourierList();
            logger.debug('Connection test successful. Available couriers:', couriers.length);
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

    /**
     * Check if order exists in FShip by order ID
     */
    async checkOrderExists(orderId) {
        await this.initialize();
        try {
            logger.debug('=== FShip Check Order Exists ===');
            logger.debug('Order ID:', orderId);

            // Try to get order details - if it exists, we'll get data back
            const payload = {
                orderId: orderId
            };

            const response = await this.axiosInstance.post('/api/getorderdetails', payload);
            
            if (response.data && response.data.data) {
                logger.debug('Order exists in FShip:', response.data.data);
                return {
                    exists: true,
                    data: response.data.data
                };
            }
            
            return { exists: false };
        } catch (error) {
            // If we get a 404 or "order not found" error, the order doesn't exist
            if (error.response?.status === 404 || 
                error.response?.data?.message?.toLowerCase().includes('not found') ||
                error.response?.data?.response?.toLowerCase().includes('not found')) {
                logger.debug('Order does not exist in FShip');
                return { exists: false };
            }
            
            // For other errors, throw instead of assuming order doesn't exist
            throw new Error(`FShip order check failed: ${error.message}`);
        }
    }

    /**
     * Find order in FShip by order ID from all orders - gets the latest/best match
     */
    async findOrderByIdFromAll(orderId) {
        await this.initialize();
        try {
            logger.debug('=== FShip Find Order by ID from All Orders ===');
            logger.debug('Looking for Order ID:', orderId);
            
            // Try direct order search using checkOrderExists method
            const existsResult = await this.checkOrderExists(orderId);
            if (existsResult.exists) {
                return {
                    exists: true,
                    data: existsResult.data,
                    totalFound: 1
                };
            }
            
            logger.debug(`Order ${orderId} not found in FShip`);
            return { exists: false };
            
        } catch (error) {
            console.error('Error finding order by ID:', error.message);
            return { exists: false, error: error.message };
        }
    }

}

module.exports = new FShipService();