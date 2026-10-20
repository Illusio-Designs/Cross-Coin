// Orders by location — GET /api/reports/location
//
// Where orders ship to (the order's shipping address), by state → city →
// pincode, with COD share, delivery, RTO and return rates for each place.
//
// Rules (the same as the Reports overview, salesReportService.js):
//   orders      placed in the range, cancelled left out (PLACED_SQL)
//   delivered   reached the customer, incl. ones later returned (STAGE_SQL)
//   RTO         courier return; a customer return is NOT an RTO
//   net sales   delivered value − refunds on those orders
//   AOV         net sales ÷ delivered orders
//   delivered % / RTO %   over closed shipments (delivered + RTO)
//   return %    customer returns ÷ delivered
//   days        order placed → first 'delivered' row in order_status_history
//               (null when no delivered order has that row)
//
// Place names are normalised (trimmed, case-folded, common spellings merged)
// so "maharashtra " and "Maharashtra", or "Bangalore" and "Bengaluru", are one
// row. SQL returns additive sums per raw (state, city); merging and the rates
// are done here.
//
// Params: startDate, endDate, brandId, pay (all|cod|prepaid),
//         level (state|city|pincode), state, city (keys from this response).

const { QueryTypes } = require('sequelize');
const { sequelize } = require('../../config/db.js');
const { logger } = require('../../config/logging.js');
const { parseRange, brandOf, PLACED_SQL } = require('./common.js');
const { STAGE_SQL, JOINS, REFUND_SQL } = require('../salesReportService.js');

const LIST_LIMIT = 50;            // rows shown before "Other N …"
const RTO_CITY_MIN_ORDERS = 10;   // highest-RTO city needs at least this many orders
const RISK_RTO = 30;              // pincode flag: RTO % at or above…
const RISK_MIN_ORDERS = 3;        // …with at least this many orders

// ── Name normalisation ──────────────────────────────────────────────────────
const UNKNOWN = 'unknown';
const JUNK = new Set(['', 'na', 'n/a', 'n.a', 'null', 'undefined', 'none', '-', '--', '.', '0', 'nil', 'unknown', 'state', 'city', 'select state', 'select city']);

const STATE_ALIASES = {
  // ISO-style short codes people type
  an: 'andaman and nicobar islands', ap: 'andhra pradesh', ar: 'arunachal pradesh', as: 'assam', br: 'bihar',
  ch: 'chandigarh', cg: 'chhattisgarh', ct: 'chhattisgarh', dl: 'delhi', ga: 'goa', gj: 'gujarat', hr: 'haryana',
  hp: 'himachal pradesh', jk: 'jammu and kashmir', jh: 'jharkhand', ka: 'karnataka', kl: 'kerala', la: 'ladakh',
  ld: 'lakshadweep', mp: 'madhya pradesh', mh: 'maharashtra', mn: 'manipur', ml: 'meghalaya', mz: 'mizoram',
  nl: 'nagaland', od: 'odisha', or: 'odisha', py: 'puducherry', pb: 'punjab', rj: 'rajasthan', sk: 'sikkim',
  tn: 'tamil nadu', ts: 'telangana', tg: 'telangana', tr: 'tripura', up: 'uttar pradesh', uk: 'uttarakhand',
  ut: 'uttarakhand', wb: 'west bengal',
  // old names and common misspellings
  orissa: 'odisha', pondicherry: 'puducherry', pondy: 'puducherry', uttaranchal: 'uttarakhand',
  'new delhi': 'delhi', 'nct of delhi': 'delhi', 'delhi ncr': 'delhi', 'national capital territory of delhi': 'delhi',
  telengana: 'telangana', telagana: 'telangana', chattisgarh: 'chhattisgarh', chhatisgarh: 'chhattisgarh',
  chattishgarh: 'chhattisgarh', tamilnadu: 'tamil nadu', 'tamil nadu state': 'tamil nadu', maharastra: 'maharashtra',
  maharshtra: 'maharashtra', maharashtar: 'maharashtra', 'utter pradesh': 'uttar pradesh', 'uttar pardesh': 'uttar pradesh',
  uttarpradesh: 'uttar pradesh', 'madhya pardesh': 'madhya pradesh', madhyapradesh: 'madhya pradesh',
  'andhra pardesh': 'andhra pradesh', andhrapradesh: 'andhra pradesh', 'himachal pardesh': 'himachal pradesh',
  westbengal: 'west bengal', 'west bangal': 'west bengal', karnatka: 'karnataka', gujrat: 'gujarat',
  rajastan: 'rajasthan', 'jammu kashmir': 'jammu and kashmir', 'j and k': 'jammu and kashmir',
  'andaman and nicobar': 'andaman and nicobar islands', 'andaman nicobar': 'andaman and nicobar islands',
  'dadra and nagar haveli': 'dadra and nagar haveli and daman and diu', 'daman and diu': 'dadra and nagar haveli and daman and diu',
  'dnh and dd': 'dadra and nagar haveli and daman and diu',
};

