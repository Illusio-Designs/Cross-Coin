const express = require('express');
const router = express.Router();
const brandSettingsController = require('../controller/brandSettingsController');
const { authenticate, isAdmin } = require('../middleware/authMiddleware');
const shippingProviderFactory = require('../services/shippingProviderFactory.js');

// This router is mounted at /api/admin alongside other admin routers, so the
// admin check must cover ONLY its own paths — a bare router.use('/') made every
// /api/admin/* request (brands, SEO, FAQs, bundle tiers…) admin-only and broke
// product / order managers.
router.use(['/brand-settings', '/shipping'], authenticate, isAdmin);

// ── Brands page: plain labelled forms over brand_settings ─────────────────
// Registered before '/brand-settings/:key' so these names aren't read as keys.
const brandSettingsAdmin = require('../services/brandSettingsAdminService');
const settingsAudit = require('../services/settingsAuditService');
const sendErr = (res, err) => res.status(err.status || 500).json({ success: false, message: err.message || 'Something went wrong' });

// Every brand with its warnings (health dot) — no network checks.
router.get('/brand-settings/overview', async (req, res) => {
  try { res.json({ success: true, brands: await brandSettingsAdmin.overview() }); }
  catch (err) { sendErr(res, err); }
});

// One brand's sections, fields (secrets masked), other settings, warnings, recent changes.
router.get('/brand-settings/form', async (req, res) => {
  try {
    const data = await brandSettingsAdmin.form(parseInt(req.query.brandId, 10), { checkSite: req.query.checkSite !== '0' });
    if (!data) return res.status(404).json({ success: false, message: 'Brand not found' });
    res.json({ success: true, ...data });
  } catch (err) { sendErr(res, err); }
});

// Save: { brandId, values: { KEY: value }, remove: [KEY], brand: { display_name, … } }
router.put('/brand-settings/form', async (req, res) => {
  try {
    const brandId = parseInt(req.body?.brandId, 10);
    if (!brandId) return res.status(400).json({ success: false, message: 'Brand ID is required' });
    const result = await brandSettingsAdmin.save(brandId, req.body, req.user?.id || null);
    if (result.errors) return res.status(400).json({ success: false, message: 'Some fields need fixing', errors: result.errors });
    const data = await brandSettingsAdmin.form(brandId, { checkSite: false });
    res.json({ success: true, saved: result.saved, ...data });
  } catch (err) { sendErr(res, err); }
});

// General · all stores: the Meta token, iThink account and Razorpay account
// every store shares, plus the win-back coupon and WhatsApp status.
router.get('/brand-settings/general', async (req, res) => {
  try { res.json({ success: true, ...(await brandSettingsAdmin.general()) }); }
  catch (err) { sendErr(res, err); }
});
router.put('/brand-settings/general', async (req, res) => {
  try {
    const result = await brandSettingsAdmin.saveGeneral(req.body || {}, req.user?.id || null);
    if (result.errors) return res.status(400).json({ success: false, message: 'Some fields need fixing', errors: result.errors });
    res.json({ success: true, saved: result.saved, ...(await brandSettingsAdmin.general()) });
  } catch (err) { sendErr(res, err); }
});

// Check the saved Razorpay keys against Razorpay (secret never leaves the server).
router.post('/brand-settings/test/razorpay', async (req, res) => {
  try {
    const brandId = parseInt(req.body?.brandId, 10);
    if (!brandId) return res.status(400).json({ success: false, message: 'Brand ID is required' });
    res.json({ success: true, ...(await brandSettingsAdmin.testRazorpay(brandId)) });
  } catch (err) { sendErr(res, err); }
});

// Can the saved Meta token read the store's ad account (for ad spend)?
router.post('/brand-settings/test/meta-ads', async (req, res) => {
  try {
    const brandId = parseInt(req.body?.brandId, 10);
    if (!brandId) return res.status(400).json({ success: false, message: 'Brand ID is required' });
    res.json({ success: true, ...(await brandSettingsAdmin.testMetaAds(brandId)) });
  } catch (err) { sendErr(res, err); }
});

// Who changed what (newest first).
router.get('/brand-settings/audit', async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit, 10) || 20, 100);
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const rows = await settingsAudit.list({ brandId: parseInt(req.query.brandId, 10) || null, area: req.query.area || null, limit, offset: (page - 1) * limit });
    res.json({ success: true, page, rows });
  } catch (err) { sendErr(res, err); }
});

// Get all settings (with optional category filter via query param)
router.get('/brand-settings', brandSettingsController.getAllSettings);

// Get settings by category
router.get('/brand-settings/category/:category', brandSettingsController.getSettingsByCategory);

// Get a single setting by key
router.get('/brand-settings/:key', brandSettingsController.getSingleSetting);

// Create a new setting
router.post('/brand-settings', brandSettingsController.createSetting);

// Update an existing setting
router.put('/brand-settings/:key', brandSettingsController.updateSetting);

// Delete a setting
router.delete('/brand-settings/:key', brandSettingsController.deleteSetting);

// ── Shipping provider diagnostics ──────────────────────────────────────────
// Verify the brand's configured iThink pickup address by asking iThink to
// resolve it using the brand's stored Access Token / Secret Key. iThink has
// no documented "list all warehouses" endpoint, so we look up the saved
// Pickup Address ID directly — if iThink finds an approved warehouse with
// that ID for these credentials, the sync will work; otherwise we surface
// the exact reason ("Warehouse not found", "Pending approval", etc.).
router.get('/shipping/ithink-warehouses', async (req, res) => {
  try {
    const brandId = parseInt(req.query.brandId, 10) || 1;
    const overrideId = (req.query.warehouseId || '').toString().trim();
    shippingProviderFactory.clearCache(brandId); // ensure latest saved settings are used

    const provider = shippingProviderFactory.getProviderByName('ithink', brandId);

    // If the caller didn't pass an explicit warehouse_id, ask iThink about
    // the brand's saved ITHINK_PICKUP_ADDRESS_ID.
    const settingsHelper = require('../services/settingsHelper');
    const savedId = overrideId
      || (await settingsHelper.getSetting(brandId, 'ITHINK_PICKUP_ADDRESS_ID'))
      || '';

    if (!savedId) {
      return res.status(400).json({
        success: false,
        message: 'No iThink Pickup Address ID is configured for this brand yet.',
      });
    }

    const raw = await provider.getWarehouse(savedId);
    return res.json({ success: true, warehouse_id: savedId, data: raw });
  } catch (error) {
    return res.status(400).json({
      success: false,
      message: error.message || 'Failed to verify iThink pickup address',
    });
  }
});

module.exports = router;
