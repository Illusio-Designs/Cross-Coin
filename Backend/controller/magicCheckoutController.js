const { Coupon } = require('../model/couponModel.js');
const { CouponUsage } = require('../model/couponUsageModel.js');
const { ShippingFee } = require('../model/shippingFeeModel.js');
const { Order } = require('../model/orderModel.js');
const { OrderItem } = require('../model/orderItemModel.js');
const { OrderStatusHistory } = require('../model/orderStatusHistoryModel.js');
const { Payment } = require('../model/paymentModel.js');
const { Product } = require('../model/productModel.js');
const { ProductVariation } = require('../model/productVariationModel.js');
const { ShippingAddress } = require('../model/shippingAddressModel.js');
const { User } = require('../model/userModel.js');
const { GuestUser } = require('../model/guestUserModel.js');
const { Op, Transaction } = require('sequelize');
const { sequelize } = require('../config/db.js');
const addressQualityService = require('../services/addressQualityService.js');
const fshipService = require('../services/fshipService.js');
const razorpayService = require('../services/razorpayService');
const { toSmallestUnit } = require('../utils/amountConverter');
const settingsHelper = require('../services/settingsHelper');
const { setImmediate } = require('timers');
const { sendFacebookEvent } = require('../integration/facebookPixel.js');

// Generate unique order number (same pattern as orderController)
const generateOrderNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `ORD-${year}${month}${day}-${random}`;
};

/**
 * RAZORPAY MAGIC CHECKOUT — HOW IT WORKS
 * ========================================
 *
 * 1. Frontend creates a Razorpay order via POST /api/payments/magic-checkout/create-order
 *    - MUST include line_items + line_items_total (in paise) to trigger Magic Checkout UI
 *    - Without line_items_total, Razorpay falls back to Standard Checkout
 *
 * 2. Frontend opens the modal with:
 *    - one_click_checkout: true  (NOT magic: true)
 *    - SDK: magic-checkout.js    (NOT checkout.js)
 *
 * 3. Razorpay's servers call YOUR APIs directly (not the frontend):
 *    - GET Promotions: POST /api/payments/magic-checkout/promotions
 *    - Apply Promotion: POST /api/payments/magic-checkout/apply-promotion
 *    - Shipping Info:   POST /api/payments/magic-checkout/shipping-info
 *    These must be publicly accessible (no auth) and configured in Razorpay Dashboard:
 *    Magic Checkout > Setup & Settings > Checkout Settings / Shipping Setup
 *
 * 4. On payment success, frontend verifies signature via POST /api/payments/magic-checkout/verify-payment
 */

