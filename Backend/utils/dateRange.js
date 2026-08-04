const { Op } = require('sequelize');

/**
 * Build a Sequelize `createdAt` range from start/end date strings.
 *
 * Returns `{ range, hasRange }`:
 *   - `range`    — an object keyed by Op.gte / Op.lte (start at 00:00:00.000,
 *                  end normalised to 23:59:59.999 so the whole end day counts).
 *   - `hasRange` — whether any bound was applied.
 *
 * ⚠️ You MUST gate on `hasRange`, NOT on `Object.keys(range).length`:
 * Op.gte / Op.lte are Symbols, and `Object.keys()` ignores Symbol keys, so it
 * is ALWAYS 0. That exact trap silently disabled the orders + dashboard date
 * filters (they never applied `createdAt`). This helper centralises the correct
 * pattern so it can't regress in either place.
 *
 * Invalid dates are ignored (that bound simply isn't added).
 */
function buildCreatedAtRange(start_date, end_date) {
  const range = {};
  let hasRange = false;

  if (start_date) {
    const s = new Date(start_date);
    if (!isNaN(s.getTime())) {
      s.setHours(0, 0, 0, 0);
      range[Op.gte] = s;
      hasRange = true;
    }
  }
  if (end_date) {
    const e = new Date(end_date);
    if (!isNaN(e.getTime())) {
      e.setHours(23, 59, 59, 999);
      range[Op.lte] = e;
      hasRange = true;
    }
  }

  return { range, hasRange };
}

module.exports = { buildCreatedAtRange };