const CITY_ALIASES = {
  bangalore: 'bengaluru', bengalore: 'bengaluru', banglore: 'bengaluru', 'bangalore urban': 'bengaluru',
  'bengaluru urban': 'bengaluru', 'bangalore rural': 'bengaluru rural',
  bombay: 'mumbai', 'mumbai suburban': 'mumbai', 'mumbai city': 'mumbai', 'greater mumbai': 'mumbai',
  calcutta: 'kolkata', madras: 'chennai',
  'new delhi': 'delhi', 'delhi ncr': 'delhi', 'nct of delhi': 'delhi', 'national capital territory of delhi': 'delhi', 'south delhi': 'delhi', 'north delhi': 'delhi', 'east delhi': 'delhi',
  'west delhi': 'delhi', 'central delhi': 'delhi', 'south west delhi': 'delhi', 'north west delhi': 'delhi',
  'north east delhi': 'delhi', 'south east delhi': 'delhi', 'shahdara': 'delhi',
  gurgaon: 'gurugram', poona: 'pune', baroda: 'vadodara', mysore: 'mysuru', mangalore: 'mangaluru',
  trivandrum: 'thiruvananthapuram', cochin: 'kochi', ernakulam: 'kochi', calicut: 'kozhikode',
  vizag: 'visakhapatnam', visakhapatanam: 'visakhapatnam', vishakhapatnam: 'visakhapatnam', vishakapatnam: 'visakhapatnam',
  visakapatnam: 'visakhapatnam', allahabad: 'prayagraj', banaras: 'varanasi', benares: 'varanasi',
  trichy: 'tiruchirappalli', tiruchirapalli: 'tiruchirappalli', tiruchchirappalli: 'tiruchirappalli',
  hubli: 'hubballi', 'hubli dharwad': 'hubballi', 'hubli-dharwad': 'hubballi', belgaum: 'belagavi', gulbarga: 'kalaburagi',
  bellary: 'ballari', tumkur: 'tumakuru', shimoga: 'shivamogga', pondicherry: 'puducherry', gauhati: 'guwahati',
  simla: 'shimla', jullundur: 'jalandhar', cawnpore: 'kanpur', rajamahendravaram: 'rajahmundry', rajamundry: 'rajahmundry',
  'chhatrapati sambhajinagar': 'aurangabad', 'sambhajinagar': 'aurangabad', 'navi-mumbai': 'navi mumbai',
  'new mumbai': 'navi mumbai', 'pimpri chinchwad': 'pimpri-chinchwad', pimpri: 'pimpri-chinchwad', chinchwad: 'pimpri-chinchwad',
  'gautam buddha nagar': 'noida', 'greater noida west': 'greater noida', 'sas nagar': 'mohali',
  'sahibzada ajit singh nagar': 'mohali', 'vasai virar': 'vasai-virar', vasai: 'vasai-virar', virar: 'vasai-virar',
  'mira bhayandar': 'mira-bhayandar', 'mira road': 'mira-bhayandar', bhayandar: 'mira-bhayandar',
  'kalyan dombivli': 'kalyan', dombivli: 'kalyan', 'ahmadabad': 'ahmedabad', 'amdavad': 'ahmedabad',
  'hydrabad': 'hyderabad', 'hyderbad': 'hyderabad', 'chenai': 'chennai', 'kolkatta': 'kolkata', 'kolkota': 'kolkata',
  'mumbai west': 'mumbai', 'mumbai east': 'mumbai',
};

