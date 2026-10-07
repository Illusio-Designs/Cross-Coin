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

module.exports = { getSchedule, setSchedule, getNextPickupDate, isAllowed, DEFAULTS };
