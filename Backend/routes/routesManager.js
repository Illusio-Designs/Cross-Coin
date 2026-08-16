const express = require('express');
const router = express.Router();
const { optionalBrand } = require('../middleware/brandMiddleware.js');

// ── Core resources ────────────────────────────────────────────────────────
router.use('/users',              optionalBrand, require('./userRoutes.js'));
router.use('/products',           optionalBrand, require('./productRoutes.js'));
router.use('/categories',         optionalBrand, require('./categoryRoutes.js'));
router.use('/orders',             optionalBrand, require('./orderRoutes.js'));
router.use('/payments',           optionalBrand, require('./paymentRoutes.js'));
router.use('/cart',               optionalBrand, require('./cartRoutes.js'));
router.use('/wishlist',           optionalBrand, require('./wishlistRoutes.js'));
router.use('/shipping-addresses', optionalBrand, require('./shippingAddressRoutes.js'));
router.use('/shipping-fees',      optionalBrand, require('./shippingFeeRoutes.js'));
router.use('/coupons',            optionalBrand, require('./couponRoutes.js'));
router.use('/reviews',            optionalBrand, require('./reviewRoutes.js'));
router.use('/attributes',         optionalBrand, require('./attributeRoutes.js'));
router.use('/sliders',            optionalBrand, require('./sliderRoutes.js'));

// ── Content ───────────────────────────────────────────────────────────────
router.use('/blogs',              optionalBrand, require('./blogRoutes.js'));
router.use('/policies',           optionalBrand, require('./policyRoutes.js'));
router.use('/seo',                optionalBrand, require('./seoRoutes.js'));
router.use('/lookbooks',          optionalBrand, require('./lookbookRoutes.js'));

// ── User features ─────────────────────────────────────────────────────────
router.use('/loyalty',            optionalBrand, require('./loyaltyRoutes.js'));
router.use('/notifications',      require('./notificationRoutes.js'));
router.use('/utm',                require('./utmRoutes.js'));
router.use('/leads',              require('./leadRoutes.js'));

// ── Auth (OTP) ────────────────────────────────────────────────────────────
router.use('/auth',               optionalBrand, require('./checkoutRoutes.js'));

// ── Checkout (payment-first flow) ─────────────────────────────────────────
router.use('/checkout',           optionalBrand, require('./checkoutRoutes.js'));

// ── Razorpay Magic (one-click) Checkout — test surface ────────────────────
router.use('/magic',              optionalBrand, require('./magicRoutes.js'));

// ── WhatsApp ──────────────────────────────────────────────────────────────
router.use('/whatsapp',           require('./whatsappRoutes.js'));

// ── Admin ─────────────────────────────────────────────────────────────────
router.use('/admin/loyalty',      optionalBrand, require('./adminLoyaltyRoutes.js'));
router.use('/admin/lookbooks',    optionalBrand, require('./adminLookbookRoutes.js'));
router.use('/admin',              optionalBrand, require('./brandSettingsRoutes.js'));
router.use('/admin',              require('./brandRoutes.js'));
router.use('/admin',              require('./brandAssignmentRoutes.js'));
router.use('/dashboard',          optionalBrand, require('./dashboardRoutes.js'));
router.use('/ads-report',         require('./adsReportRoutes.js'));
router.use('/reports',            require('./reportsRoutes.js'));
router.use('/order-status-history', optionalBrand, require('./orderStatusHistoryRoutes.js'));

// ── Integrations ──────────────────────────────────────────────────────────
router.use('/facebook-pixel',     require('../integration/facebookPixel.js'));
router.use('/facebook-catalog',   require('../integration/facebookCatalog.js'));
router.use('/analytics',          require('../integration/dashboardAnalytics.js'));

// ── FAQs (admin + public) ─────────────────────────────────────────────────
router.use('/', require('./faqRoutes.js'));

// ── SEO admin (health summary, bulk product SEO editor) ───────────────────
router.use('/', require('./seoAdminRoutes.js'));

