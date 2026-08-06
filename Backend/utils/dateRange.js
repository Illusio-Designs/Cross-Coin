const { Op } = require('sequelize');

/**
 * Date-range helpers for the orders + dashboard/report filters.
 *
 * ⚠️ TIMEZONE: order timestamps are stored in UTC, but "a day" for this business
 * is an INDIA (IST, +05:30) calendar day. Computing the day with `new Date(str)`
 * + `setHours()` used the SERVER's timezone (UTC on the host), so "today" became
 * a UTC day — shifted 5.5 hours. Result: an order placed at 12:05 AM IST (stored
 * as 6:35 PM the previous day in UTC) fell OUTSIDE "today" and was missed, while
 * some next-day early orders were wrongly counted. These helpers anchor the day
 * to IST and return the correct UTC instants.
 *
 * ⚠️ SYMBOL TRAP: Op.gte / Op.lte are Symbols, so `Object.keys(range).length` is
 * ALWAYS 0 and must NOT be used to detect a filter — gate on `hasRange` instead.
 */

// India has no DST, so a fixed offset is correct. Overridable via env.
const TZ_OFFSET = process.env.APP_TZ_OFFSET || '+05:30';

// Start of the given calendar day IN THE BUSINESS TZ, as a UTC Date.
// e.g. IST '2026-08-06' → 2026-08-05T18:30:00.000Z
function dayStartTZ(d, offset = TZ_OFFSET) {
  if (!d) return null;
  const ymd = String(d).slice(0, 10); // accept 'YYYY-MM-DD' or a full ISO string
  const t = new Date(`${ymd}T00:00:00.000${offset}`);
  return isNaN(t.getTime()) ? null : t;
}
// End of the given calendar day IN THE BUSINESS TZ, as a UTC Date.
// e.g. IST '2026-08-06' → 2026-08-06T18:29:59.999Z
function dayEndTZ(d, offset = TZ_OFFSET) {
  if (!d) return null;
  const ymd = String(d).slice(0, 10);
  const t = new Date(`${ymd}T23:59:59.999${offset}`);
  return isNaN(t.getTime()) ? null : t;
}

/**
 * Build a Sequelize `createdAt` range from start/end date strings, anchored to
 * IST day boundaries. Returns `{ range, hasRange }` — gate on `hasRange`.
 */
function buildCreatedAtRange(start_date, end_date) {
  const range = {};
  let hasRange = false;
  const s = dayStartTZ(start_date);
  if (s) { range[Op.gte] = s; hasRange = true; }
  const e = dayEndTZ(end_date);
  if (e) { range[Op.lte] = e; hasRange = true; }
  return { range, hasRange };
}

module.exports = { buildCreatedAtRange, dayStartTZ, dayEndTZ, TZ_OFFSET };
