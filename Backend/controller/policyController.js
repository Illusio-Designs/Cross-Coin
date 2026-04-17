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

exports.getPublicPolicyByName = async (req, res) => {
  try {
    const { name } = req.params;
    const searchTitle = name.replace(/-/g, ' ').trim().toLowerCase();
    const where = {
      [Op.and]: [
        Policy.sequelize.where(
          Policy.sequelize.fn('LOWER', Policy.sequelize.col('title')),
          { [Op.like]: `%${searchTitle}%` }
        )
      ]
    };
    if (req.brand && req.brand.id) where.brand_id = req.brand.id;

    const policy = await Policy.findOne({ where });
    if (!policy) return res.status(404).json({ error: 'Policy not found' });
    res.json(policy);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
