const { Policy } = require('../model/policyModel');
const { Op } = require('sequelize');
const { logger } = require('../config/logging.js');

exports.createPolicy = async (req, res) => {
  try {
    const { title, content, brand_id: bodyBrandId } = req.body;
    // Use brand from middleware, body, or default to 1
    const brand_id = (req.brand && req.brand.id) ? req.brand.id : (bodyBrandId || 1);
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

    const where = {};
    if (req.brand && req.brand.id) where.brand_id = req.brand.id;
    const policies = await Policy.findAll({ where });

    // Prefer an EXACT slug match. The old behaviour matched titles with a
    // LIKE '%...%' substring, so /policy/privacy-policy and
    // /policy/terms-and-conditions could resolve to the wrong policy (or the
    // same one) — that's what made the two pages show each other's content.
    let policy = policies.find((p) => slugifyTitle(p.title) === reqSlug);

    // Forgiving fallback only when nothing matched exactly, so genuinely odd
    // titles/legacy links still resolve instead of 404-ing.
    if (!policy) {
      const searchTitle = reqSlug.replace(/-/g, ' ');
      policy = policies.find((p) => String(p.title || '').toLowerCase().includes(searchTitle));
    }

    if (!policy) return res.status(404).json({ error: 'Policy not found' });
    res.json(policy);
  } catch (err) {
    logger.error('Get public policy by name error:', err);
    res.status(500).json({ error: err.message });
  }
};
