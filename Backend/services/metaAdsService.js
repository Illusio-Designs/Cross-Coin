const axios = require('axios');
const AdSpend = require('../model/adSpendModel.js');
const Brand = require('../model/brandModel.js');
const settingsHelper = require('./settingsHelper');

/**
 * Meta (Facebook) ad-spend sync.
 *
 * Pulls daily spend from the Meta Marketing API "insights" edge and upserts it
 * into the ad_spends table (brand_id, date, amount) — the same table the Ads
 * Reporting page already reads, so no downstream math changes. Replaces the
 * manual daily spend entry with a one-click / scheduled pull.
 *
 * Config (per brand, stored in brand_settings — same place as the Pixel keys):
 *   META_AD_ACCOUNT_ID  → the ad account behind this brand (numeric, no "act_")
 *   FB_ACCESS_TOKEN     → reused from the Conversions API; MUST carry `ads_read`
 *                         and have access to the ad account, else the pull 403s.
 * Fallback token: env META_ADS_ACCESS_TOKEN, then env FB_ACCESS_TOKEN — lets you
 * drop in a never-expiring System User token later without touching per-brand
 * settings.
 */

const GRAPH_VERSION = process.env.META_GRAPH_VERSION || 'v22.0';
// Reporting officially starts here — never pull spend before it (matches
// adsReportController.REPORT_START).
const REPORT_START = '2026-08-04';

const num = (v, d = 0) => { const x = parseFloat(v); return Number.isFinite(x) ? x : d; };

// All day boundaries are IST (Asia/Kolkata), aligned with the report cut-off.
const istDateStr = (d = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);

/** Resolve the ad account id configured for a brand (numeric, "act_" stripped). */
async function resolveAdAccountId(brandId) {
  const raw = await settingsHelper.getSetting(brandId, 'META_AD_ACCOUNT_ID');
  if (!raw) return null;
  return String(raw).trim().replace(/^act_/i, '');
}

/** Resolve the access token: brand FB token → env override → env FB token. */
async function resolveToken(brandId) {
  const brandToken = await settingsHelper.getSetting(brandId, 'FB_ACCESS_TOKEN');
  if (brandToken && brandToken !== 'YOUR_ACCESS_TOKEN') return brandToken;
  return process.env.META_ADS_ACCESS_TOKEN || process.env.FB_ACCESS_TOKEN || null;
}

/**
 * Fetch daily spend rows for one ad account over [since, until] (inclusive,
 * YYYY-MM-DD). Returns [{ date, spend }]. Follows paging so long ranges are
 * complete. Throws with the Graph API's own error message on failure.
 */
async function fetchDailySpend(adAccountId, token, since, until) {
  const rows = [];
  let url = `https://graph.facebook.com/${GRAPH_VERSION}/act_${adAccountId}/insights`;
  let params = {
    fields: 'spend',
    level: 'account',
    time_increment: 1,
    time_range: JSON.stringify({ since, until }),
    limit: 500,
    access_token: token,
  };
  // Follow paging.next (a fully-formed URL) until exhausted.
  for (let guard = 0; guard < 50; guard++) {
    let res;
    try {
      res = await axios.get(url, { params, timeout: 30000 });
    } catch (e) {
      const apiErr = e.response?.data?.error;
      const msg = apiErr?.message || e.message || 'Meta API request failed';
      const err = new Error(msg);
      err.code = apiErr?.code;
      throw err;
    }
    const data = res.data?.data || [];
    for (const r of data) {
      // With time_increment=1, date_start === date_stop === that day.
      rows.push({ date: r.date_start, spend: num(r.spend) });
    }
    const next = res.data?.paging?.next;
    if (!next) break;
    url = next;
    params = undefined; // the next URL already carries all query params
  }
  return rows;
}

/**
 * Sync one brand's spend into ad_spends for [from, to]. This is a MANUAL,
 * on-demand fetch — whatever Meta reports at fetch time is what we store, so
 * the current (running) day IS included and its partial spend lands too.
 * Clamps only the lower bound to REPORT_START and the upper bound to today IST.
 * Returns a per-brand summary object (never throws — errors go on `error`).
 */
async function syncBrandSpend(brandId, from, to) {
  const brand = await Brand.findByPk(brandId, { attributes: ['id', 'name', 'display_name'], raw: true });
  const label = brand?.display_name || brand?.name || `Brand ${brandId}`;
  const base = { brand_id: brandId, brand: label };

  const todayIst = istDateStr();
  let start = from || REPORT_START;
  if (start < REPORT_START) start = REPORT_START;
  let end = to || todayIst;
  if (end > todayIst) end = todayIst; // can't fetch the future
  if (start > end) return { ...base, skipped: true, reason: 'Nothing to sync (date window empty)' };

  const adAccountId = await resolveAdAccountId(brandId);
  if (!adAccountId) return { ...base, skipped: true, reason: 'No Meta ad account configured' };

  const token = await resolveToken(brandId);
  if (!token) return { ...base, error: 'No access token available (set FB_ACCESS_TOKEN or META_ADS_ACCESS_TOKEN)' };

  try {
    const rows = await fetchDailySpend(adAccountId, token, start, end);
    let days = 0, total = 0;
    for (const r of rows) {
      if (!r.date || r.date < REPORT_START) continue;
      await AdSpend.upsert({ brand_id: brandId, date: r.date, amount: num(r.spend) });
      days += 1;
      total += num(r.spend);
    }
    return { ...base, ad_account_id: adAccountId, from: start, to: end, days, total: Math.round(total * 100) / 100 };
  } catch (e) {
    // Common cause: the reused FB token lacks the `ads_read` scope / access.
    return { ...base, ad_account_id: adAccountId, error: e.message };
  }
}

/** Sync every brand that has a Meta ad account configured. */
async function syncAllBrandsSpend(from, to) {
  const brands = await Brand.findAll({ attributes: ['id'], raw: true });
  const results = [];
  for (const b of brands) {
    results.push(await syncBrandSpend(b.id, from, to));
  }
  return results;
}

module.exports = {
  fetchDailySpend,
  syncBrandSpend,
  syncAllBrandsSpend,
  resolveAdAccountId,
  resolveToken,
  REPORT_START,
};
