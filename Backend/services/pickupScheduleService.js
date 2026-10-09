/**
 * Shared pickup schedule (one company / one Morbi warehouse → one schedule for
 * all stores). Admin sets weekly off-days (e.g. Sunday) and specific blocked
 * dates in advance; getNextPickupDate() returns the next allowed pickup date,
 * which the booking flow stamps on the order.
 *
 * Config is stored as JSON in brand_settings (brand_id 1, key PICKUP_SCHEDULE):
 *   weeklyOffDays : array of weekday numbers, 0=Sun … 6=Sat
 *   blockedDates  : array of 'YYYY-MM-DD' the admin has blocked
 *   cutoffHour    : IST hour (0-23); booked at/after this hour → earliest pickup
 *                   is the next day
 *   leadDays      : minimum days ahead before a pickup can be scheduled (0 = same day)
 *
 * All day maths is done in IST, since pickups are in India.
 */
const settingsSvc = require('./brandSettingsService.js');
const { logger } = require('../config/logging.js');

const BRAND = 1; // shared company schedule
const KEY = 'PICKUP_SCHEDULE';
const IST_OFFSET_MIN = 330; // UTC+5:30
const DEFAULTS = { weeklyOffDays: [0], blockedDates: [], blockedRanges: [], cutoffHour: 15, leadDays: 0 };

const isYmd = (s) => /^\d{4}-\d{2}-\d{2}$/.test(s);
// A valid {from,to} range (both YYYY-MM-DD, from <= to; a single day has from===to).
const cleanRanges = (arr) => (Array.isArray(arr) ? arr : [])
  .filter((r) => r && isYmd(r.from) && isYmd(r.to))
  .map((r) => (r.from <= r.to ? { from: r.from, to: r.to } : { from: r.to, to: r.from }));

async function getSchedule() {
  try {
    const raw = await settingsSvc.getBrandSetting(BRAND, KEY, false);
    if (!raw) return { ...DEFAULTS };
    const p = typeof raw === 'string' ? JSON.parse(raw) : raw;
    return {
      weeklyOffDays: Array.isArray(p.weeklyOffDays)
        ? [...new Set(p.weeklyOffDays.map(Number).filter((n) => n >= 0 && n <= 6))]
        : [...DEFAULTS.weeklyOffDays],
      blockedDates: Array.isArray(p.blockedDates) ? p.blockedDates.filter(isYmd) : [],
      blockedRanges: cleanRanges(p.blockedRanges),
      cutoffHour: Number.isFinite(Number(p.cutoffHour)) ? Math.max(0, Math.min(23, Number(p.cutoffHour))) : DEFAULTS.cutoffHour,
      leadDays: Number.isFinite(Number(p.leadDays)) ? Math.max(0, Math.min(30, Number(p.leadDays))) : 0,
    };
  } catch (e) {
    logger.error('pickupSchedule getSchedule: ' + e.message);
    return { ...DEFAULTS };
  }
}

async function setSchedule(obj = {}) {
  const clean = {
    weeklyOffDays: Array.isArray(obj.weeklyOffDays)
      ? [...new Set(obj.weeklyOffDays.map(Number).filter((n) => n >= 0 && n <= 6))].sort((a, b) => a - b)
      : [...DEFAULTS.weeklyOffDays],
    blockedDates: Array.isArray(obj.blockedDates) ? [...new Set(obj.blockedDates.filter(isYmd))].sort() : [],
    blockedRanges: cleanRanges(obj.blockedRanges).sort((a, b) => (a.from < b.from ? -1 : 1)),
    cutoffHour: Number.isFinite(Number(obj.cutoffHour)) ? Math.max(0, Math.min(23, Number(obj.cutoffHour))) : DEFAULTS.cutoffHour,
    leadDays: Number.isFinite(Number(obj.leadDays)) ? Math.max(0, Math.min(30, Number(obj.leadDays))) : 0,
  };
  await settingsSvc.setBrandSetting(BRAND, KEY, JSON.stringify(clean), false, 'shipping', 'Shared pickup schedule (weekly offs + blocked dates/ranges)', null);
  return clean;
}

