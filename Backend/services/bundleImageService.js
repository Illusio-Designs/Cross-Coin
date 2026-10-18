const { BrandSetting } = require('../model/brandSettingModel');
const imageKey = id => `BUNDLE_TIER_IMAGE_${id}`;
function normalizeImage(value) {
  const image = String(value || '').trim();
  if (!image) return null;
  if (image.startsWith('/') && !image.startsWith('//') && !image.includes('\\')) return image;
  try {
    const url = new URL(image);
    if (url.protocol === 'https:' && !url.username && !url.password) return url.href;
  } catch (_) {}
  throw new Error('Banner image must be a public HTTPS URL or a local image path');
}
async function attachTierImages(tiers, brandId) {
  if (!tiers.length) return [];
  const images = await BrandSetting.findAll({ where: { brand_id: brandId, key: tiers.map(tier => imageKey(tier.id)) } });
  const byKey = new Map(images.map(image => [image.key, image.value]));
  return tiers.map(tier => ({ ...(tier.toJSON ? tier.toJSON() : tier), image_url: byKey.get(imageKey(tier.id)) || null }));
}
async function saveTierImage(tier, value, transaction) {
  if (value === undefined) return;
  await BrandSetting.upsert({ brand_id: tier.brand_id, key: imageKey(tier.id), value: normalizeImage(value), category: 'general', is_encrypted: false }, { transaction });
}
async function deleteTierImage(tier, transaction) {
  await BrandSetting.destroy({ where: { brand_id: tier.brand_id, key: imageKey(tier.id) }, transaction });
}
module.exports = { normalizeImage, attachTierImages, saveTierImage, deleteTierImage };
