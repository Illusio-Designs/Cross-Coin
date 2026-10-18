const settingsHelper = require('../services/settingsHelper');
const safeImage = value => {
  const image = String(value || '').trim();
  if (image.startsWith('/') && !image.startsWith('//')) return image;
  try { return new URL(image).protocol === 'https:' ? image : null; } catch (_) { return null; }
};
exports.getHomeBundleContent = async (req, res) => {
  try {
    const images = await Promise.all(['HOME_BUNDLE_IMAGE_1', 'HOME_BUNDLE_IMAGE_2'].map(key =>
      settingsHelper.getSetting(req.brandId, key, null, { brandOnly: true })));
    res.vary('X-Brand-Name');
    res.set('Cache-Control', 'public, max-age=60');
    return res.json({ success: true, images: images.map(safeImage) });
  } catch (_) {
    return res.status(500).json({ success: false, message: 'Unable to load homepage banners' });
  }
};