// ── Public tracking config ────────────────────────────────────────────────
// Returns the non-sensitive analytics IDs configured in Brand Settings so the
// public site's <Analytics> component can mount gtag / fbq / Clarity with
// the real IDs (instead of a build-time env var that has to be redeployed
// whenever the admin updates them in the dashboard).
router.get('/public/tracking-config', optionalBrand, async (req, res) => {
  try {
    // Resolve the brand from the X-Brand-Name header (optionalBrand sets
    // req.brandId), falling back to a ?brandId query and finally brand 1
    // (Crosscoin). Previously this only read ?brandId and defaulted to 1, so
    // every brand received Crosscoin's tracking IDs instead of their own.
    const brandId = req.brandId || parseInt(req.query.brandId, 10) || 1;
    const settingsHelper = require('../services/settingsHelper');
    const [ga, fb, clarity, gtm, googleAds, googleAdsLabel, googleAdsLabels] = await Promise.all([
      settingsHelper.getSetting(brandId, 'GA_MEASUREMENT_ID'),
      settingsHelper.getSetting(brandId, 'FB_PIXEL_ID'),
      settingsHelper.getSetting(brandId, 'CLARITY_ID'),
      // Google Tag Manager container (GTM-…). Defaults to Crosscoin's container
      // so it's live immediately; override per-brand via a GTM_ID setting
      // (Brand Settings → Analytics).
      settingsHelper.getSetting(brandId, 'GTM_ID', 'GTM-5JDP8MLF'),
      // Google Ads conversion tag (AW-…). Defaults to Crosscoin's account so
      // the tag is live immediately; override per-brand via a GOOGLE_ADS_ID
      // setting (Brand Settings → Analytics), exactly like the FB pixel above.
      settingsHelper.getSetting(brandId, 'GOOGLE_ADS_ID', 'AW-18359689810'),
      // Legacy single purchase label (the part after the slash: AW-…/THIS).
      settingsHelper.getSetting(brandId, 'GOOGLE_ADS_CONVERSION_LABEL'),
      // Per-event conversion labels as a JSON object, e.g.
      //   {"purchase":"AbC…","add_to_cart":"DeF…","begin_checkout":"GhI…"}
      // Each event is a separate Ads conversion action with its own label.
      // No default — add whichever events you want to track in Brand Settings.
      settingsHelper.getSetting(brandId, 'GOOGLE_ADS_CONVERSION_LABELS'),
    ]);

    // Parse the label map (stored as a JSON string). Fold the legacy single
    // purchase label in as { purchase } so older config keeps working.
    let adsLabels = {};
    if (googleAdsLabels) {
      try {
        const parsed = typeof googleAdsLabels === 'string' ? JSON.parse(googleAdsLabels) : googleAdsLabels;
        if (parsed && typeof parsed === 'object') adsLabels = parsed;
      } catch { /* malformed JSON → ignore, fall back to the single label */ }
    }
    if (googleAdsLabel && !adsLabels.purchase) adsLabels.purchase = googleAdsLabel;

    // Auto-managed labels — read one simple setting per event so admins don't
    // have to hand-write a JSON map. e.g. GOOGLE_ADS_LABEL_PURCHASE = AbC-D_efGh
    // These take precedence over the JSON map above.
    const ADS_EVENTS = ['view_item', 'add_to_cart', 'begin_checkout', 'add_shipping_info', 'add_payment_info', 'purchase'];
    const perEventLabels = await Promise.all(
      ADS_EVENTS.map((e) => settingsHelper.getSetting(brandId, 'GOOGLE_ADS_LABEL_' + e.toUpperCase()))
    );
    ADS_EVENTS.forEach((e, i) => { if (perEventLabels[i]) adsLabels[e] = perEventLabels[i]; });

    // Cache at the CDN/edge for 5 min — these IDs change rarely.
    res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
    return res.json({
      success: true,
      ga_measurement_id: ga || null,
      fb_pixel_id: fb || null,
      clarity_id: clarity || null,
      gtm_id: gtm || null,
      google_ads_id: googleAds || null,
      google_ads_conversion_label: googleAdsLabel || null,
      google_ads_labels: adsLabels,
    });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ── Serviceability ────────────────────────────────────────────────────────
router.get('/serviceability/:pincode', optionalBrand, async (req, res) => {
    // Never let a CDN/browser cache a serviceability result — it's per-PIN,
    // can change, and a stale cache masks fresh backend behaviour entirely.
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
    try {
        const { pincode } = req.params;
        if (!/^\d{6}$/.test(pincode)) return res.status(400).json({ success: false, message: 'Invalid pincode' });
        const settingsHelper = require('../services/settingsHelper');
        const brandId = req.brandId || 1;

        // Use the brand's ACTUAL shipping provider (iThink or FShip) so the cart
        // check matches what will really happen at booking time. Previously this
        // was hardcoded to FShip even for iThink brands, so the check never
        // reflected reality.
        const factory = require('../services/shippingProviderFactory');
        const providerName = await factory.getProviderName(brandId); // always iThink
        const provider = await factory.getShippingProvider(brandId);

        const src = await settingsHelper.getSetting(
            brandId,
            providerName === 'ithink' ? 'ITHINK_WAREHOUSE_PINCODE' : 'FSHIP_WAREHOUSE_PINCODE',
            await settingsHelper.getSetting(brandId, 'DEFAULT_WAREHOUSE_PINCODE', '363641')
        );

        const raw = await provider.checkServiceability(src, pincode);

        // Normalise + decide via the shared, unit-tested helper (handles the
        // iThink vs FShip response shapes; never falsely blocks a real customer).
        const { parseServiceability } = require('../utils/serviceability.js');
        const decision = parseServiceability(raw);

        // DISPLAY-ONLY serviceability: we never block delivery or COD on it — the
        // store always accepts orders (COD included; booking is the real gate).
        // The check is used purely to show the customer a delivery estimate and
        // their area (city/state), which the iThink pincode reply provides.
        const lastRaw = provider && provider._lastPincodeRaw;
        const resp = lastRaw && lastRaw.response;
        const area = resp && typeof resp === 'object' && !Array.isArray(resp) ? resp : {};
        return res.json({
            success: true,
            serviceable: true,          // display-only — never blocks checkout
            cod_allowed: true,          // always take COD orders
            cod_available: true,
            estimated_delivery_days: decision.estimated_delivery_days || 5,
            city: area.city_name || null,
            state: area.state_name || null,
        });
    } catch (e) {
        // On ANY failure, never block checkout — report serviceable and let the
        // booking (worker) be the final gate.
        return res.json({ success: true, serviceable: true, cod_allowed: true, error: 'Serviceability check unavailable' });
    }
});

// ── Last iThink booking attempt (credential-free diagnostics) ───────────────
// GET /api/ithink-last-booking  (send X-Brand-Name so it reads THAT brand's
// provider instance). Shows the EXACT payload we last sent to iThink's
// /order/add.json (auth redacted), iThink's raw reply, the resolved
// pickup_address_id, and the field issues we detected. Use it right after a
// failed Sync to see WHY iThink said "Some error occured".
router.get('/ithink-last-booking', optionalBrand, async (req, res) => {
    try {
        const brandId = Number(req.query.brand_id) || req.brandId || 1;
        const factory = require('../services/shippingProviderFactory');
        const provider = await factory.getShippingProvider(brandId).catch(() => null);
        const raw = provider && provider._lastBookingRaw;
        if (!raw) {
            return res.json({
                success: true,
                brand_id: brandId,
                message: 'No booking attempt recorded for this brand yet. Click Sync on the failing order first (with the correct X-Brand-Name), then reload this.',
            });
        }
        return res.json({ success: true, brand_id: brandId, ...raw });
    } catch (e) {
        return res.status(500).json({ success: false, message: e.message });
    }
});

// ── Verify a brand's iThink pickup ID exists on the account ─────────────────
// GET /api/ithink-warehouse?brand_id=10[&id=117173]
// Asks iThink whether the brand's ITHINK_PICKUP_ADDRESS_ID is a REGISTERED
// pickup location. If it returns empty/error, that ID is not on the account —
// which is exactly what makes /order/add.json fail with "Some error occured"
// even though we send the ID. No secrets exposed.
router.get('/ithink-warehouse', optionalBrand, async (req, res) => {
    try {
        const brandId = Number(req.query.brand_id) || req.brandId || 1;
        const settingsHelper = require('../services/settingsHelper');
        settingsHelper.clearCache(brandId);
        const pickupId = req.query.id || await settingsHelper.getSetting(brandId, 'ITHINK_PICKUP_ADDRESS_ID');
        if (!pickupId) {
            return res.json({ success: false, brand_id: brandId, message: 'No ITHINK_PICKUP_ADDRESS_ID set for this brand.' });
        }
        const factory = require('../services/shippingProviderFactory');
        const provider = await factory.getShippingProvider(brandId).catch(() => null);
        if (!provider || typeof provider.getWarehouse !== 'function') {
            return res.json({ success: false, brand_id: brandId, message: 'iThink is not the active provider for this brand.' });
        }
        const warehouse = await provider.getWarehouse(pickupId).catch((e) => ({ error: e.message }));
        return res.json({
            success: true,
            brand_id: brandId,
            pickup_address_id: String(pickupId),
            warehouse,
            hint: 'If "warehouse" is empty / error / "not found", this pickup ID is NOT registered on the iThink account — that is why bookings fail with "Some error occured". Register the warehouse in iThink → Pickup Addresses (or set the correct existing ID).',
        });
    } catch (e) {
        return res.status(500).json({ success: false, message: e.message });
    }
});

// ── iThink booking probe (why does THIS order's booking fail?) ──────────────
// GET /api/ithink-booking-probe/:orderNumber
//   Shows the EXACT payload we would send to /order/add.json (auth redacted) —
//   logistics / s_type / order_type / shipment — plus the REAL courier codes the
//   account's rate-check returns, so a courier-code mismatch is obvious. It does
//   NOT send by default. Add ?send=1 to actually POST and see iThink's response
//   (only do that on a failing order — a success would create a shipment).
router.get('/ithink-booking-probe/:orderNumber', optionalBrand, async (req, res) => {
    try {
        const { Order } = require('../model/orderModel.js');
        const { OrderItem } = require('../model/orderItemModel.js');
        const { Product } = require('../model/productModel.js');
        const { ProductVariation } = require('../model/productVariationModel.js');
        const { User } = require('../model/userModel.js');
        const { GuestUser } = require('../model/guestUserModel.js');
        const { ShippingAddress } = require('../model/shippingAddressModel.js');
        const settingsHelper = require('../services/settingsHelper');

        const on = String(req.params.orderNumber || '').trim();
        const order = await Order.findOne({
            where: { order_number: on },
            include: [
                { model: OrderItem, as: 'OrderItems', include: [{ model: Product, as: 'Product' }, { model: ProductVariation, as: 'ProductVariation' }] },
                { model: User, as: 'User', required: false },
                { model: GuestUser, as: 'GuestUser', required: false },
                { model: ShippingAddress, as: 'ShippingAddress' },
            ],
        });
        if (!order) return res.status(404).json({ success: false, message: `Order ${on} not found` });

        const brandId = order.brand_id || 1;
        const factory = require('../services/shippingProviderFactory');
        const provider = await factory.getShippingProvider(brandId);
        const osc = require('../controller/orderShippingController.js');

        // Which couriers actually serve this route — via the SAME pincode
        // serviceability check the Sync auto-selector now uses (rate/check comes
        // back empty for many routes, so we no longer default to "delhivery").
        const { extractIThinkCouriers } = require('../utils/serviceability.js');
        let serviceable = [];
        try {
            const whPin = await settingsHelper.getSetting(brandId, 'ITHINK_WAREHOUSE_PINCODE', '363641');
            const raw = await provider.checkServiceability(whPin, order.ShippingAddress?.pincode);
            serviceable = extractIThinkCouriers(raw);
        } catch (e) { serviceable = [{ error: e.message }]; }

        const first = serviceable.find((c) => c && c.code);
        const picked = req.query.logistics || (first && first.code) || 'delhivery';
        const stype  = req.query.s_type || (first && first.s_type) || 'surface';

        const orderData = await osc.prepareFShipOrderData(order, 'ithink', picked, stype);
        const payload = provider.formatOrderDataForIThink(orderData);
        const { access_token, secret_key, ...safeData } = payload.data || {};

        const out = {
            success: true,
            order_number: on,
            brand_id: brandId,
            available_courier_codes: serviceable.map((c) => c && c.code).filter(Boolean),
            available_couriers: serviceable.map((c) => c && c.code ? { code: c.code, s_type: c.s_type, id: c.id, is_serviceable: c.is_serviceable } : c),
            picked_logistics: picked,
            picked_s_type: stype,
            request_preview: { ...safeData, access_token: access_token ? 'set' : 'MISSING', secret_key: secret_key ? 'set' : 'MISSING' },
        };

        if (String(req.query.send) === '1') {
            let result, err;
            try { result = await provider.createForwardOrder(orderData); } catch (e) { err = e.message; }
            out.sent = true;
            out.ithink_response = (provider._lastBookingRaw && provider._lastBookingRaw.response) || null;
            out.result = result;
            out.error = err;
        }
        return res.json(out);
    } catch (e) {
        return res.status(500).json({ success: false, message: e.message });
    }
});

// ── Serviceability probe for an order (the NEW auto-courier signal) ─────────
// GET /api/ithink-serviceability/:orderNumber   (send X-Brand-Name / ?brand_id)
// Shows EXACTLY what the Sync auto-selector sees for this order: the rate/check
// couriers (with cod/prepaid support + live rate), which are eligible for this
// order's payment mode, and the cheapest one it would book. This is the real
// response to check why an order booked (or was flagged "not serviceable").
router.get('/ithink-serviceability/:orderNumber', optionalBrand, async (req, res) => {
    try {
        const { Order } = require('../model/orderModel.js');
        const { OrderItem } = require('../model/orderItemModel.js');
        const { ShippingAddress } = require('../model/shippingAddressModel.js');
        const settingsHelper = require('../services/settingsHelper');

        const on = String(req.params.orderNumber || '').trim();
        const order = await Order.findOne({
            where: { order_number: on },
            include: [
                { model: OrderItem, as: 'OrderItems' },
                { model: ShippingAddress, as: 'ShippingAddress' },
            ],
        });
        if (!order) return res.status(404).json({ success: false, message: `Order ${on} not found` });

        const brandId = order.brand_id || 1;
        const factory = require('../services/shippingProviderFactory');
        const provider = await factory.getShippingProvider(brandId);

        const whPin = await settingsHelper.getSetting(brandId, 'ITHINK_WAREHOUSE_PINCODE', '363641');
        const destPin = order.ShippingAddress?.pincode || '';
        const isCOD = String(order.payment_type || '').toLowerCase() === 'cod';
        const totalQty = (order.OrderItems || []).reduce((s, i) => s + (i.quantity || 0), 0) || 1;

        let raw, checkErr;
        try {
            raw = await provider.getAvailableCouriers({
                sourcePincode: whPin, destinationPincode: destPin,
                weight: Math.max(0.5, totalQty * 0.1), length: 10, width: 10, height: 5 * totalQty,
                paymentMode: isCOD ? 'COD' : 'Prepaid', productMrp: parseFloat(order.final_amount) || 500,
            });
        } catch (e) { checkErr = e.message; }

        // Same extraction + eligibility the Sync auto-selector uses.
        const { extractIThinkCouriers } = require('../utils/serviceability.js');
        const truthy = (v) => v === true || v === 1 || ['yes', '1', 'true', 'y'].includes(String(v).toLowerCase());
        const couriers = extractIThinkCouriers(raw);

        const parsed = couriers.map((c) => {
            const modeOk = isCOD
                ? (c.cod === undefined || truthy(c.cod))
                : (c.prepaid === undefined || truthy(c.prepaid));
            const rate = parseFloat(c.raw?.rate ?? c.raw?.freight_charges ?? 0) || 0;
            return {
                courier: c.code, book_as: String(c.code).toLowerCase(),
                service_type: c.s_type, logistics_id: c.id,
                cod: c.cod, prepaid: c.prepaid, rate,
                eligible_for_this_order: !!modeOk,
            };
        }).filter((c) => c.courier);

        const eligible = parsed.filter((c) => c.eligible_for_this_order).sort((a, b) => a.rate - b.rate);

        return res.json({
            success: true,
            order_number: on,
            brand_id: brandId,
            payment_type: order.payment_type,
            is_cod: isCOD,
            from_pincode: whPin,
            to_pincode: destPin,
            serviceable: eligible.length > 0,
            would_book: eligible[0] ? { courier: eligible[0].courier, book_as: eligible[0].book_as, s_type: String(eligible[0].service_type || '').toLowerCase(), rate: eligible[0].rate } : null,
            eligible_couriers: eligible.map((c) => `${c.courier}/${c.service_type} @₹${c.rate}`),
            all_couriers: parsed,
            check_error: checkErr || null,
        });
    } catch (e) {
        return res.status(500).json({ success: false, message: e.message });
    }
});

// ── Debug: which iThink endpoint returns the full DOMESTIC courier matrix ────
// GET /api/ithink-serviceability-debug?brand_id=10&from=363641&to=431136
//   (or ?order=MX-... to pull from/to from an order)
// Fires every candidate domestic endpoint with the brand's real credentials and
// returns each raw reply + how many couriers our extractor finds in it. Use this
// to confirm the correct endpoint before we switch checkServiceability over.
router.get('/ithink-serviceability-debug', optionalBrand, async (req, res) => {
    try {
        const settingsHelper = require('../services/settingsHelper');
        let brandId = Number(req.query.brand_id) || req.brandId || 1;
        let from = req.query.from;
        let to = req.query.to;

        if (req.query.order) {
            const { Order } = require('../model/orderModel.js');
            const { ShippingAddress } = require('../model/shippingAddressModel.js');
            const order = await Order.findOne({
                where: { order_number: String(req.query.order).trim() },
                include: [{ model: ShippingAddress, as: 'ShippingAddress' }],
            });
            if (order) { brandId = order.brand_id || brandId; to = to || order.ShippingAddress?.pincode; }
        }
        from = from || await settingsHelper.getSetting(brandId, 'ITHINK_WAREHOUSE_PINCODE', '363641');
        if (!to) return res.status(400).json({ success: false, message: 'Provide ?to=<pincode> or ?order=<orderNumber>' });

        const factory = require('../services/shippingProviderFactory');
        const provider = await factory.getShippingProvider(brandId);
        if (typeof provider.debugServiceabilityEndpoints !== 'function') {
            return res.status(400).json({ success: false, message: 'Active provider for this brand is not iThink.' });
        }
        const results = await provider.debugServiceabilityEndpoints(from, to);
        return res.json({ success: true, brand_id: brandId, from_pincode: from, to_pincode: to, results });
    } catch (e) {
        return res.status(500).json({ success: false, message: e.message });
    }
});

// ── HTTP cron trigger (cPanel-friendly) ─────────────────────────────────────
// On cPanel+Passenger the in-process node-cron / Bull worker pauses when the web
// app idles, so scheduled jobs (shipping sync, status refresh) can stall. The
// reliable fix is an OS-level cPanel cron that hits this endpoint — the HTTP
// request wakes Passenger AND enqueues the job, which the worker then drains.
//
// Secure it with a token (CRON_TOKEN, or reuse ADMIN_METRICS_TOKEN). Without a
// token set it refuses (never an open trigger).
//
// cPanel → Cron Jobs — twice a day (keeps load light):
//   0 6,18 * * *  curl -fsS -H "x-cron-token: YOUR_TOKEN" "https://api.crosscoin.in/api/cron/run?job=shipping-sync"   >/dev/null 2>&1
//   30 6,18 * * * curl -fsS -H "x-cron-token: YOUR_TOKEN" "https://api.crosscoin.in/api/cron/run?job=status-refresh" >/dev/null 2>&1
const CRON_JOBS = {
    'shipping-sync': 'cron:shipping-sync',
    'status-refresh': 'cron:shipping-status-refresh',
    'loyalty-expiry': 'cron:loyalty-expiry',
};
router.all('/cron/run', async (req, res) => {
    const token = process.env.CRON_TOKEN || process.env.ADMIN_METRICS_TOKEN;
    const presented = (req.headers['x-cron-token'] || req.query.token || '').toString();
    if (!token || presented !== token) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const job = (req.query.job || 'shipping-sync').toString();
    const jobName = CRON_JOBS[job];
    if (!jobName) {
        return res.status(400).json({ success: false, message: 'Unknown job', allowed: Object.keys(CRON_JOBS) });
    }
    try {
        const { enqueue } = require('../services/integrationQueue.js');
        await enqueue(jobName, { via: 'http-cron', at: Date.now() });
        return res.json({ success: true, enqueued: jobName });
    } catch (e) {
        return res.status(500).json({ success: false, message: e.message });
    }
});

module.exports = router;
