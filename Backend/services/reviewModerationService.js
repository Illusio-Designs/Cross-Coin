// Review moderation queries for the admin Reviews page.
//
// One list call returns everything the page needs: the page of review cards
// (with photos, product + brand names and a computed "bought it" flag), the
// count per tab from ONE grouped query, the true average rating of approved
// reviews, and how many review-request WhatsApps went out today.
//
// Brand: a review's effective brand is reviews.brandId, falling back to the
// product's brand_id for older rows that were saved without one.
const { QueryTypes } = require('sequelize');
const { sequelize } = require('../config/db.js');
const imagekitService = require('./imagekitService.js');
const { logger } = require('../config/logging.js');

const TABS = ['pending', 'approved', 'rejected', 'photos'];
const BRAND_SQL = 'COALESCE(r.brandId, p.brand_id)';

// ── Lazy schema: an index for "status tab, newest first" paging ──────────────
let schemaPromise = null;
function ensureSchema() {
  if (!schemaPromise) {
    schemaPromise = (async () => {
      const [row] = await sequelize.query(
        `SELECT COUNT(*) AS n FROM information_schema.STATISTICS
          WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = 'reviews' AND INDEX_NAME = 'idx_reviews_status_created'`,
        { type: QueryTypes.SELECT });
      if (!Number(row?.n)) {
        await sequelize.query('ALTER TABLE reviews ADD INDEX idx_reviews_status_created (status, createdAt)');
        logger.info('[reviews] added index idx_reviews_status_created');
      }
    })().catch((e) => logger.warn(`[reviews] ensureSchema skipped: ${e.message}`));
  }
  return schemaPromise;
}

const parseBrandId = (v) => {
  const n = parseInt(v, 10);
  return Number.isInteger(n) && n > 0 ? n : null;
};

const likeEscape = (s) => String(s).replace(/[\\%_]/g, (c) => `\\${c}`);

// WHERE fragments shared by the list and the counts.
function baseFilter({ brandId, search }) {
  const parts = [];
  const repl = {};
  if (brandId) { parts.push(`${BRAND_SQL} = :brandId`); repl.brandId = brandId; }
  const q = String(search || '').trim().slice(0, 100);
  if (q) {
    parts.push(`(r.review LIKE :q OR r.guestName LIKE :q OR r.guestEmail LIKE :q OR u.username LIKE :q OR p.name LIKE :q)`);
    repl.q = `%${likeEscape(q)}%`;
  }
  return { parts, repl };
}

const FROM = `FROM reviews r
  LEFT JOIN products p ON p.id = r.productId
  LEFT JOIN users u ON u.id = r.userId`;
const HAS_MEDIA = 'EXISTS (SELECT 1 FROM review_images ri WHERE ri.reviewId = r.id)';

// Review ids (of `ids`) whose writer has a DELIVERED order containing that
// product: same account (userId), or — for reviews left from the storefront
// form, which only carry name + email — an account or guest checkout with the
// same email. Reviews have no phone, so phone matching isn't possible.
async function boughtIds(ids, { transaction } = {}) {
  if (!ids || !ids.length) return [];
  const rows = await sequelize.query(
    `SELECT r.id FROM reviews r
      WHERE r.id IN (:ids) AND EXISTS (
        SELECT 1 FROM order_items oi JOIN orders o ON o.id = oi.order_id
         WHERE oi.product_id = r.productId AND o.status = 'delivered'
           AND (
             (r.userId IS NOT NULL AND o.user_id = r.userId)
             OR (r.guestEmail IS NOT NULL AND r.guestEmail <> '' AND (
                  o.user_id IN (SELECT us.id FROM users us WHERE us.email = r.guestEmail)
                  OR o.guest_user_id IN (SELECT g.id FROM guest_users g WHERE g.email = r.guestEmail)))
           ))`,
    { replacements: { ids }, type: QueryTypes.SELECT, transaction });
  return rows.map((x) => x.id);
}

// Photo / video URLs. ImageKit paths get a thumbnail + large transform; a bare
// filename is a local fallback upload served from /api/uploads/reviews.
function mediaUrls(img) {
  const f = String(img.fileName || '');
  if (!f) return { thumb: null, full: null };
  if (!/^https?:\/\//i.test(f) && !f.startsWith('/')) {
    const local = `/api/uploads/reviews/${encodeURIComponent(f)}`;
    return { thumb: local, full: local };
  }
  if (img.fileType === 'video') {
    const ep = process.env.IMAGEKIT_URL_ENDPOINT || '';
    return { thumb: null, full: /^https?:\/\//i.test(f) ? f : `${ep}${f}` };
  }
  return { thumb: imagekitService.getOptimizedUrl(f, 'thumbnail'), full: imagekitService.getOptimizedUrl(f, 'large') };
}

// Start of today in India, as a UTC Date (DATETIMEs are stored in UTC).
function istMidnightUtc(now = new Date()) {
  const IST = 330 * 60000;
  const d = new Date(now.getTime() + IST);
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()) - IST);
}

// Review-request WhatsApps sent today. The 10 AM job sends through
// whatsappService.sendReviewRequest, which saves every send (and failure) to
// whatsapp_messages tagged automation_key = 'review_request'.
async function reviewRequestsToday(brandId) {
  try {
    const repl = { since: istMidnightUtc() };
    let brandSql = '';
    if (brandId) { brandSql = ' AND c.brand_id = :brandId'; repl.brandId = brandId; }
    const [row] = await sequelize.query(
      `SELECT COALESCE(SUM(m.status <> 'failed'), 0) AS sent, COALESCE(SUM(m.status = 'failed'), 0) AS failed
         FROM whatsapp_messages m JOIN whatsapp_conversations c ON c.id = m.conversation_id
        WHERE m.automation_key = 'review_request' AND m.direction = 'outbound' AND m.sent_at >= :since${brandSql}`,
      { replacements: repl, type: QueryTypes.SELECT });
    let enabled = null;
    try {
      // eslint-disable-next-line global-require
      enabled = await require('./whatsappService.js').isAutomationEnabled('review_request');
    } catch (_) { /* switch unknown — leave null */ }
    return { sent: Number(row.sent) || 0, failed: Number(row.failed) || 0, enabled, runsAt: '10:00' };
  } catch (e) {
    logger.warn(`[reviews] review-request count unavailable: ${e.message}`);
    return null;
  }
}

