const express = require('express');
const router = express.Router();
const { optionalBrand } = require('../middleware/brandMiddleware.js');

// ── Core resources ────────────────────────────────────────────────────────
router.use('/users',              optionalBrand, require('./userRoutes.js'));
router.use('/products',           optionalBrand, require('./productRoutes.js'));
router.use('/categories',         optionalBrand, require('./categoryRoutes.js'));
router.use('/orders',             optionalBrand, require('./orderRoutes.js'));
router.use('/returns',            optionalBrand, require('./returnRoutes.js'));
router.use('/ndr',                require('./ndrRoutes.js'));
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

// ── User features ─────────────────────────────────────────────────────────
router.use('/loyalty',            optionalBrand, require('./loyaltyRoutes.js'));
router.use('/notifications',      require('./notificationRoutes.js'));
router.use('/utm',                require('./utmRoutes.js'));
router.use('/events',             require('./eventsRoutes.js'));
router.use('/consent',            optionalBrand, require('./consentRoutes.js'));
router.use('/pickup-schedule',    require('./pickupScheduleRoutes.js'));
router.use('/leads',              require('./leadRoutes.js'));

// ── Auth (OTP) ────────────────────────────────────────────────────────────
const { otpRouter, checkoutRouter } = require('./checkoutRoutes.js');
router.use('/auth',               optionalBrand, otpRouter);

// ── Checkout (payment-first flow) ─────────────────────────────────────────
router.use('/checkout',           optionalBrand, checkoutRouter);

// ── WhatsApp ──────────────────────────────────────────────────────────────
router.use('/whatsapp',           require('./whatsappRoutes.js'));
router.use('/whatsapp',           require('./whatsappInsightsRoutes.js')); // carts, analytics, settings

// ── Admin ─────────────────────────────────────────────────────────────────
router.use('/admin/loyalty',      optionalBrand, require('./adminLoyaltyRoutes.js'));
router.use('/admin',              optionalBrand, require('./brandSettingsRoutes.js'));
router.use('/admin',              require('./brandRoutes.js'));
router.use('/dashboard',          optionalBrand, require('./dashboardRoutes.js'));
router.use('/search',             require('./searchRoutes.js'));
router.use('/reports',            require('./reportsRoutes.js'));
router.use('/customers',          require('./customerProfileRoutes.js'));
router.use('/order-status-history', optionalBrand, require('./orderStatusHistoryRoutes.js'));

// ── Integrations ──────────────────────────────────────────────────────────
router.use('/facebook-pixel',     require('../integration/facebookPixel.js'));

// ── FAQs (admin + public) ─────────────────────────────────────────────────
router.use('/', optionalBrand, require('./faqRoutes.js'));
router.use('/', optionalBrand, require('./bundleRoutes.js'));
// Custom Checkout (Shiprocket-Checkout-compatible catalog + token + orders)
router.use('/custom-checkout', optionalBrand, require('./customCheckoutRoutes.js'));
router.use('/', optionalBrand, require('./abandonedCartRoutes.js'));

// ── GST invoice (public, HMAC-token link used in the WhatsApp document) ───
router.get('/invoice/:orderNumber', require('../controller/invoiceController.js').getPublicInvoice);

// ── WhatsApp button redirects (/track/:orderNumber, /shop/:brandId) ───────
// Brand-neutral fixed URLs that 302 to the customer's OWN store (one shared
// WhatsApp number can't carry per-brand button domains).
router.use('/', require('./trackRedirectRoutes.js'));

// ── SEO admin (health summary, bulk product SEO editor) ───────────────────
router.use('/', require('./seoAdminRoutes.js'));

// ── First-party trackers (opaque paths) ────────────────────────────────────
// Anonymous, cookieless counters. Ad-blockers block request paths containing
// "utm", "track" and "pageview", so these opaque paths are the ONLY tracking
// URLs: /i/pv increments the aggregate (brand, day, channel) pageview count,
// /i/s records the consent-gated UTM touch.
router.post('/i/s', optionalBrand, require('../controller/utmController.js').trackUTM);
router.post('/i/pv', optionalBrand, require('../controller/pageviewController.js').recordPageview);

// ── Public tracking config ────────────────────────────────────────────────
// Returns the non-sensitive analytics IDs configured in Brand Settings so the
// public site's <Analytics> component can mount gtag / fbq / Clarity with
// the real IDs (instead of a build-time env var that has to be redeployed
// whenever the admin updates them in the dashboard).
router.get('/public/tracking-config', require('../middleware/brandMiddleware.js').identifyBrand,
  require('../controller/trackingConfigController.js').getTrackingConfig);

