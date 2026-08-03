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
        let providerName = 'fship';
        let provider;
        try {
            const factory = require('../services/shippingProviderFactory');
            providerName = await factory.getProviderName(brandId);
            provider = await factory.getShippingProvider(brandId);
        } catch {
            provider = require('../services/fshipService');
        }

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

        // ?debug=1 → append diagnostics so a "not serviceable" can be traced to
        // its cause (staging host / bad token → empty raw response) WITHOUT any
        // admin token and WITHOUT ever exposing credentials. Safe, read-only.
        const debug = ['1', 'true', 'yes', 'probe'].includes(String(req.query.debug || '').toLowerCase())
            ? {
                _debug: {
                    providerName,
                    ithink_environment: await settingsHelper.getSetting(brandId, 'ITHINK_ENVIRONMENT', 'production'),
                    resolved_host: provider && provider.baseURL ? provider.baseURL : null,
                    from_pincode: src,
                    country_code: String(process.env.ITHINK_COUNTRY_CODE || 'IN'),
                    raw_response: raw,
                    // Un-normalised iThink reply (url + credential-free request +
                    // exact response) — shows an error envelope vs an empty list.
                    ithink_raw: (provider && provider._lastPincodeRaw) || null,
                    // ?debug=probe → hit BOTH prod + staging hosts to reveal which
                    // environment the tokens belong to (empty on prod + data on
                    // staging = staging credentials).
                    host_probe: (String(req.query.debug).toLowerCase() === 'probe' && provider && provider.probePincode)
                        ? await provider.probePincode(pincode).catch((e) => ({ error: e.message }))
                        : undefined,
                    parsed_decision: decision,
                },
            }
            : {};

        // KILL-SWITCH (brand-scoped): while iThink serviceability is broken, do
        // NOT let it block checkout for listed brands — every PIN reads as
        // deliverable so customers can place orders. Booking stays the real
        // gate. Defaults to 'crosscoin'; override via SERVICEABILITY_BYPASS_BRANDS
        // (comma-separated brand names, e.g. "crosscoin,gripzus"), or set it to
        // an empty string to enforce for all brands again.
        const norm = (s) => String(s || '').toLowerCase().replace(/\s+/g, '');
        const candidates = [req.headers['x-brand-name'], req.brand?.name, req.brand?.slug].map(norm).filter(Boolean);
        const bypassList = (process.env.SERVICEABILITY_BYPASS_BRANDS ?? 'crosscoin')
            .split(',').map(norm).filter(Boolean);
        const bypass = candidates.some((c) => bypassList.includes(c));

        if (!bypass && !decision.serviceable) {
            return res.json({ success: true, serviceable: false, message: 'Delivery not available for this PIN code', ...debug });
        }
        return res.json({
            success: true,
            serviceable: true,
            cod_allowed: bypass ? true : decision.cod_allowed,
            cod_available: bypass ? true : decision.cod_available,
            estimated_delivery_days: decision.estimated_delivery_days || 5,
            ...debug,
        });
    } catch (e) {
        // On ANY failure, never block checkout — report serviceable and let the
        // booking (worker) be the final gate.
        return res.json({ success: true, serviceable: true, cod_allowed: true, error: 'Serviceability check unavailable' });
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