// Metro = the 8 big cities (+ their common spellings via CITY_ALIASES).
const METRO = new Set(['mumbai', 'delhi', 'bengaluru', 'hyderabad', 'secunderabad', 'chennai', 'kolkata', 'pune', 'ahmedabad']);
// Tier 2 — larger non-metro cities and the big satellite cities of the metros.
const TIER2 = new Set([
  'agra', 'ajmer', 'aligarh', 'amravati', 'amritsar', 'asansol', 'aurangabad', 'bareilly', 'belagavi', 'bhavnagar',
  'bhilai', 'bhiwandi', 'bhopal', 'bhubaneswar', 'bikaner', 'bokaro', 'chandigarh', 'coimbatore', 'cuttack', 'dehradun',
  'dhanbad', 'durgapur', 'erode', 'faridabad', 'firozabad', 'ghaziabad', 'gorakhpur', 'kalaburagi', 'guntur', 'gurugram',
  'guwahati', 'gwalior', 'hubballi', 'indore', 'jabalpur', 'jaipur', 'jalandhar', 'jammu', 'jamnagar', 'jamshedpur',
  'jhansi', 'jodhpur', 'kakinada', 'kannur', 'kanpur', 'kochi', 'kolhapur', 'kollam', 'kota', 'kozhikode',
  'kurnool', 'lucknow', 'ludhiana', 'madurai', 'malappuram', 'mangaluru', 'meerut', 'moradabad', 'mysuru', 'nagpur',
  'nanded', 'nashik', 'navi mumbai', 'nellore', 'noida', 'greater noida', 'patna', 'puducherry', 'prayagraj', 'raipur',
  'rajkot', 'rajahmundry', 'ranchi', 'rourkela', 'salem', 'sangli', 'siliguri', 'solapur', 'srinagar', 'surat',
  'thane', 'thiruvananthapuram', 'thrissur', 'tiruchirappalli', 'tirunelveli', 'tiruppur', 'ujjain', 'vadodara', 'varanasi',
  'vasai-virar', 'vijayawada', 'visakhapatnam', 'warangal', 'vellore', 'mathura', 'howrah', 'gandhinagar', 'mohali',
  'panchkula', 'pimpri-chinchwad', 'kalyan', 'mira-bhayandar', 'udaipur', 'saharanpur', 'muzaffarpur', 'gaya',
  'bhagalpur', 'panipat', 'karnal', 'ahmednagar', 'akola', 'latur', 'davanagere', 'tumakuru', 'shivamogga', 'tirupati',
  'anand', 'bharuch', 'vapi', 'haridwar', 'shimla', 'jalgaon', 'bilaspur', 'patiala', 'bathinda', 'rohtak', 'sonipat',
]);

const SMALL_WORDS = new Set(['and', 'of', 'the']);

