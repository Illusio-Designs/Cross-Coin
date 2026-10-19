const { Coupon, CouponUsage, Cart, CartItem, Product, ProductVariation } = require('../model/associations.js');
const { Op } = require('sequelize');
const { sequelize } = require('../config/db.js');
const { logger } = require('../config/logging.js');
const couponAdmin = require('../services/couponAdminService.js');
const { evaluateCoupon } = require('../services/couponRulesService.js');

const fail = (res, error, message) => {
    logger.error(`${message}:`, error);
    return res.status(500).json({ success: false, message, error: error.message });
};
const brandIdParam = (v) => { const n = Number(v); return Number.isInteger(n) && n > 0 ? n : null; };
const daysParam = (v) => ([7, 30, 90].includes(Number(v)) ? Number(v) : 30);

// Admin: one coupon with its stores and the names of its categories/products.
async function couponDetail(coupon) {
    const restricted = (await couponAdmin.brandIdsFor([coupon.id])).get(coupon.id) || [];
    return { ...coupon.toJSON(), brandIds: restricted, state: couponAdmin.statusOf(coupon) };
}

// Create a new coupon
module.exports.createCoupon = async (req, res) => {
    try {
        const { data, brandIds, error } = await couponAdmin.normaliseInput(req.body);
        if (error) return res.status(400).json({ success: false, message: error });
        if (await Coupon.findOne({ where: { code: data.code } })) {
            return res.status(400).json({ success: false, message: `There is already a coupon called ${data.code}.` });
        }
        const coupon = await sequelize.transaction(async (t) => {
            const c = await Coupon.create(data, { transaction: t });
            await couponAdmin.setCouponBrands(c.id, brandIds || [], t);
            return c;
        });
        res.status(201).json({ success: true, message: 'Coupon created', coupon: await couponDetail(coupon) });
    } catch (error) {
        fail(res, error, 'Failed to create coupon');
    }
};

// Admin list — server-side search / status tab / store / paging, with stats for
// the period (used, discount given, sales with it) and which automations use it.
// GET /api/coupons?tab=live|scheduled|off|ended|all&search=&brandId=&page=&limit=&days=7|30|90
module.exports.getAllCoupons = async (req, res) => {
    try {
        const tab = ['live', 'scheduled', 'off', 'ended', 'all'].includes(req.query.tab) ? req.query.tab : 'all';
        const page = Math.max(1, parseInt(req.query.page, 10) || 1);
        const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 25));
        const result = await couponAdmin.listCoupons({
            tab,
            search: String(req.query.search || '').trim().slice(0, 50),
            brandId: brandIdParam(req.query.brandId),
            page, limit,
            days: daysParam(req.query.days),
        });
        res.status(200).json({ success: true, ...result });
    } catch (error) {
        fail(res, error, 'Failed to fetch coupons');
    }
};

// GET /api/coupons/admin/summary?brandId=&days=30
module.exports.getCouponSummary = async (req, res) => {
    try {
        const summary = await couponAdmin.summary({ brandId: brandIdParam(req.query.brandId), days: daysParam(req.query.days) });
        res.status(200).json({ success: true, summary });
    } catch (error) {
        fail(res, error, 'Failed to load coupon summary');
    }
};

// GET /api/coupons/admin/dependencies — automations whose coupon would fail.
module.exports.getCouponDependencies = async (req, res) => {
    try {
        res.status(200).json({ success: true, ...(await couponAdmin.dependencies()) });
    } catch (error) {
        fail(res, error, 'Failed to check coupon automations');
    }
};

// GET /api/coupons/admin/picker?kind=category|product&search=&ids=1,2
module.exports.getCouponPicker = async (req, res) => {
    try {
        const kind = req.query.kind === 'category' ? 'category' : 'product';
        const items = await couponAdmin.picker({ kind, search: req.query.search, ids: req.query.ids });
        res.status(200).json({ success: true, items });
    } catch (error) {
        fail(res, error, 'Failed to search');
    }
};

// POST /api/coupons/:id/switch-on { brandId?, owner?, allBrands? } (admin)
module.exports.switchOnCoupon = async (req, res) => {
    try {
        const b = req.body || {};
        const r = await couponAdmin.switchOn(req.params.id, { brandId: b.brandId, owner: !!b.owner, allBrands: !!b.allBrands });
        if (r.status !== 200) return res.status(r.status).json({ success: false, message: r.message });
        res.status(200).json({ success: true, message: `${r.coupon.code} is on`, coupon: await couponDetail(r.coupon) });
    } catch (error) {
        fail(res, error, 'Failed to switch the coupon on');
    }
};

// Get a single coupon by ID
module.exports.getCouponById = async (req, res) => {
    try {
        const coupon = await Coupon.findByPk(req.params.id);
        if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' });
        res.status(200).json({ success: true, coupon: await couponDetail(coupon) });
    } catch (error) {
        fail(res, error, 'Failed to fetch coupon');
    }
};


