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
router.use('/reels',              optionalBrand, require('./reelRoutes.js'));

// ── User features ─────────────────────────────────────────────────────────
router.use('/loyalty',            optionalBrand, require('./loyaltyRoutes.js'));
router.use('/notifications',      require('./notificationRoutes.js'));
router.use('/utm',                require('./utmRoutes.js'));
router.use('/leads',              require('./leadRoutes.js'));

// ── Auth (OTP) ────────────────────────────────────────────────────────────
router.use('/auth',               optionalBrand, require('./checkoutRoutes.js'));

// ── Checkout (payment-first flow) ─────────────────────────────────────────
router.use('/checkout',           optionalBrand, require('./checkoutRoutes.js'));

// ── WhatsApp ──────────────────────────────────────────────────────────────
router.use('/whatsapp',           require('./whatsappRoutes.js'));

// ── Admin ─────────────────────────────────────────────────────────────────
router.use('/admin/loyalty',      optionalBrand, require('./adminLoyaltyRoutes.js'));
router.use('/admin/lookbooks',    optionalBrand, require('./adminLookbookRoutes.js'));
router.use('/admin/reels',        optionalBrand, require('./adminReelRoutes.js'));
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
    try {
        const { pincode } = req.params;
        if (!/^\d{6}$/.test(pincode)) return res.status(400).json({ success: false, message: 'Invalid pincode' });
        const fshipService = require('../services/fshipService');
        const settingsHelper = require('../services/settingsHelper');
        const src = await settingsHelper.getSetting(req.brandId || 1, 'DEFAULT_WAREHOUSE_PINCODE', '363641');
        const result = await fshipService.checkServiceability(src, pincode);
        if (result && Array.isArray(result) && result.length > 0) {
            const deliverable = result.some(c => (c.delivery || '').toLowerCase() === 'yes' || c.status === true);
            if (!deliverable) return res.json({ success: true, serviceable: false, message: 'Delivery not available' });
            const cod = result.some(c => (c.cod || '').toLowerCase() === 'yes');
            const edd = result[0].estimated_delivery_days || result[0].edd || result[0].tat || 5;
            return res.json({ success: true, serviceable: true, estimated_delivery_days: parseInt(edd) || 5, cod_available: cod });
        }
        return res.json({ success: true, serviceable: false, message: 'Delivery not available' });
    } catch (e) { return res.status(500).json({ success: false, message: 'Serviceability check failed' }); }
});

module.exports = router;
