/**
 * Smoke tests for the serviceability parser used by the cart's PIN-code check.
 * Covers the iThink vs FShip response shapes and the safety rule: never falsely
 * block a real customer on an unfamiliar shape. The Imphal (795001) style case —
 * couriers present but no delivery — must resolve to NOT serviceable.
 */

const { parseServiceability } = require('../../utils/serviceability.js');

describe('parseServiceability', () => {
  test('iThink object shape → serviceable, COD read', () => {
    const raw = { data: { delhivery: { cod: 1, prepaid: 1 }, bluedart: { cod: 0, prepaid: 1 } } };
    const d = parseServiceability(raw);
    expect(d.serviceable).toBe(true);
    expect(d.cod_available).toBe(true);
  });

  test('iThink service-wrapped [ {status,data} ] → serviceable', () => {
    const raw = [{ status: 'success', data: { xpressbees: { prepaid: 1, cod: 0 } } }];
    expect(parseServiceability(raw).serviceable).toBe(true);
  });

  test('FShip array shape → serviceable', () => {
    const raw = [{ delivery: 'yes', cod: 'yes', edd: 4 }];
    const d = parseServiceability(raw);
    expect(d.serviceable).toBe(true);
    expect(d.cod_available).toBe(true);
    expect(d.estimated_delivery_days).toBe(4);
  });

  test('empty result → NOT serviceable', () => {
    expect(parseServiceability([]).serviceable).toBe(false);
    expect(parseServiceability({ data: {} }).serviceable).toBe(false);
    expect(parseServiceability(null).serviceable).toBe(false);
  });

  test('couriers present but all delivery flags false → NOT serviceable (the 795001 case)', () => {
    const raw = { data: { delhivery: { cod: 0, prepaid: 0, delivery: 'no' } } };
    expect(parseServiceability(raw).serviceable).toBe(false);
  });

  test('SAFETY: courier data with NO recognisable flags → serviceable (never falsely block)', () => {
    const raw = [{ some_unknown_field: 'x', rate: 86 }];
    expect(parseServiceability(raw).serviceable).toBe(true);
  });
});