async function listForModeration({ tab = 'pending', brandId: rawBrand, search, page = 1, limit = 20 } = {}) {
  await ensureSchema();
  const t = TABS.includes(tab) ? tab : 'pending';
  const brandId = parseBrandId(rawBrand);
  const lim = Math.min(Math.max(parseInt(limit, 10) || 20, 1), 100);
  const pg = Math.max(parseInt(page, 10) || 1, 1);
  const { parts, repl } = baseFilter({ brandId, search });
  const whereBase = parts.length ? `WHERE ${parts.join(' AND ')}` : '';

  // 1) Counts per status + "with photos" + average rating, one grouped query.
  const grouped = await sequelize.query(
    `SELECT r.status, COUNT(*) AS n, SUM(${HAS_MEDIA}) AS photos, AVG(r.rating) AS avg ${FROM} ${whereBase} GROUP BY r.status`,
    { replacements: repl, type: QueryTypes.SELECT });
  const counts = { pending: 0, approved: 0, rejected: 0, photos: 0 };
  let approvedAvg = null; let approvedN = 0;
  grouped.forEach((g) => {
    if (g.status in counts) counts[g.status] = Number(g.n) || 0;
    counts.photos += Number(g.photos) || 0;
    if (g.status === 'approved') { approvedAvg = g.avg; approvedN = Number(g.n) || 0; }
  });
  // The headline average ignores the search box: re-query only when searching.
  if (repl.q) {
    const b = baseFilter({ brandId, search: '' });
    const [row] = await sequelize.query(
      `SELECT AVG(r.rating) AS avg, COUNT(*) AS n ${FROM} WHERE r.status = 'approved'${b.parts.length ? ` AND ${b.parts.join(' AND ')}` : ''}`,
      { replacements: b.repl, type: QueryTypes.SELECT });
    approvedAvg = row?.avg; approvedN = Number(row?.n) || 0;
  }

  // 2) The page of reviews for the chosen tab.
  const tabSql = t === 'photos' ? HAS_MEDIA : 'r.status = :tab';
  const where = `WHERE ${[tabSql, ...parts].join(' AND ')}`;
  const total = counts[t];
  const rows = total === 0 ? [] : await sequelize.query(
    `SELECT r.id, r.productId, r.userId, r.guestName, r.guestEmail, r.rating, r.review, r.status,
            r.verified_purchase, r.is_featured, r.admin_notes, r.brandId, r.createdAt, r.updatedAt,
            p.name AS productName, p.slug AS productSlug, u.username AS userName,
            b.id AS effBrandId, COALESCE(b.display_name, b.name) AS brandName
       ${FROM}
       LEFT JOIN brands b ON b.id = ${BRAND_SQL}
       ${where}
      ORDER BY r.createdAt DESC, r.id DESC
      LIMIT :limit OFFSET :offset`,
    { replacements: { ...repl, tab: t, limit: lim, offset: (pg - 1) * lim }, type: QueryTypes.SELECT });

  // 3) Photos + "bought it" for just this page.
  const ids = rows.map((r) => r.id);
  const [images, bought] = await Promise.all([
    ids.length ? sequelize.query(
      'SELECT id, reviewId, fileName, fileType FROM review_images WHERE reviewId IN (:ids) ORDER BY id',
      { replacements: { ids }, type: QueryTypes.SELECT }) : [],
    boughtIds(ids),
  ]);
  const boughtSet = new Set(bought);
  const imgBy = new Map();
  images.forEach((img) => {
    const list = imgBy.get(img.reviewId) || [];
    list.push({ id: img.id, fileType: img.fileType, ...mediaUrls(img) });
    imgBy.set(img.reviewId, list);
  });

  const reviews = rows.map((r) => ({
    id: r.id,
    productId: r.productId,
    productName: r.productName || 'Deleted product',
    productSlug: r.productSlug || null,
    brandId: r.effBrandId || null,
    brandName: r.brandName || null,
    customerName: r.userName || r.guestName || 'Guest',
    guestEmail: r.guestEmail || null,
    isAccount: !!r.userId,
    rating: Number(r.rating) || 0,
    review: r.review || '',
    status: r.status,
    is_featured: !!r.is_featured,
    admin_notes: r.admin_notes || '',
    boughtIt: boughtSet.has(r.id),          // computed from delivered orders
    verified_purchase: !!r.verified_purchase, // stored flag (import sheet / set on approve)
    createdAt: r.createdAt,
    images: imgBy.get(r.id) || [],
  }));

  return {
    success: true,
    tab: t,
    reviews,
    pagination: { total, page: pg, limit: lim, totalPages: Math.ceil(total / lim) },
    counts,
    avgRating: approvedAvg != null ? Math.round(Number(approvedAvg) * 10) / 10 : null,
    approvedTotal: approvedN,
    reviewRequestsToday: await reviewRequestsToday(brandId),
  };
}

module.exports = { ensureSchema, listForModeration, boughtIds, mediaUrls, istMidnightUtc, reviewRequestsToday, TABS };
