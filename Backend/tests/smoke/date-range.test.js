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
    expect(start.getHours()).toBe(0);
    expect(start.getMinutes()).toBe(0);
    // End is normalised to 23:59:59.999 so the whole end day is included.
    expect(end.getHours()).toBe(23);
    expect(end.getMinutes()).toBe(59);
    expect(end.getSeconds()).toBe(59);
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
