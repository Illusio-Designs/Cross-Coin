const { Policy } = require('../model/policyModel');
const { Op } = require('sequelize');
const { logger } = require('../config/logging.js');

exports.createPolicy = async (req, res) => {
  try {
    const { title, content, brand_id: bodyBrandId, scope } = req.body;
    // scope 'global' (or an explicit null brand_id) creates a shared policy
    // that serves every store; otherwise use brand from middleware/body/default.
    let brand_id;
    if (scope === 'global' || bodyBrandId === null) brand_id = null;
    else brand_id = (req.brand && req.brand.id) ? req.brand.id : (bodyBrandId || 1);
    const policy = await Policy.create({ title, content, brand_id });
    res.status(201).json(policy);
  } catch (err) {
    logger.error('Create policy error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.getPolicies = async (req, res) => {
  try {
    const where = {};
    if (req.brand && req.brand.id) where.brand_id = req.brand.id;
    const policies = await Policy.findAll({ where });
    res.json(policies);
  } catch (err) {
    logger.error('Get policies error:', err);
    res.status(500).json({ error: err.message });
  }
};

exports.getPolicyById = async (req, res) => {
  try {
    const policy = await Policy.findByPk(req.params.id);
    if (!policy) return res.status(404).json({ error: 'Policy not found' });
    res.json(policy);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.updatePolicy = async (req, res) => {
  try {
    const { title, content } = req.body;
    const policy = await Policy.findByPk(req.params.id);
    if (!policy) return res.status(404).json({ error: 'Policy not found' });
    policy.title = title;
    policy.content = content;
    await policy.save();
    res.json(policy);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.deletePolicy = async (req, res) => {
  try {
    const policy = await Policy.findByPk(req.params.id);
    if (!policy) return res.status(404).json({ error: 'Policy not found' });
    await policy.destroy();
    res.json({ message: 'Policy deleted' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// Shared company legal details. One GSTIN value (stored once, under the primary
// brand record) is substituted into the {{GSTIN}} token of every policy, so it
// can be updated later in a single field without editing any policy HTML.
const COMPANY_BRAND_ID = 1;
exports.getCompanyInfo = async (req, res) => {
  try {
    const gstin = (await require('../services/brandSettingsService.js').getBrandSetting(COMPANY_BRAND_ID, 'company_gstin')) || '';
    res.json({ gstin });
  } catch (err) {
    logger.error('getCompanyInfo error:', err);
    res.status(500).json({ error: err.message });
  }
};
exports.setCompanyInfo = async (req, res) => {
  try {
    const gstin = String(req.body?.gstin ?? '').trim().slice(0, 32);
    await require('../services/brandSettingsService.js').setBrandSetting(
      COMPANY_BRAND_ID, 'company_gstin', gstin, false, 'legal', 'Company GSTIN shown on policies', req.user?.id || null,
    );
    res.json({ success: true, gstin });
  } catch (err) {
    logger.error('setCompanyInfo error:', err);
    res.status(500).json({ error: err.message });
  }
};

// Turn a title into a URL slug the same way the storefront does
// (e.g. "Privacy Policy" -> "privacy-policy"). Kept in sync with the
// frontend slug rule so an exact match is reliable.
const slugifyTitle = (s) => String(s || '')
  .toLowerCase()
  .replace(/&/g, ' and ')       // "Terms & Conditions" -> "terms and conditions"
  .trim()
  .replace(/\s+/g, '-')
  .replace(/[^a-z0-9-]/g, '')
  .replace(/-+/g, '-')          // collapse any doubled hyphens
  .replace(/^-|-$/g, '');

exports.getPublicPolicyByName = async (req, res) => {
  try {
    const reqSlug = String(req.params.name || '').toLowerCase().trim();
    const brandId = req.brand && req.brand.id ? req.brand.id : null;

    // Pull this brand's rows AND the global (brand_id IS NULL) rows. A single
    // global policy can serve every store (DPDP "one template"): the storefront
    // name is filled from the {{BRAND}} token at serve time, and everything
    // else is identical across brands.
    const where = brandId ? { [Op.or]: [{ brand_id: brandId }, { brand_id: null }] } : {};
    const policies = await Policy.findAll({ where });

    const exact = (p) => slugifyTitle(p.title) === reqSlug;
    // Global WINS when present (edit the global → every store updates), then a
    // brand-specific override, then a forgiving substring fallback.
    let policy = policies.find((p) => p.brand_id === null && exact(p))
             || policies.find((p) => p.brand_id === brandId && exact(p));
    if (!policy) {
      const searchTitle = reqSlug.replace(/-/g, ' ');
      policy = policies.find((p) => String(p.title || '').toLowerCase().includes(searchTitle));
    }

    if (!policy) return res.status(404).json({ error: 'Policy not found' });

    // Fill the shared tokens so one template reads correctly everywhere:
    // {{BRAND}} = the store name (when a brand is resolved), {{GSTIN}} = the one
    // company GSTIN field (set once in the Dashboard; see get/setCompanyInfo).
    const brandName = (req.brand && (req.brand.display_name || req.brand.name)) || '';
    let gstin = '';
    try { gstin = (await require('../services/brandSettingsService.js').getBrandSetting(1, 'company_gstin')) || ''; } catch (e) { /* ignore */ }
    const out = policy.toJSON();
    const sub = (s) => (s == null ? s : String(s)
      .replace(/\{\{\s*BRAND\s*\}\}/g, brandName)
      .replace(/\{\{\s*GSTIN\s*\}\}/g, gstin || 'to be updated'));
    out.title = sub(out.title);
    out.content = sub(out.content);
    res.json(out);
  } catch (err) {
    logger.error('Get public policy by name error:', err);
    res.status(500).json({ error: err.message });
  }
};
