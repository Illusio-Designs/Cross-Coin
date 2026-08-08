const { sequelize } = require('../config/db.js');
const { Op, fn, col } = require('sequelize');
const AdSpend = require('../model/adSpendModel.js');
const Brand = require('../model/brandModel.js');
const { getBrandSetting, setBrandSetting } = require('../services/brandSettingsService.js');

// Cost defaults (admin-managed). Product cost is per brand; shipping is global.
const DEFAULT_PRODUCT_COST = 140;
const DEFAULT_SHIPPING_COST = 90;
const SHIPPING_KEY = 'ADS_SHIPPING_COST';
const PRODUCT_KEY = 'ADS_PRODUCT_COST';
const GLOBAL_BRAND = 1; // holder for the global shipping setting

// Ads reporting officially begins on this date — never count before it.
const REPORT_START = '2026-08-04';

const CANCELLED_STATUSES = ['cancelled', 'order cancelled'];
const RTO_STATUSES = ['rto', 'rto delivered', 'returned_rto'];

const num = (v, d = 0) => { const x = parseFloat(v); return Number.isFinite(x) ? x : d; };
// All day boundaries are IST (Asia/Kolkata). created_at is stored UTC, so an IST
// calendar day D → UTC range [D 00:00 IST, D+1 00:00 IST) = [(D-1) 18:30 UTC, D 18:30 UTC).
const istDateStr = (d = new Date()) =>
    new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
const istMidnightToUtc = (dateStr) =>
    new Date(dateStr + 'T00:00:00+05:30').toISOString().slice(0, 19).replace('T', ' ');
const addDays = (dateStr, n) => {
    const d = new Date(dateStr + 'T00:00:00Z');
    d.setUTCDate(d.getUTCDate() + n);
    return d.toISOString().slice(0, 10);
};

/* ── Cost settings ───────────────────────────────────────────────── */
async function getCostSettings() {
    const shipping = num(await getBrandSetting(GLOBAL_BRAND, SHIPPING_KEY, false), DEFAULT_SHIPPING_COST);
    const brands = await Brand.findAll({ attributes: ['id'], raw: true });
    const productCost = {};
    for (const b of brands) {
        productCost[b.id] = num(await getBrandSetting(b.id, PRODUCT_KEY, false), DEFAULT_PRODUCT_COST);
    }
    return { shipping, productCost };
}