// Validate a coupon (works for both authenticated and guest users)
module.exports.validateCoupon = async (req, res) => {
    try {
        const { code, cartTotal, paymentMode, cartItems } = req.body;
        const userId = req.user?.id; // Optional - works for guests too

        if (!code) {
            return res.status(400).json({ success: false, message: 'Coupon code is required' });
        }
        if (!cartTotal || cartTotal <= 0) {
            return res.status(400).json({ success: false, message: 'Cart total is required' });
        }

        const coupon = await Coupon.findOne({ where: { code: code.toUpperCase() } });

        // Signed-in customers: work from the server cart (prices + items);
        // guests: the storefront's cart total and lines (re-checked at order time).
        let subtotal = parseFloat(cartTotal);
        let items = cartItems;
        if (userId) {
            const cart = await Cart.findOne({
                where: { user_id: userId, status: 'active' },
                include: [{
                    model: CartItem,
                    as: 'CartItems',
                    include: [
                        { model: Product, attributes: ['id', 'name', 'price'] },
                        { model: ProductVariation, attributes: ['id', 'price'] }
                    ]
                }]
            });
            if (cart && cart.CartItems && cart.CartItems.length > 0) {
                items = cart.CartItems.map((item) => ({
                    productId: item.Product?.id ?? item.product_id,
                    quantity: item.quantity,
                    price: item.ProductVariation ? parseFloat(item.ProductVariation.price || item.price) : parseFloat(item.price),
                }));
                subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0);
            }
        }

        const r = await evaluateCoupon({
            coupon,
            items,
            subtotal,
            userId,
            guestEmail: req.body.email || req.body.guest_email,
            paymentType: paymentMode,
            brandId: req.brandId,
        });
        if (!r.ok) return res.status(r.status).json({ success: false, message: r.message });

        const finalAmount = Math.max(0, subtotal - r.discount);
        res.status(200).json({
            success: true,
            message: 'Coupon is valid and can be applied!',
            discountAmount: r.discount.toFixed(2),
            finalAmount: finalAmount.toFixed(2),
            subtotal: subtotal.toFixed(2),
            coupon: {
                id: coupon.id,
                code: coupon.code,
                type: coupon.type,
                value: coupon.value,
                description: coupon.description,
                paymentModeRestriction: coupon.paymentModeRestriction,
                firstOrderOnly: coupon.firstOrderOnly
            }
        });
    } catch (error) {
        fail(res, error, 'Failed to validate coupon');
    }
};


// Update a coupon (partial: fields not sent keep their value)
module.exports.updateCoupon = async (req, res) => {
    try {
        const coupon = await Coupon.findByPk(req.params.id);
        if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' });
        const { data, brandIds, error } = await couponAdmin.normaliseInput(req.body, coupon.toJSON());
        if (error) return res.status(400).json({ success: false, message: error });
        if (data.code !== coupon.code && await Coupon.findOne({ where: { code: data.code, id: { [Op.ne]: coupon.id } } })) {
            return res.status(400).json({ success: false, message: `There is already a coupon called ${data.code}.` });
        }
        await sequelize.transaction(async (t) => {
            await coupon.update(data, { transaction: t });
            if (brandIds) await couponAdmin.setCouponBrands(coupon.id, brandIds, t);
        });
        res.status(200).json({ success: true, message: 'Coupon saved', coupon: await couponDetail(coupon) });
    } catch (error) {
        fail(res, error, 'Failed to update coupon');
    }
};

// Delete a coupon — only one that was never used on an order (deleting would
// wipe the coupon from those orders and from the stats). Switch it off instead.
module.exports.deleteCoupon = async (req, res) => {
    try {
        const coupon = await Coupon.findByPk(req.params.id);
        if (!coupon) return res.status(404).json({ success: false, message: 'Coupon not found' });
        const { Order } = require('../model/associations.js');
        const [usages, orders] = await Promise.all([
            CouponUsage.count({ where: { couponId: coupon.id } }),
            Order.count({ where: { coupon_id: coupon.id } }),
        ]);
        const used = Math.max(usages, orders);
        if (used > 0) {
            return res.status(409).json({
                success: false,
                message: `${coupon.code} was used on ${used} order${used === 1 ? '' : 's'}, so it can't be deleted. Switch it off instead.`,
            });
        }
        await sequelize.transaction(async (t) => {
            await couponAdmin.setCouponBrands(coupon.id, [], t);
            await coupon.destroy({ transaction: t });
        });
        res.status(200).json({ success: true, message: 'Coupon deleted' });
    } catch (error) {
        fail(res, error, 'Failed to delete coupon');
    }
};


// Get all active public coupons
module.exports.getPublicCoupons = async (req, res) => {
    try {
        // validateCoupon (the apply path) matches by code and then checks the
        // coupon's store list (coupon_brands; no rows = every store), so the
        // offers dropdown shows exactly the codes that work on this store.
        const where = {
            status: 'active',
            startDate: { [Op.lte]: new Date() },
            endDate: { [Op.gte]: new Date() }
        };

        const [all, blocked] = await Promise.all([
            Coupon.findAll({
                where,
                attributes: [
                    'id', 'code', 'description', 'type', 'value', 'minPurchase', 'maxDiscount', 'endDate',
                    'paymentModeRestriction', 'firstOrderOnly', 'tieredDiscounts', 'quantityBasedDiscounts',
                    'usageLimit', 'usageCount'
                ],
                order: [['createdAt', 'DESC']]
            }),
            couponAdmin.couponIdsBlockedForBrand(req.brandId),
        ]);
        // Used-up codes fail at checkout — leave them out of the offers list.
        const coupons = all
            .filter((c) => !blocked.has(c.id) && !(c.usageLimit && c.usageCount >= c.usageLimit))
            .map((c) => { const j = c.toJSON(); delete j.usageLimit; delete j.usageCount; return j; });

        res.status(200).json({
            success: true,
            count: coupons.length,
            coupons
        });
    } catch (error) {
        logger.error('Error fetching public coupons:', error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch coupons',
            error: error.message
        });
    }
};