function cleanName(raw) {
  let s = String(raw ?? '').toLowerCase();
  s = s.replace(/\([^)]*\)/g, ' ')            // "Mumbai (Maharashtra)"
    .replace(/&/g, ' and ')
    .replace(/[.,;:'"`]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
    .replace(/\s*-\s*/g, '-')
    .replace(/\s+india$/, '')
    .replace(/\s+(district|dist|distt)$/g, '')
    .trim();
  return s;
}

function stateKey(raw) {
  const s = cleanName(raw);
  if (JUNK.has(s)) return UNKNOWN;
  return STATE_ALIASES[s] || STATE_ALIASES[s.replace(/-/g, ' ')] || s;
}

function cityKey(raw) {
  const s = cleanName(raw);
  if (JUNK.has(s)) return UNKNOWN;
  return CITY_ALIASES[s] || CITY_ALIASES[s.replace(/-/g, ' ')] || s;
}

function display(key) {
  if (!key || key === UNKNOWN) return 'Unknown';
  return key.split(' ').map((w, i) => (i > 0 && SMALL_WORDS.has(w) ? w
    : w.split('-').map((p) => (p ? p[0].toUpperCase() + p.slice(1) : p)).join('-'))).join(' ');
}

const tierOf = (cKey) => (METRO.has(cKey) ? 'metro' : TIER2.has(cKey) ? 'tier2' : 'tier3');

// ── Metrics ─────────────────────────────────────────────────────────────────
const num = (v) => Number(v) || 0;
const pct = (a, b) => (b > 0 ? Math.round((a / b) * 1000) / 10 : 0);
const r2 = (v) => Math.round(num(v) * 100) / 100;
const FIELDS = ['orders', 'units', 'placedValue', 'cod', 'delivered', 'returned', 'rto', 'deliveredValue', 'refunds', 'daysSum', 'daysN'];

const blank = () => Object.fromEntries(FIELDS.map((f) => [f, 0]));
function add(into, from) { for (const f of FIELDS) into[f] += num(from[f]); return into; }

// Rates for one place; `base` = orders of the parent (for share %).
function finish(m, base) {
  const closed = m.delivered + m.rto;
  const netSales = r2(m.deliveredValue - m.refunds);
  return {
    orders: m.orders,
    share: pct(m.orders, base),
    units: m.units,
    placedValue: r2(m.placedValue),
    netSales,
    aov: m.delivered ? r2(netSales / m.delivered) : 0,
    cod: m.cod,
    codRate: pct(m.cod, m.orders),
    delivered: m.delivered,
    rto: m.rto,
    returned: m.returned,
    closed,
    deliveredRate: pct(m.delivered, closed),
    rtoRate: pct(m.rto, closed),
    returnRate: pct(m.returned, m.delivered),
    avgDeliveryDays: m.daysN ? Math.round((m.daysSum / m.daysN) * 10) / 10 : null,
  };
}

// ── SQL ─────────────────────────────────────────────────────────────────────
// Light normalisation in SQL (trim, case-fold, collapse spaces) keeps the
// GROUP BY small; the rest (aliases, punctuation) happens in stateKey/cityKey.
const SKEY_SQL = `LOWER(TRIM(REGEXP_REPLACE(COALESCE(a.state, ''), '[[:space:]]+', ' ')))`;
const CKEY_SQL = `LOWER(TRIM(REGEXP_REPLACE(COALESCE(a.city, ''), '[[:space:]]+', ' ')))`;
const PIN_SQL = `REGEXP_REPLACE(COALESCE(a.pincode, ''), '[^0-9]', '')`;

const IS_DELIVERED = `${STAGE_SQL} IN ('delivered','returned')`;

// One row per order (in a derived table), then summed per group.
function perPlaceSql(groupCols, extraWhere) {
  return `
    SELECT ${groupCols.map((c) => `b.${c}`).join(', ')},
           COUNT(*) AS orders, SUM(b.units) AS units, SUM(b.value) AS placedValue,
           SUM(b.is_cod) AS cod,
           SUM(b.stage IN ('delivered','returned')) AS delivered,
           SUM(b.stage = 'returned') AS returned,
           SUM(b.stage = 'rto') AS rto,
           SUM(CASE WHEN b.stage IN ('delivered','returned') THEN b.value ELSE 0 END) AS deliveredValue,
           SUM(CASE WHEN b.stage IN ('delivered','returned') THEN b.refund ELSE 0 END) AS refunds,
           SUM(b.days) AS daysSum, COUNT(b.days) AS daysN
      FROM (
        SELECT ${SKEY_SQL} AS skey, ${CKEY_SQL} AS ckey, ${PIN_SQL} AS pin,
               ${STAGE_SQL} AS stage,
               (LOWER(o.payment_type) = 'cod') AS is_cod,
               COALESCE(o.final_amount, 0) AS value,
               ${REFUND_SQL} AS refund,
               (SELECT COALESCE(SUM(oi.quantity), 0) FROM order_items oi WHERE oi.order_id = o.id) AS units,
               CASE WHEN ${IS_DELIVERED} THEN (
                 SELECT CASE WHEN MIN(h.created_at) >= o.created_at
                             THEN TIMESTAMPDIFF(MINUTE, o.created_at, MIN(h.created_at)) / 1440 END
                   FROM order_status_history h
                  WHERE h.order_id = o.id AND LOWER(h.status) = 'delivered'
               ) END AS days
          FROM orders o ${JOINS}
          LEFT JOIN shipping_addresses a ON a.id = o.shipping_address_id
         WHERE o.created_at BETWEEN :start AND :end
           AND ${PLACED_SQL}
           ${extraWhere}
      ) b
     GROUP BY ${groupCols.map((c) => `b.${c}`).join(', ')}`;
}

function filtersSql(brandId, pay) {
  const parts = [];
  if (brandId) parts.push('AND o.brand_id = :brandId');
  if (pay === 'cod') parts.push("AND LOWER(o.payment_type) = 'cod'");
  if (pay === 'prepaid') parts.push("AND (o.payment_type IS NULL OR LOWER(o.payment_type) <> 'cod')");
  return parts.join(' ');
}

// Sort, keep the top LIST_LIMIT, fold the rest into one "Other N …" row.
function topWithOther(entries, base, [one, many]) {
  const sorted = [...entries].sort((x, y) => y.m.orders - x.m.orders || (y.m.deliveredValue - y.m.refunds) - (x.m.deliveredValue - x.m.refunds));
  const head = sorted.slice(0, LIST_LIMIT).map((e) => ({ key: e.key, name: e.name, ...(e.extra || {}), ...finish(e.m, base) }));
  const tail = sorted.slice(LIST_LIMIT);
  const other = tail.length
    ? { key: '__other__', name: `Other ${tail.length} ${tail.length === 1 ? one : many}`, count: tail.length, isOther: true,
      ...finish(tail.reduce((acc, e) => add(acc, e.m), blank()), base) }
    : null;
  return { rows: head, other, count: sorted.length };
}

async function handler(req, res) {
  try {
    const q = req.query || {};
    const { start, end } = parseRange(q);
    const brandId = brandOf(q);
    const pay = ['cod', 'prepaid'].includes(String(q.pay)) ? String(q.pay) : 'all';
    const wantState = q.state != null && String(q.state).trim() !== '' ? stateKey(q.state) : null;
    const wantCity = q.city != null && String(q.city).trim() !== '' ? cityKey(q.city) : null;
    let level = ['state', 'city', 'pincode'].includes(String(q.level)) ? String(q.level) : (wantCity ? 'pincode' : wantState ? 'city' : 'state');
    if (level !== 'state' && !wantState) level = 'state';
    if (level === 'pincode' && !wantCity) level = 'city';

    const replacements = { start, end, brandId };
    const extra = filtersSql(brandId, pay);

    // 1) Every (raw state, raw city) pair → states, cities, tiers, KPIs.
    const pairs = await sequelize.query(perPlaceSql(['skey', 'ckey'], extra), { replacements, type: QueryTypes.SELECT });

    const states = new Map();   // sKey → { m, raws:Set }
    const cities = new Map();   // sKey|cKey → { sKey, cKey, m, rawS:Set, rawC:Set }
    const total = blank();
    for (const p of pairs) {
      const sK = stateKey(p.skey);
      const cK = cityKey(p.ckey);
      add(total, p);
      if (!states.has(sK)) states.set(sK, { m: blank() });
      add(states.get(sK).m, p);
      const id = `${sK}|${cK}`;
      if (!cities.has(id)) cities.set(id, { sKey: sK, cKey: cK, m: blank(), rawS: new Set(), rawC: new Set() });
      const c = cities.get(id);
      add(c.m, p); c.rawS.add(p.skey ?? ''); c.rawC.add(p.ckey ?? '');
    }
    const totalOrders = total.orders;

    // All states (≈36 rows) — the share bars use orders AND net sales.
    const stateRows = [...states.entries()]
      .map(([key, s]) => ({ key, name: display(key), ...finish(s.m, totalOrders) }))
      .sort((a, b) => b.orders - a.orders || b.netSales - a.netSales);

    // KPIs (whole scope, whatever is drilled into).
    const cityList = [...cities.values()].filter((c) => c.cKey !== UNKNOWN);
    const placeOf = (c) => ({ key: c.cKey, state: c.sKey, name: display(c.cKey), stateName: display(c.sKey) });
    const topStateRow = stateRows.find((s) => s.key !== UNKNOWN) || null;
    const topCity = cityList.reduce((best, c) => (!best || c.m.orders > best.m.orders ? c : best), null);
    const rtoCandidates = cityList
      .filter((c) => c.m.orders >= RTO_CITY_MIN_ORDERS && c.m.rto > 0)
      .map((c) => ({ ...placeOf(c), ...finish(c.m, totalOrders) }))
      .sort((a, b) => b.rtoRate - a.rtoRate || b.rto - a.rto);
    const kpis = {
      orders: totalOrders,
      topState: topStateRow ? { key: topStateRow.key, name: topStateRow.name, orders: topStateRow.orders, share: topStateRow.share } : null,
      topCity: topCity ? { ...placeOf(topCity), orders: topCity.m.orders, share: pct(topCity.m.orders, totalOrders) } : null,
      highestRtoCity: rtoCandidates[0] ? (({ key, state, name, stateName, orders, rto, closed, rtoRate }) => ({ key, state, name, stateName, orders, rto, closed, rtoRate }))(rtoCandidates[0]) : null,
      rtoCityMinOrders: RTO_CITY_MIN_ORDERS,
    };

    // City tiers.
    const tierAcc = { metro: blank(), tier2: blank(), tier3: blank() };
    const tierCities = { metro: 0, tier2: 0, tier3: 0 };
    for (const c of cities.values()) {
      const t = tierOf(c.cKey);
      add(tierAcc[t], c.m);
      if (c.m.orders && c.cKey !== UNKNOWN) tierCities[t] += 1;
    }
    const TIER_NAMES = { metro: 'Metro cities', tier2: 'Tier 2 cities', tier3: 'Tier 3 and smaller' };
    const tiers = ['metro', 'tier2', 'tier3'].map((t) => ({ key: t, name: TIER_NAMES[t], cities: tierCities[t], ...finish(tierAcc[t], totalOrders) }));

    // 2) The table for the level being viewed.
    let table;
    const crumbs = [{ label: 'India', level: 'state' }];
    if (level === 'state') {
      table = topWithOther([...states.entries()].map(([key, s]) => ({ key, name: display(key), m: s.m })), totalOrders, ['state', 'states']);
      table.parent = { name: 'India', ...finish(total, totalOrders) };
    } else {
      const st = states.get(wantState);
      const stM = st ? st.m : blank();
      crumbs.push({ label: display(wantState), level: 'city', state: wantState });
      if (level === 'city') {
        const inState = [...cities.values()].filter((c) => c.sKey === wantState)
          .map((c) => ({ key: c.cKey, name: display(c.cKey), extra: { tier: tierOf(c.cKey) }, m: c.m }));
        table = topWithOther(inState, stM.orders, ['city', 'cities']);
        table.parent = { name: display(wantState), key: wantState, ...finish(stM, totalOrders) };
      } else {
        const city = cities.get(`${wantState}|${wantCity}`);
        crumbs.push({ label: display(wantCity), level: 'pincode', state: wantState, city: wantCity });
        let pinRows = [];
        if (city) {
          pinRows = await sequelize.query(
            perPlaceSql(['pin'], `${extra} AND ${SKEY_SQL} IN (:rawS) AND ${CKEY_SQL} IN (:rawC)`),
            { replacements: { ...replacements, rawS: [...city.rawS], rawC: [...city.rawC] }, type: QueryTypes.SELECT },
          );
        }
        const cityM = city ? city.m : blank();
        const entries = pinRows.map((p) => {
          const m = add(blank(), p);
          const closed = m.delivered + m.rto;
          const risky = m.orders >= RISK_MIN_ORDERS && pct(m.rto, closed) >= RISK_RTO;
          return { key: p.pin || UNKNOWN, name: p.pin || 'Unknown', extra: { risky }, m };
        });
        table = topWithOther(entries, cityM.orders, ['pincode', 'pincodes']);
        table.parent = { name: display(wantCity), key: wantCity, state: wantState, tier: tierOf(wantCity), ...finish(cityM, totalOrders) };
        table.riskyPincodes = entries.filter((e) => e.extra.risky).length;
      }
    }

    return res.json({
      success: true,
      range: { start, end },
      filters: { brandId, pay, level, state: wantState, city: wantCity },
      level,
      breadcrumbs: crumbs,
      totals: finish(total, totalOrders),
      kpis,
      states: stateRows,
      tiers,
      table,
      rules: {
        listLimit: LIST_LIMIT,
        rtoCityMinOrders: RTO_CITY_MIN_ORDERS,
        riskRtoPct: RISK_RTO,
        riskMinOrders: RISK_MIN_ORDERS,
        // No per-pincode COD block exists in the backend, so the page only shows the flag.
        canBlockCodByPincode: false,
      },
    });
  } catch (err) {
    logger.error('Location report failed:', err);
    return res.status(500).json({ success: false, message: 'Could not load the location report' });
  }
}

module.exports = { handler, stateKey, cityKey, tierOf, display };