// ─────────────────────────────────────────────────────────────────────────────
// GET PROMOTIONS
// Called by Razorpay's servers when checkout modal opens.
// Razorpay sends POST with: order_id (receipt), razorpay_order_id, contact, email
// Response must match Razorpay's expected schema: { promotions: [{ code, summary, description }] }
// ─────────────────────────────────────────────────────────────────────────────
module.exports.getPromotions = async (req, res) => {
    try {
        const { contact, email } = req.body;
        const currentDate = new Date();

        const activeCoupons = await Coupon.findAll({
            where: {
                status: 'active',
                startDate: { [Op.lte]: currentDate },
                endDate: { [Op.gte]: currentDate },
            }
        });

        const promotions = [];

        for (const coupon of activeCoupons) {
            // Skip if global usage limit exceeded
            if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) continue;

            // Razorpay schema: code, summary (short), description (long)
            const valueLabel = coupon.type === 'percentage'
                ? `${coupon.value}% off`
                : `₹${coupon.value} off`;

            const minLabel = coupon.minPurchase
                ? ` on orders above ₹${coupon.minPurchase}`
                : '';

            promotions.push({
                code: coupon.code,
                summary: `${valueLabel}${minLabel}`,
                description: coupon.description || `Use code ${coupon.code} to get ${valueLabel}${minLabel}`,
            });
        }

        res.json({ promotions });
    } catch (error) {
        console.error('Error fetching promotions:', error);
        res.status(500).json({ message: 'Failed to fetch promotions', error: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// APPLY PROMOTION
// Called by Razorpay's servers when customer applies a coupon code.
// Razorpay sends POST with: order_id, razorpay_order_id, contact, email, code
// Response must match Razorpay's schema:
//   { promotions: [{ reference_id, code, type, value, value_type, description }] }
// ─────────────────────────────────────────────────────────────────────────────
module.exports.applyPromotion = async (req, res) => {
    try {
        const { order_id, code, contact, email } = req.body;

        if (!code) {
            return res.status(400).json({ message: 'Promotion code is required' });
        }

        const currentDate = new Date();

        const coupon = await Coupon.findOne({ where: { code } });

        if (!coupon) {
            return res.status(404).json({ message: 'Invalid promotion code' });
        }

        if (coupon.status !== 'active') {
            return res.status(400).json({ message: 'Promotion is not active' });
        }

        if (currentDate < coupon.startDate || currentDate > coupon.endDate) {
            return res.status(400).json({ message: 'Promotion has expired or not yet started' });
        }

        if (coupon.usageLimit !== null && coupon.usageCount >= coupon.usageLimit) {
            return res.status(400).json({ message: 'Promotion usage limit has been reached' });
        }

        // Calculate discount value in paise
        let valueInPaise = 0;
        let valueType = 'fixed_amount';

        if (coupon.type === 'percentage') {
            // For percentage, Razorpay applies the value as-is in paise regardless of value_type
            // So we send the percentage number (e.g. 10 for 10%) — Razorpay handles the math
            valueInPaise = parseFloat(coupon.value) * 100; // e.g. 10% → 1000 paise representation
            valueType = 'percentage';
        } else {
            valueInPaise = toSmallestUnit(parseFloat(coupon.value), 'INR');
            valueType = 'fixed_amount';
        }

        // Razorpay expected response format for apply-promotion
        res.json({
            promotions: [{
                reference_id: `coupon_${coupon.id}`,
                code: coupon.code,
                type: 'coupon',
                value: valueInPaise,
                value_type: valueType,
                description: coupon.description || `${coupon.type === 'percentage' ? coupon.value + '%' : '₹' + coupon.value} off`,
            }]
        });
    } catch (error) {
        console.error('Error applying promotion:', error);
        res.status(500).json({ message: 'Failed to apply promotion', error: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// GET SHIPPING INFO
// Called by Razorpay's servers to check serviceability for customer addresses.
// Razorpay sends POST with: order_id, razorpay_order_id, email, contact, addresses[]
// Each address has: id, zipcode, state_code, country
// Response must match Razorpay's schema:
//   { addresses: [{ id, zipcode, country, shipping_methods: [...], cod, cod_fee }] }
// ─────────────────────────────────────────────────────────────────────────────
module.exports.getShippingInfo = async (req, res) => {
    try {
        const { order_id, addresses } = req.body;

        if (!addresses || !Array.isArray(addresses)) {
            return res.status(400).json({ message: 'addresses array is required' });
        }

        // Get shipping fees from DB once
        const shippingFees = await ShippingFee.findAll();
        const prepaidFee = parseFloat(shippingFees.find(f => f.orderType === 'prepaid')?.fee || 0);
        const codFeeAmount = parseFloat(shippingFees.find(f => f.orderType === 'cod')?.fee || 0);
        const sourcePincode = await settingsHelper.getSetting(1, 'DEFAULT_WAREHOUSE_PINCODE', '363641');

        const results = [];

        for (const address of addresses) {
            const zipcode = (address.zipcode || address.pincode || '').toString().trim();

            // Defaults — used if FShip is down or pincode is invalid
            let serviceable = true;
            let codAvailable = true;
            let estimatedDays = 5;
            let shippingFeeInPaise = toSmallestUnit(prepaidFee, 'INR');
            let codFeeInPaise = toSmallestUnit(codFeeAmount, 'INR');

            // Only call FShip if we have a valid 6-digit pincode
            if (/^\d{6}$/.test(zipcode)) {
                try {
                    const serviceabilityResult = await fshipService.checkServiceability(sourcePincode, zipcode);
                    const couriers = Array.isArray(serviceabilityResult) ? serviceabilityResult : [];

                    if (couriers.length > 0) {
                        serviceable = (couriers[0].delivery || '').toString().toLowerCase() === 'yes' || couriers[0].status === true;
                        estimatedDays = couriers[0].estimated_delivery_days || couriers[0].edd || couriers[0].tat || 5;

                        // FShip returns "cod": "Yes" / "No"
                        codAvailable = serviceable && couriers.some(c =>
                            (c.cod || '').toString().toLowerCase() === 'yes'
                        );

                        codFeeInPaise = codAvailable ? toSmallestUnit(codFeeAmount, 'INR') : 0;
                    } else {
                        // FShip returned empty — pincode not serviceable
                        serviceable = false;
                        codAvailable = false;
                        codFeeInPaise = 0;
                    }
                } catch (fshipErr) {
                    // FShip API down — fail open: allow both prepaid and COD
                    console.warn(`FShip serviceability check failed for ${zipcode}:`, fshipErr.message);
                    serviceable = true;
                    codAvailable = true;
                    codFeeInPaise = toSmallestUnit(codFeeAmount, 'INR');
                }
            }

            const shippingMethods = [];
            if (serviceable) {
                shippingMethods.push({
                    id: 'standard',
                    name: 'Standard Delivery',
                    description: `Delivered in ${estimatedDays}–7 business days`,
                    price: shippingFeeInPaise,
                    cod: codAvailable,
                });
            }

            results.push({
                id: address.id,
                zipcode,
                country: address.country || 'in',
                serviceable,
                cod: codAvailable,
                cod_fee: codFeeInPaise,
                shipping_methods: shippingMethods,
            });
        }

        res.json({ addresses: results });
    } catch (error) {
        console.error('Error fetching shipping info:', error);
        res.status(500).json({ message: 'Failed to fetch shipping info', error: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// CREATE ORDER
// Called by the frontend before opening the Magic Checkout modal.
// amount in rupees, line_items prices in paise, line_items_total in paise.
// line_items_total is MANDATORY — without it Razorpay shows Standard Checkout.
// ─────────────────────────────────────────────────────────────────────────────
module.exports.createOrder = async (req, res) => {
    try {
        const {
            amount,
            currency = 'INR',
            customer_id,
            line_items = [],
            line_items_total = null,
            notes = {}
        } = req.body;

        if (!amount || amount <= 0) {
            return res.status(400).json({ success: false, message: 'Valid amount is required' });
        }

        // line_items_total must be in paise and is MANDATORY for Magic Checkout UI
        const computedLineItemsTotal = line_items_total ||
            line_items.reduce((sum, item) => sum + ((item.offer_price || item.price || 0) * (item.quantity || 1)), 0);

        const order = await razorpayService.createOrder({
            amount,                                          // rupees — service converts to paise
            currency,
            receipt: `order_${Date.now()}_${customer_id || 'guest'}`,
            line_items: line_items.length > 0 ? line_items : null,
            line_items_total: computedLineItemsTotal,        // paise
            notes: {
                customer_id: customer_id || 'guest',
                checkout_type: 'magic_checkout',
                ...notes
            },
            partial_payment: false,
            brandId: 1
        });

        console.log('✅ Magic Checkout order created:', order.id, '₹', amount);

        res.json({
            success: true,
            order_id: order.id,
            amount: order.amount,       // paise — returned to frontend for Razorpay options
            currency: order.currency,
            receipt: order.receipt,
            status: order.status
        });
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ success: false, message: 'Failed to create order', error: error.message });
    }
};

// ─────────────────────────────────────────────────────────────────────────────
// VERIFY PAYMENT + CREATE ORDER
// Called by the frontend after Magic Checkout payment success.
// 1. Verifies Razorpay signature
// 2. Fetches the Razorpay order to get customer address & payment details
// 3. Creates the DB order (authenticated user or guest)
// 4. Creates payment record marked as paid
// ─────────────────────────────────────────────────────────────────────────────
module.exports.verifyPayment = async (req, res) => {
    const transaction = await sequelize.transaction({
        isolationLevel: Transaction.ISOLATION_LEVELS.READ_COMMITTED
    });

    try {
        const {
            razorpay_order_id,
            razorpay_payment_id,
            razorpay_signature,
            // Cart items passed from frontend so we can create order items
            cart_items = [],
            // Optional: authenticated user id
            customer_id = null,
        } = req.body;

        if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
            await transaction.rollback();
            return res.status(400).json({ success: false, message: 'order_id, payment_id, and signature are required' });
        }

        // ── Step 1: Verify signature ──────────────────────────────────────
        const isValid = await razorpayService.verifySignature(
            razorpay_order_id, razorpay_payment_id, razorpay_signature, 1
        );

        if (!isValid) {
            await transaction.rollback();
            return res.status(400).json({ success: false, message: 'Invalid payment signature' });
        }

        // ── Step 2: Fetch Razorpay order for customer/address data ────────
        let rzpOrder = null;
        try {
            rzpOrder = await razorpayService.getOrder(razorpay_order_id, 1);
        } catch (e) {
            console.warn('Could not fetch Razorpay order details:', e.message);
        }

        // Extract customer info from Razorpay order (Magic Checkout populates these)
        const rzpCustomer = rzpOrder?.customer_details || {};
        const rzpAddress = rzpOrder?.customer_details?.shipping_address || rzpOrder?.shipping_address || {};
        const amountPaidRupees = rzpOrder ? rzpOrder.amount_paid / 100 : 0;
        const amountPaidPaise = rzpOrder ? rzpOrder.amount_paid : 0;

        // Determine payment type from Razorpay payment method
        let rzpPayment = null;
        try {
            rzpPayment = await razorpayService.getPayment(razorpay_payment_id, 1);
        } catch (e) {
            console.warn('Could not fetch Razorpay payment details:', e.message);
        }
        const paymentMethod = rzpPayment?.method || 'razorpay';
        const isCOD = paymentMethod === 'cod';

        // Map Razorpay method to internal payment_type
        const paymentTypeMap = {
            upi: 'upi',
            card: 'prepaid',
            netbanking: 'prepaid',
            wallet: 'prepaid',
            emi: 'prepaid',
            cod: 'cod',
        };
        const paymentType = isCOD ? 'cod' : (paymentTypeMap[paymentMethod] || 'upi');

        // ── Step 3: Validate & price cart items ───────────────────────────
        if (!cart_items.length) {
            await transaction.rollback();
            return res.status(400).json({ success: false, message: 'cart_items are required to create order' });
        }

        let totalAmount = 0;
        const validatedItems = [];

        for (const item of cart_items) {
            const product = await Product.findByPk(item.product_id, { transaction });
            if (!product) {
                await transaction.rollback();
                return res.status(404).json({ success: false, message: `Product ${item.product_id} not found` });
            }

            let variation = null;
            let price = 0;

            if (item.variation_id) {
                variation = await ProductVariation.findByPk(item.variation_id, { transaction });
                price = variation ? parseFloat(variation.price) : parseFloat(product.price || 0);
            } else {
                const firstVar = await ProductVariation.findOne({ where: { productId: product.id }, transaction });
                variation = firstVar;
                price = firstVar ? parseFloat(firstVar.price) : parseFloat(product.price || 0);
            }

            const qty = item.quantity || 1;
            totalAmount += price * qty;
            validatedItems.push({ product, variation, quantity: qty, price, itemTotal: price * qty });
        }

        // ── Step 4: Shipping fee ──────────────────────────────────────────
        const shippingFees = await ShippingFee.findAll();
        const shippingFeeRow = shippingFees.find(f => f.orderType === (isCOD ? 'cod' : 'prepaid'));
        const shippingFee = parseFloat(shippingFeeRow?.fee || 0);

        const finalAmount = totalAmount + shippingFee;
        const orderNumber = generateOrderNumber();

        // ── Step 5: Create order (authenticated or guest) ─────────────────
        let dbOrder = null;
        let userId = null;
        let guestUserId = null;

        // Try to find authenticated user
        if (customer_id) {
            const user = await User.findByPk(customer_id, { transaction });
            if (user) userId = user.id;
        }

        // Also check if user is authenticated via JWT (req.user set by middleware)
        if (!userId && req.user?.id) {
            userId = req.user.id;
        }

        if (userId) {
            // ── Authenticated order ───────────────────────────────────────
            // Find or create shipping address from Razorpay data
            let shippingAddressId = null;

            if (rzpAddress.zipcode || rzpAddress.line1) {
                const savedAddr = await ShippingAddress.create({
                    user_id: userId,
                    full_name: rzpAddress.name || rzpCustomer.name || '',
                    address: [rzpAddress.line1, rzpAddress.line2].filter(Boolean).join(', '),
                    city: rzpAddress.city || '',
                    state: rzpAddress.state || '',
                    pincode: rzpAddress.zipcode || '',
                    phone: rzpAddress.contact || rzpCustomer.contact || '',
                    is_default: false,
                }, { transaction });
                shippingAddressId = savedAddr.id;
            }

            dbOrder = await Order.create({
                user_id: userId,
                order_number: orderNumber,
                total_amount: totalAmount,
                discount_amount: 0,
                shipping_fee: shippingFee,
                final_amount: finalAmount,
                payment_type: paymentType,
                brand_id: 1,
            }, { transaction });

        } else {
            // ── Guest order ───────────────────────────────────────────────
            const guestEmail = rzpCustomer.email || `guest_${Date.now()}@magic.checkout`;
            const guestPhone = rzpCustomer.contact || rzpAddress.contact || '';
            const guestName = rzpCustomer.name || rzpAddress.name || 'Guest';
            const nameParts = guestName.trim().split(/\s+/);

            let guestUser = await GuestUser.findOne({ where: { email: guestEmail.toLowerCase() }, transaction });
            if (!guestUser) {
                guestUser = await GuestUser.create({
                    email: guestEmail.toLowerCase(),
                    firstName: nameParts[0] || 'Guest',
                    lastName: nameParts.slice(1).join(' ') || '',
                    phone: guestPhone,
                    status: 'active',
                }, { transaction });
            }
            guestUserId = guestUser.id;

            // Create shipping address for guest
            const guestAddr = await ShippingAddress.create({
                guest_user_id: guestUserId,
                full_name: guestName,
                address: [rzpAddress.line1, rzpAddress.line2].filter(Boolean).join(', ') || 'N/A',
                city: rzpAddress.city || '',
                state: rzpAddress.state || '',
                pincode: rzpAddress.zipcode || '',
                phone: guestPhone,
                is_default: true,
            }, { transaction });

            dbOrder = await Order.create({
                guest_user_id: guestUserId,
                order_number: orderNumber,
                total_amount: totalAmount,
                discount_amount: 0,
                shipping_fee: shippingFee,
                final_amount: finalAmount,
                payment_type: paymentType,
                brand_id: 1,
            }, { transaction });
        }

        // ── Step 6: Create order items ────────────────────────────────────
        for (const item of validatedItems) {
            await OrderItem.create({
                order_id: dbOrder.id,
                product_id: item.product.id,
                variation_id: item.variation?.id || null,
                quantity: item.quantity,
                price: item.price,
                discount: 0,
                subtotal: item.itemTotal,
                status: 'pending',
            }, { transaction });
        }

        // ── Step 7: Order status history ──────────────────────────────────
        await OrderStatusHistory.create({
            order_id: dbOrder.id,
            status: 'processing',
            notes: 'Order created via Magic Checkout',
            created_by: 'system',
        }, { transaction });

        // ── Step 8: Payment record ────────────────────────────────────────
        await Payment.create({
            order_id: dbOrder.id,
            user_id: userId || null,
            guest_user_id: guestUserId || null,
            payment_type: 'razorpay',
            amount_paid: amountPaidPaise || toSmallestUnit(finalAmount, 'INR'),
            status: 'successful',
            transaction_id: razorpay_payment_id,
            razorpay_order_id,
            razorpay_signature,
            brand_id: 1,
        }, { transaction });

        await transaction.commit();

        console.log(`✅ Magic Checkout order created: ${orderNumber} (DB id: ${dbOrder.id})`);

        // ── Step 9: FShip sync (background, non-blocking) ─────────────────
        setImmediate(async () => {
            try {
                // Resolve shipping address for fship
                const addr = await ShippingAddress.findByPk(dbOrder.shipping_address_id);
                if (!addr) {
                    console.error(`FShip sync skipped: no shipping address for order ${orderNumber}`);
                    return;
                }

                // Resolve customer name/email/phone
                let customerName = addr.full_name || 'Guest';
                let customerEmail = '';
                let customerPhone = addr.phone || '';

                if (userId) {
                    const u = await User.findByPk(userId);
                    if (u) { customerName = u.username || u.name || customerName; customerEmail = u.email || ''; }
                } else if (guestUserId) {
                    const g = await GuestUser.findByPk(guestUserId);
                    if (g) { customerName = `${g.firstName} ${g.lastName}`.trim() || customerName; customerEmail = g.email || ''; customerPhone = g.phone || customerPhone; }
                }

                const warehouseId = parseInt(await settingsHelper.getSetting(1, 'FSHIP_DEFAULT_WAREHOUSE_ID', '12191'));
                const totalQty = validatedItems.reduce((s, i) => s + i.quantity, 0);

                const fshipOrderData = {
                    customer_Name: customerName,
                    customer_Mobile: customerPhone,
                    customer_Emailid: customerEmail,
                    customer_Address: addr.address || 'N/A',
                    landMark: '',
                    customer_Address_Type: 'Home',
                    customer_PinCode: String(addr.pincode || ''),
                    customer_City: addr.city || 'Mumbai',
                    orderId: orderNumber,
                    invoice_Number: orderNumber,
                    payment_Mode: isCOD ? 1 : 2, // 1=COD, 2=PREPAID
                    express_Type: 'surface',
                    is_Ndd: 0,
                    order_Amount: totalAmount,
                    tax_Amount: 0,
                    extra_Charges: 0,
                    total_Amount: finalAmount,
                    shipment_Weight: totalQty * 0.07,
                    shipment_Length: 14,
                    shipment_Width: 3,
                    shipment_Height: 10 * totalQty,
                    pick_Address_ID: warehouseId,
                    return_Address_ID: warehouseId,
                    products: validatedItems.map(item => ({
                        productName: item.product.name,
                        sku: item.variation?.sku || `PROD-${item.product.id}`,
                        quantity: item.quantity,
                        unitPrice: item.price,
                        productCategory: 'Socks',
                        hsnCode: '6115',
                        taxRate: 0,
                        productDiscount: 0,
                    })),
                };

                console.log(`🔄 Magic Checkout: syncing order ${orderNumber} to FShip`);
                const fshipResponse = await fshipService.createOrUpdateForwardOrder(fshipOrderData);

                if (fshipResponse.success) {
                    await dbOrder.update({
                        fship_order_id: fshipResponse.orderId,
                        fship_waybill: fshipResponse.waybill,
                        fship_route_code: fshipResponse.routeCode || '',
                        fship_label_url: fshipResponse.labelUrl || null,
                        tracking_number: fshipResponse.waybill,
                        status: 'processing',
                    });
                    console.log(`✅ FShip order created for ${orderNumber}: waybill ${fshipResponse.waybill}`);

                    try {
                        await fshipService.registerPickup([fshipResponse.waybill]);
                        console.log(`📦 FShip pickup registered: ${fshipResponse.waybill}`);
                    } catch (pickupErr) {
                        console.error(`❌ FShip pickup registration failed: ${pickupErr.message}`);
                    }
                } else {
                    console.error(`❌ FShip sync failed for ${orderNumber}:`, fshipResponse);
                }
            } catch (fshipErr) {
                console.error(`❌ FShip background sync error for ${orderNumber}:`, fshipErr.message);
            }
        });

        res.json({
            success: true,
            message: 'Payment verified and order created',
            order_number: orderNumber,
            order_id: dbOrder.id,
            razorpay_order_id,
            razorpay_payment_id,
        });

        // ── Step 10: Facebook Purchase event (background, non-blocking) ───
        setImmediate(async () => {
            try {
                await sendFacebookEvent('Purchase', {
                    brand_id: 1,
                    order_number: orderNumber,
                    total_amount: finalAmount,
                    final_amount: finalAmount,
                    currency: 'INR',
                    ip_address: req.ip || null,
                    user_agent: req.headers['user-agent'] || null,
                    items: cart_items.map(i => ({ product_id: i.product_id, quantity: i.quantity || 1 })),
                });
            } catch (fbErr) {
                console.error('Facebook Purchase event error (magic checkout):', fbErr.message);
            }
        });

    } catch (error) {
        await transaction.rollback();
        console.error('Error in verifyPayment:', error);
        res.status(500).json({ success: false, message: 'Failed to verify payment and create order', error: error.message });
    }
};
