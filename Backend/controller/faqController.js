const { Faq } = require('../model/faqModel.js');
const { Op } = require('sequelize');
const { logger } = require('../config/logging.js');

// Whitelist of allowed attachment types so callers can't sneak in arbitrary strings.
const ATTACH_TYPES = ['global', 'product', 'category', 'page'];

function normaliseAttach(body) {
  const type = ATTACH_TYPES.includes(body.attached_to_type) ? body.attached_to_type : 'global';
  let attached_to_id = null;
  let attached_to_slug = null;
  if (type === 'product' || type === 'category') {
    const idNum = parseInt(body.attached_to_id, 10);
    attached_to_id = Number.isFinite(idNum) && idNum > 0 ? idNum : null;
  } else if (type === 'page') {
    attached_to_slug = (body.attached_to_slug || '').toString().trim().slice(0, 120) || null;
  }
  return { attached_to_type: type, attached_to_id, attached_to_slug };
}

// ── Public ──────────────────────────────────────────────────────────────────

/**
 * GET /api/public/faqs?type=global
 * GET /api/public/faqs?type=product&id=42
 * GET /api/public/faqs?type=page&slug=about
 *
 * Returns active FAQs in display_order. No auth.
 */
module.exports.getPublicFaqs = async (req, res) => {
  try {
    const brandId = parseInt(req.query.brand_id, 10) || 1;
    const type = ATTACH_TYPES.includes(req.query.type) ? req.query.type : 'global';
    const where = { brand_id: brandId, attached_to_type: type, is_active: true };

    if (type === 'product' || type === 'category') {
      const id = parseInt(req.query.id, 10);
      if (!Number.isFinite(id)) return res.json({ success: true, faqs: [] });
      where.attached_to_id = id;
    } else if (type === 'page') {
      const slug = (req.query.slug || '').toString().trim();
      if (!slug) return res.json({ success: true, faqs: [] });
      where.attached_to_slug = slug;
    }

    const rows = await Faq.findAll({
      where,
      order: [['display_order', 'ASC'], ['id', 'ASC']],
      attributes: ['id', 'question', 'answer', 'display_order'],
    });
    res.set('Cache-Control', 'public, max-age=300, s-maxage=600, stale-while-revalidate=600');
    return res.json({ success: true, faqs: rows });
  } catch (err) {
    logger.error('getPublicFaqs failed:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

// ── Admin ───────────────────────────────────────────────────────────────────

module.exports.listFaqs = async (req, res) => {
  try {
    const brandId = parseInt(req.query.brand_id, 10) || 1;
    const where = { brand_id: brandId };
    if (ATTACH_TYPES.includes(req.query.type)) where.attached_to_type = req.query.type;
    if (req.query.id) {
      const id = parseInt(req.query.id, 10);
      if (Number.isFinite(id)) where.attached_to_id = id;
    }
    if (req.query.slug) where.attached_to_slug = req.query.slug;
    if (req.query.search) {
      where[Op.or] = [
        { question: { [Op.like]: `%${req.query.search}%` } },
        { answer: { [Op.like]: `%${req.query.search}%` } },
      ];
    }
    const rows = await Faq.findAll({
      where,
      order: [
        ['attached_to_type', 'ASC'],
        ['attached_to_id', 'ASC'],
        ['display_order', 'ASC'],
        ['id', 'ASC'],
      ],
    });
    return res.json({ success: true, faqs: rows });
  } catch (err) {
    logger.error('listFaqs failed:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports.createFaq = async (req, res) => {
  try {
    const brandId = parseInt(req.body.brand_id, 10) || 1;
    const question = (req.body.question || '').toString().trim();
    const answer = (req.body.answer || '').toString().trim();
    if (!question || !answer) {
      return res.status(400).json({ success: false, message: 'question and answer are required' });
    }
    const attach = normaliseAttach(req.body);
    const display_order = Number.isFinite(parseInt(req.body.display_order, 10))
      ? parseInt(req.body.display_order, 10)
      : await nextOrder(brandId, attach);
    const is_active = req.body.is_active !== false && req.body.is_active !== 'false';

    const row = await Faq.create({
      brand_id: brandId,
      question,
      answer,
      display_order,
      is_active,
      ...attach,
    });
    return res.status(201).json({ success: true, faq: row });
  } catch (err) {
    logger.error('createFaq failed:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports.updateFaq = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const row = await Faq.findByPk(id);
    if (!row) return res.status(404).json({ success: false, message: 'FAQ not found' });

    const patch = {};
    if (typeof req.body.question === 'string') patch.question = req.body.question.trim();
    if (typeof req.body.answer === 'string') patch.answer = req.body.answer.trim();
    if (typeof req.body.is_active === 'boolean') patch.is_active = req.body.is_active;
    if (req.body.is_active === 'true' || req.body.is_active === 'false') patch.is_active = req.body.is_active === 'true';
    if (Number.isFinite(parseInt(req.body.display_order, 10))) {
      patch.display_order = parseInt(req.body.display_order, 10);
    }
    if (req.body.attached_to_type) {
      Object.assign(patch, normaliseAttach(req.body));
    }
    await row.update(patch);
    return res.json({ success: true, faq: row });
  } catch (err) {
    logger.error('updateFaq failed:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

module.exports.deleteFaq = async (req, res) => {
  try {
    const id = parseInt(req.params.id, 10);
    const row = await Faq.findByPk(id);
    if (!row) return res.status(404).json({ success: false, message: 'FAQ not found' });
    await row.destroy();
    return res.json({ success: true });
  } catch (err) {
    logger.error('deleteFaq failed:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

/**
 * POST /api/admin/faqs/reorder
 * Body: { order: [{id, display_order}, ...] }
 * Atomically applies the new display_order to each id.
 */
module.exports.reorderFaqs = async (req, res) => {
  try {
    const items = Array.isArray(req.body.order) ? req.body.order : [];
    await Promise.all(items
      .filter(i => Number.isFinite(parseInt(i.id, 10)) && Number.isFinite(parseInt(i.display_order, 10)))
      .map(i => Faq.update(
        { display_order: parseInt(i.display_order, 10) },
        { where: { id: parseInt(i.id, 10) } },
      )));
    return res.json({ success: true, updated: items.length });
  } catch (err) {
    logger.error('reorderFaqs failed:', err.message);
    return res.status(500).json({ success: false, message: err.message });
  }
};

async function nextOrder(brandId, attach) {
  const where = {
    brand_id: brandId,
    attached_to_type: attach.attached_to_type,
  };
  if (attach.attached_to_id != null) where.attached_to_id = attach.attached_to_id;
  if (attach.attached_to_slug) where.attached_to_slug = attach.attached_to_slug;
  const max = await Faq.max('display_order', { where });
  return (Number.isFinite(max) ? max : -1) + 1;
}