exports.getSettings = async (req, res) => {
    try {
        res.json({ success: true, ...(await getCostSettings()) });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

exports.saveSettings = async (req, res) => {
    try {
        const { shipping, productCost } = req.body || {};
        const by = req.user?.id || null;
        if (shipping !== undefined) {
            await setBrandSetting(GLOBAL_BRAND, SHIPPING_KEY, String(num(shipping, DEFAULT_SHIPPING_COST)), false, 'ads', 'Ads report shipping cost/order', by);
        }
        if (productCost && typeof productCost === 'object') {
            for (const [brandId, cost] of Object.entries(productCost)) {
                await setBrandSetting(Number(brandId), PRODUCT_KEY, String(num(cost, DEFAULT_PRODUCT_COST)), false, 'ads', 'Ads report product cost/order', by);
            }
        }
        res.json({ success: true, ...(await getCostSettings()) });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

/* ── Daily ad spend records ──────────────────────────────────────── */
// GET /spend?brand_id=&from=&to=
exports.getSpend = async (req, res) => {
    try {
        const where = {};
        if (req.query.brand_id) where.brand_id = Number(req.query.brand_id);
        if (req.query.from && req.query.to) where.date = { [Op.between]: [req.query.from, req.query.to] };
        const rows = await AdSpend.findAll({ where, order: [['date', 'DESC']], raw: true });
        res.json({ success: true, spend: rows });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

// POST /spend  { entries: [{ brand_id, date, amount }] }  — upsert per (brand, date)
exports.saveSpend = async (req, res) => {
    try {
        const entries = Array.isArray(req.body?.entries) ? req.body.entries
            : (req.body?.brand_id ? [req.body] : []);
        if (!entries.length) return res.status(400).json({ success: false, message: 'No entries' });
        for (const e of entries) {
            if (!e.brand_id || !e.date) continue;
            if (e.date < REPORT_START) continue; // no spend before the reporting start
            await AdSpend.upsert({ brand_id: Number(e.brand_id), date: e.date, amount: num(e.amount) });
        }
        res.json({ success: true, saved: entries.length });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

// DELETE /spend/:id
exports.deleteSpend = async (req, res) => {
    try {
        await AdSpend.destroy({ where: { id: Number(req.params.id) } });
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

/* ── Meta (Facebook) ad-spend sync ───────────────────────────────── */
const metaAdsService = require('../services/metaAdsService.js');
const META_ACCOUNT_KEY = 'META_AD_ACCOUNT_ID';

// GET /meta/config — per-brand Meta ad-account id + whether a token resolves.
exports.getMetaConfig = async (req, res) => {
    try {
        const brands = await Brand.findAll({ attributes: ['id', 'name', 'display_name'], raw: true });
        const config = [];
        for (const b of brands) {
            const adAccountId = await metaAdsService.resolveAdAccountId(b.id);
            const token = await metaAdsService.resolveToken(b.id);
            config.push({
                brand_id: b.id,
                brand: b.display_name || b.name,
                ad_account_id: adAccountId || '',
                hasToken: !!token,
            });
        }
        res.json({ success: true, config });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

// POST /meta/config  { config: [{ brand_id, ad_account_id }] } — upsert per brand.
exports.saveMetaConfig = async (req, res) => {
    try {
        const entries = Array.isArray(req.body?.config) ? req.body.config : [];
        const by = req.user?.id || null;
        for (const e of entries) {
            if (!e.brand_id) continue;
            // Strip an "act_" prefix if the admin pasted the full account id.
            const val = String(e.ad_account_id ?? '').trim().replace(/^act_/i, '');
            await setBrandSetting(Number(e.brand_id), META_ACCOUNT_KEY, val, false, 'ads', 'Meta ad account id for spend sync', by);
        }
        res.json({ success: true });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

// POST /meta/sync  { from?, to?, brand_id? } — pull daily spend from Meta into
// ad_spends. One brand when brand_id is given, else every configured brand.
exports.syncMetaSpend = async (req, res) => {
    try {
        const { from, to, brand_id } = req.body || {};
        const results = brand_id
            ? [await metaAdsService.syncBrandSpend(Number(brand_id), from, to)]
            : await metaAdsService.syncAllBrandsSpend(from, to);
        const synced = results.filter((r) => !r.error && !r.skipped);
        const failed = results.filter((r) => r.error);
        res.json({
            success: true,
            results,
            summary: {
                brands: results.length,
                synced: synced.length,
                failed: failed.length,
                totalSpend: Math.round(synced.reduce((a, r) => a + (r.total || 0), 0) * 100) / 100,
            },
        });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};

/* ── Report (computed server-side) ───────────────────────────────── */
// GET /report?from=&to=
exports.getReport = async (req, res) => {
    try {
        // Only completed IST days count — cap `to` at yesterday (today's orders
        // are still coming in, so a partial day would understate the report).
        const yesterday = addDays(istDateStr(), -1);
        let to = req.query.to || yesterday;
        if (to > yesterday) to = yesterday;
        let from = req.query.from || REPORT_START;
        if (from < REPORT_START) from = REPORT_START; // clamp: reporting starts 2026-08-04
        // Exclusive upper bound at IST midnight of the day after `to`, in UTC.
        const toEnd = istMidnightToUtc(addDays(to, 1));

        const { shipping, productCost } = await getCostSettings();
        const brands = await Brand.findAll({ attributes: ['id', 'name', 'display_name'], raw: true });

        // Ad spend per brand within [from, to]: sum + first spend date.
        const spendAgg = await AdSpend.findAll({
            attributes: ['brand_id', [fn('SUM', col('amount')), 'spend'], [fn('MIN', col('date')), 'firstDate']],
            where: { date: { [Op.between]: [from, to] } },
            group: ['brand_id'],
            raw: true,
        });
        const spendByBrand = {};
        spendAgg.forEach((r) => { spendByBrand[r.brand_id] = { spend: num(r.spend), firstDate: r.firstDate }; });

        const rows = [];
        for (const b of brands) {
            const s = spendByBrand[b.id];
            const adSpend = s ? s.spend : 0;
            // Each brand's window starts at its first ad-spend day (matches the
            // sheet), but never before the fixed reporting start.
            let brandFrom = s?.firstDate || from;
            if (brandFrom < REPORT_START) brandFrom = REPORT_START;
            const fromUtc = istMidnightToUtc(brandFrom); // IST day start → UTC

            const [agg] = await sequelize.query(
                `SELECT
                    COUNT(*) AS total,
                    COALESCE(SUM(final_amount),0) AS revenue,
                    COALESCE(SUM(payment_type <> 'cod'),0) AS prepaid,
                    COALESCE(SUM(payment_type = 'cod'),0) AS cod,
                    COALESCE(SUM(status IN (:canc)),0) AS cancelled,
                    COALESCE(SUM(status IN (:rto)),0) AS rto
                 FROM orders
                 WHERE brand_id = :brandId AND created_at >= :fromUtc AND created_at < :toEnd`,
                { replacements: { brandId: b.id, fromUtc, toEnd, canc: CANCELLED_STATUSES, rto: RTO_STATUSES }, type: sequelize.QueryTypes.SELECT }
            );

            const total = num(agg.total);
            const revenue = num(agg.revenue);
            const prepaid = num(agg.prepaid);
            const cod = num(agg.cod);
            const cancelled = num(agg.cancelled);
            const rto = num(agg.rto);
            const pc = num(productCost[b.id], DEFAULT_PRODUCT_COST);

            const days = s ? (Math.round((new Date(to) - new Date(brandFrom)) / 86400000) + 1) : 0;
            const cpp = total ? adSpend / total : 0;
            const roas = adSpend ? revenue / adSpend : 0;
            const aov = total ? revenue / total : 0;
            const pdo = days ? total / days : 0;
            const por = total ? prepaid / total : 0;
            const cor = total ? cod / total : 0;
            const cancLoss = cancelled * cpp;                 // cancelled: CPP only
            const rtoLoss = rto * (cpp + shipping);           // RTO: CPP + shipping
            // GP per order = AOV − CPP − product − shipping, × total orders of the period.
            const gp = (aov - cpp - pc - shipping) * total;
            const np = gp - cancLoss - rtoLoss;

            rows.push({
                brand_id: b.id,
                brand: b.display_name || b.name,
                from: s ? brandFrom : null,
                to,
                hasSpend: !!s,
                days,
                totalOrders: total, revenue, adSpend,
                prepaid, cod, cancelled, rto,
                productCost: pc, shippingCost: shipping,
                cpp, roas, aov, pdo, por, cor,
                gp, cancLoss, rtoLoss, np,
                cancPct: total ? cancelled / total : 0,
                rtoPct: total ? rto / total : 0,
                ado: days ? total / days : 0,
                adr: days ? revenue / days : 0,
                adnp: days ? np / days : 0,
                opPct: revenue ? np / revenue : 0,
            });
        }

        res.json({ success: true, from, to, shipping, rows });
    } catch (e) {
        res.status(500).json({ success: false, message: e.message });
    }
};
