jest.mock('../../config/db.js', () => ({ sequelize: { query: jest.fn() } }));

const { sequelize } = require('../../config/db.js');
const { readRates, saveRates, validateRates } = require('../../services/reportCostSettingsService.js');

test('validates decimal shipping and fee rates, including zero', () => {
  const rates = { shipping: '81.50', service: '0', gatewayPct: '2.25', codPct: '2' };
  expect(validateRates(rates)).toEqual({ shipping: 81.5, service: 0, gatewayPct: 2.25, codPct: 2 });
  for (const gatewayPct of [null, '', true, '2.001', '101', '-1']) {
    expect(validateRates({ ...rates, gatewayPct })).toBeNull();
  }
});

test('saves the shared rates on one row and reads database decimals as numbers', async () => {
  const rates = { shipping: 81, service: 0, gatewayPct: 2, codPct: 0 };
  sequelize.query.mockResolvedValueOnce(undefined)
    .mockResolvedValueOnce([])
    .mockResolvedValueOnce([{ shipping: '81.00', service: '0.00', gatewayPct: '2.00', codPct: '0.00' }]);

  await expect(saveRates(rates)).resolves.toEqual(rates);
  expect(sequelize.query).toHaveBeenCalledWith(expect.stringContaining('ON DUPLICATE KEY UPDATE'), { replacements: rates });
  await expect(readRates()).resolves.toEqual(rates);
});
