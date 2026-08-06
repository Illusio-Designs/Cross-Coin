/**
 * Regression tests for the orders/dashboard date filter.
 *
 * A real bug shipped: the range object is keyed by Op.gte/Op.lte (Symbols),
 * and the code gated on `Object.keys(range).length`, which IGNORES Symbol keys
 * and is always 0 — so the date filter silently never applied. These tests lock
 * in the correct behaviour via the shared helper.
 */

const { Op } = require('sequelize');
const { buildCreatedAtRange } = require('../../utils/dateRange.js');

describe('buildCreatedAtRange', () => {
  test('documents the trap: Object.keys ignores Symbol (Op) keys', () => {
    const { range, hasRange } = buildCreatedAtRange('2026-07-21', '2026-07-31');
    // The bug: this is 0 even though the range is populated.
    expect(Object.keys(range).length).toBe(0);
    // The fix: rely on the flag instead.
    expect(hasRange).toBe(true);
  });

  test('both dates set both bounds with day-start / day-end', () => {
    const { range, hasRange } = buildCreatedAtRange('2026-07-21', '2026-07-31');
    expect(hasRange).toBe(true);
    const start = range[Op.gte];
    const end = range[Op.lte];
    expect(start).toBeInstanceOf(Date);
    expect(end).toBeInstanceOf(Date);
    // Boundaries are anchored to the INDIA business day (+05:30) and returned
    // as UTC instants, so assert the absolute UTC value — NOT local getHours(),
    // which depends on the runner's timezone (CI runs in UTC, so IST-midnight
    // reads back as hour 18, not 0). IST 2026-07-21 00:00 = 2026-07-20 18:30 UTC.
    expect(start.toISOString()).toBe('2026-07-20T18:30:00.000Z');
    // End is normalised to 23:59:59.999 IST so the whole end day is included:
    // IST 2026-07-31 23:59:59.999 = 2026-07-31 18:29:59.999 UTC.
    expect(end.toISOString()).toBe('2026-07-31T18:29:59.999Z');
  });

  test('start only → only Op.gte', () => {
    const { range, hasRange } = buildCreatedAtRange('2026-07-21', undefined);
    expect(hasRange).toBe(true);
    expect(range[Op.gte]).toBeInstanceOf(Date);
    expect(range[Op.lte]).toBeUndefined();
  });

  test('end only → only Op.lte', () => {
    const { range, hasRange } = buildCreatedAtRange('', '2026-07-31');
    expect(hasRange).toBe(true);
    expect(range[Op.lte]).toBeInstanceOf(Date);
    expect(range[Op.gte]).toBeUndefined();
  });

  test('no dates → hasRange false', () => {
    const { hasRange } = buildCreatedAtRange(undefined, undefined);
    expect(hasRange).toBe(false);
  });

  test('invalid date is ignored, not thrown', () => {
    const { range, hasRange } = buildCreatedAtRange('not-a-date', '2026-07-31');
    expect(hasRange).toBe(true);            // end is still valid
    expect(range[Op.gte]).toBeUndefined();  // bad start dropped
    expect(range[Op.lte]).toBeInstanceOf(Date);
  });
});