// IST wall-clock view of a Date: read its UTC getters to get IST fields.
function istShift(d) { return new Date(d.getTime() + IST_OFFSET_MIN * 60000); }
function ymd(d) { return d.toISOString().slice(0, 10); }

function isAllowed(dateStr, sched) {
  if (!isYmd(dateStr)) return false;
  const dow = new Date(dateStr + 'T00:00:00Z').getUTCDay();
  if (sched.weeklyOffDays.includes(dow)) return false;
  if (sched.blockedDates.includes(dateStr)) return false;
  if ((sched.blockedRanges || []).some((r) => dateStr >= r.from && dateStr <= r.to)) return false;
  return true;
}

// Next allowed pickup date (YYYY-MM-DD) on/after `from`, honouring cutoff + lead.
async function getNextPickupDate(from = new Date()) {
  const sched = await getSchedule();
  const ist = istShift(from);
  const hour = ist.getUTCHours();
  // Midnight of the IST "today", represented as a UTC-midnight cursor.
  let cursor = new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()));
  const startOffset = sched.leadDays + (hour >= sched.cutoffHour ? 1 : 0);
  cursor.setUTCDate(cursor.getUTCDate() + startOffset);
  for (let i = 0; i < 400; i++) {
    const dstr = ymd(cursor);
    if (isAllowed(dstr, sched)) return dstr;
    cursor.setUTCDate(cursor.getUTCDate() + 1);
  }
  return ymd(cursor);
}

// iThink auto-collects the order on the NEXT working day after the label is
// generated (their domestic API takes no pickup date, and they're closed
// Sundays — a Saturday label rolls to Monday). This returns the IST date a
// courier would actually arrive if we booked RIGHT NOW — the day we must check
// against the no-pickup schedule before booking.
function prospectivePickupDate(from = new Date()) {
  const ist = istShift(from);
  const cursor = new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()));
  cursor.setUTCDate(cursor.getUTCDate() + 1); // iThink collects the next day
  // iThink is closed Sundays and rolls the pickup forward itself, so don't hold
  // for a Sunday — only for the admin's own blocked dates / custom weekly offs.
  while (cursor.getUTCDay() === 0) cursor.setUTCDate(cursor.getUTCDate() + 1);
  return ymd(cursor);
}

// If booking NOW would make iThink collect on a day the admin has blocked (a
// blocked date/range, or a custom weekly off beyond Sunday), return that blocked
// date — the caller then HOLDS the booking until it passes and dispatches a day
// later. Returns null when the prospective pickup day is fine. Fail-soft: any
// error returns null so a schedule problem never blocks a booking.
async function shouldHoldForPickup(from = new Date()) {
  try {
    const sched = await getSchedule();
    const p = prospectivePickupDate(from);
    return isAllowed(p, sched) ? null : p;
  } catch (e) {
    logger.error('pickupSchedule shouldHoldForPickup: ' + e.message);
    return null;
  }
}

// The date (YYYY-MM-DD, IST) of the next 11:00 IST booking batch for an order
// placed now: today if it's before 11:00 IST, otherwise tomorrow. Stored on the
// order as pickup_hold_until so the batch cron books it at the right 11:00 run
// (and the courier then schedules pickup for the following day).
const BATCH_HOUR_IST = 11;
function nextBatchDate(from = new Date()) {
  const ist = istShift(from);
  const cursor = new Date(Date.UTC(ist.getUTCFullYear(), ist.getUTCMonth(), ist.getUTCDate()));
  if (ist.getUTCHours() >= BATCH_HOUR_IST) cursor.setUTCDate(cursor.getUTCDate() + 1);
  return ymd(cursor);
}

module.exports = { getSchedule, setSchedule, getNextPickupDate, isAllowed, prospectivePickupDate, shouldHoldForPickup, nextBatchDate, BATCH_HOUR_IST, DEFAULTS };