// ── Public Organization schema + OG defaults ──────────────────────────────
// Builds schema.org/Organization JSON-LD from the brand's Global SEO Settings
// (name, logo, phone, socials, postal address) so each storefront can emit it
// on its homepage, plus OG image / fallback description. Resolves the brand from
// the X-Brand-Name header (optionalBrand), ?brandId, then brand 1.
router.get('/public/seo-org', optionalBrand, async (req, res) => {
  try {
    const brandId = req.brandId || parseInt(req.query.brandId, 10) || 1;
    const settingsHelper = require('../services/settingsHelper');
    const Brand = require('../model/brandModel.js');
    const [s, brand] = await Promise.all([
      settingsHelper.getSettings(brandId, [
        'SEO_ORGANIZATION_NAME', 'SEO_ORGANIZATION_LOGO', 'SEO_PHONE',
        'SEO_DEFAULT_OG_IMAGE', 'SEO_DEFAULT_DESCRIPTION',
        'SEO_SOCIAL_FACEBOOK', 'SEO_SOCIAL_INSTAGRAM', 'SEO_SOCIAL_TWITTER', 'SEO_SOCIAL_YOUTUBE',
        'SEO_ADDRESS_STREET', 'SEO_ADDRESS_CITY', 'SEO_ADDRESS_REGION', 'SEO_ADDRESS_POSTAL', 'SEO_ADDRESS_COUNTRY',
      ]),
      Brand.findByPk(brandId).catch(() => null),
    ]);

    const host = String(brand?.domain || '').replace(/^https?:\/\//, '').replace(/\/+$/, '');
    const siteUrl = host ? `https://${host}` : undefined;
    const name = s.SEO_ORGANIZATION_NAME || brand?.display_name || brand?.name || undefined;

    // Normalise a Twitter/X value that may be a bare @handle into a URL.
    const twitter = s.SEO_SOCIAL_TWITTER
      ? (/^https?:\/\//i.test(s.SEO_SOCIAL_TWITTER) ? s.SEO_SOCIAL_TWITTER : `https://twitter.com/${String(s.SEO_SOCIAL_TWITTER).replace(/^@/, '')}`)
      : null;
    const sameAs = [s.SEO_SOCIAL_FACEBOOK, s.SEO_SOCIAL_INSTAGRAM, twitter, s.SEO_SOCIAL_YOUTUBE].filter(Boolean);

    const contactPoint = s.SEO_PHONE
      ? [{ '@type': 'ContactPoint', telephone: s.SEO_PHONE, contactType: 'customer service' }]
      : undefined;
    const address = (s.SEO_ADDRESS_STREET || s.SEO_ADDRESS_CITY || s.SEO_ADDRESS_POSTAL || s.SEO_ADDRESS_REGION)
      ? {
          '@type': 'PostalAddress',
          streetAddress: s.SEO_ADDRESS_STREET || undefined,
          addressLocality: s.SEO_ADDRESS_CITY || undefined,
          addressRegion: s.SEO_ADDRESS_REGION || undefined,
          postalCode: s.SEO_ADDRESS_POSTAL || undefined,
          addressCountry: s.SEO_ADDRESS_COUNTRY || undefined,
        }
      : undefined;

    // Only return an Organization object when there's real content beyond name.
    const hasContent = s.SEO_ORGANIZATION_LOGO || sameAs.length || contactPoint || address;
    const organization = (hasContent && name)
      ? {
          '@context': 'https://schema.org', '@type': 'Organization',
          name, url: siteUrl,
          logo: s.SEO_ORGANIZATION_LOGO || undefined,
          sameAs: sameAs.length ? sameAs : undefined,
          contactPoint, address,
        }
      : null;

    res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=600');
    return res.json({
      success: true,
      organization,
      ogImage: s.SEO_DEFAULT_OG_IMAGE || null,
      description: s.SEO_DEFAULT_DESCRIPTION || null,
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

        // Use the brand's ACTUAL shipping provider (iThink or Shipping) so the cart
        // check matches what will really happen at booking time. Previously this
        // was hardcoded to Shipping even for iThink brands, so the check never
        // reflected reality.
        const factory = require('../services/shippingProviderFactory');
        const provider = await factory.getShippingProvider(brandId);

        const src = await settingsHelper.getSetting(
            brandId,
            'ITHINK_WAREHOUSE_PINCODE',
            await settingsHelper.getSetting(brandId, 'DEFAULT_WAREHOUSE_PINCODE', '363641')
        );

        const raw = await provider.checkServiceability(src, pincode);

        // Normalise + decide via the shared, unit-tested helper (handles the
        // iThink vs Shipping response shapes; never falsely blocks a real customer).
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

// ── HTTP cron trigger (cPanel-friendly) ─────────────────────────────────────
// On cPanel+Passenger the in-process node-cron / Bull worker pauses when the web
// app idles, so scheduled jobs (status refresh, loyalty expiry) can stall. The
// reliable fix is an OS-level cPanel cron that hits this endpoint — the HTTP
// request wakes Passenger AND enqueues the job, which the worker then drains.
//
// Secure it with a token (CRON_TOKEN, or reuse ADMIN_METRICS_TOKEN). Without a
// token set it refuses (never an open trigger).
//
// cPanel → Cron Jobs — twice a day (keeps load light):
//   30 6,18 * * * curl -fsS -H "x-cron-token: YOUR_TOKEN" "https://api.crosscoin.in/api/cron/run?job=status-refresh" >/dev/null 2>&1
const CRON_JOBS = {
    'status-refresh': 'cron:shipping-status-refresh',
    'loyalty-expiry': 'cron:loyalty-expiry',
};
router.all('/cron/run', async (req, res) => {
    const token = process.env.CRON_TOKEN || process.env.ADMIN_METRICS_TOKEN;
    const presented = (req.headers['x-cron-token'] || req.query.token || '').toString();
    if (!token || presented !== token) {
        return res.status(401).json({ success: false, message: 'Unauthorized' });
    }
    const job = (req.query.job || 'status-refresh').toString();
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
