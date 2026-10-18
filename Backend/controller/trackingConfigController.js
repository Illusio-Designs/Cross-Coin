exports.getTrackingConfig = async (req, res) => {
  try {
    // This public endpoint must never silently select Crosscoin or shared env IDs.
    const brandId = req.brandId;
    if (!brandId) {
      return res.status(400).json({ success: false, message: 'A valid brand is required' });
    }
    const settingsHelper = require('../services/settingsHelper');
    const get = (key) => settingsHelper.getSetting(brandId, key, null, { brandOnly: true });
    const [ga, fb, clarity, gtm, googleAds, googleAdsLabel, googleAdsLabels] = await Promise.all([
      get('GA_MEASUREMENT_ID'),
      get('FB_PIXEL_ID'),
      get('CLARITY_ID'),
      get('GTM_ID'),
      get('GOOGLE_ADS_ID'),
      get('GOOGLE_ADS_CONVERSION_LABEL'),
      get('GOOGLE_ADS_CONVERSION_LABELS'),
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
      ADS_EVENTS.map((e) => get('GOOGLE_ADS_LABEL_' + e.toUpperCase()))
    );
    ADS_EVENTS.forEach((e, i) => { if (perEventLabels[i]) adsLabels[e] = perEventLabels[i]; });

    // Cache at the CDN/edge for 5 min — these IDs change rarely.
    res.vary('X-Brand-Name');
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
};
