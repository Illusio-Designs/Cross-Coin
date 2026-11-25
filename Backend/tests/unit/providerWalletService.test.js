jest.mock('../../config/db.js', () => ({ sequelize: { query: jest.fn() } }));
jest.mock('../../services/metaAdsService.js', () => ({ getMapping: jest.fn(), getBillingBalance: jest.fn() }));

const { sequelize } = require('../../config/db.js');
const meta = require('../../services/metaAdsService.js');
const { listBalances, saveBalance } = require('../../services/providerWalletService.js');

beforeEach(() => {
  jest.clearAllMocks();
  meta.getMapping.mockResolvedValue([{ brandId: 7, accountId: '77811' }, { brandId: 8, accountId: '88224' }]);
  meta.getBillingBalance.mockResolvedValue({ status: 'ok', amount: 80, currency: 'INR' });
});

test('shares the iThink amount, isolates Meta records, and keeps the bill due separate', async () => {
  sequelize.query.mockImplementation(async (sql) => {
    if (sql.includes("WHERE provider = 'ithink'")) return [
      { amount: '0.00', currency: 'INR', recorded_at: new Date('2026-11-25T09:00:00Z') },
    ];
    if (sql.includes('FROM brands b')) return [{ id: 8, brand_name: 'Morbix', amount: null }];
    return [];
  });
  await expect(listBalances(8)).resolves.toEqual([
    { provider: 'ithink', amount: 0, currency: 'INR', recordedAt: '2026-11-25T09:00:00.000Z' },
    { provider: 'meta', brandId: 8, brandName: 'Morbix', amount: null, currency: 'INR', recordedAt: null,
      billing: { status: 'ok', amount: 80, currency: 'INR' } },
  ]);
  expect(meta.getBillingBalance).toHaveBeenCalledTimes(1);
  expect(meta.getBillingBalance).toHaveBeenCalledWith(8, '88224');
  expect(sequelize.query).toHaveBeenCalledWith(expect.stringContaining('w.brand_id = b.id'),
    expect.objectContaining({ replacements: { brandId: 8 } }));
});

test('saves Meta by active brand and iThink under one shared key', async () => {
  sequelize.query.mockImplementation(async (sql) => sql.startsWith('SELECT id FROM brands') ? [{ id: 8 }] : []);
  await saveBalance({ provider: 'meta', brandId: '8', currency: 'USD', amount: '29.50' }, 1);
  await saveBalance({ provider: 'ithink', brandId: '7', currency: 'INR', amount: '0' }, 1);
  expect(sequelize.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO meta_brand_wallet_snapshots (brand_id,'),
    { replacements: { identity: 8, value: '29.50', currency: 'USD', actorId: 1 } });
  expect(sequelize.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO provider_wallet_snapshots (provider,'),
    { replacements: { identity: 'ithink', value: '0', currency: 'INR', actorId: 1 } });
});

test('validates wallet inputs before attempting to store them', async () => {
  for (const data of [{ provider: 'wrong', currency: 'INR', amount: '10' },
    { provider: 'ithink', currency: 'USD', amount: '10' },
    { provider: 'meta', currency: 'INR', amount: '100' },
    { provider: 'meta', brandId: 8, currency: 'INR', amount: '1.999' }]) {
    await expect(saveBalance(data, 1)).rejects.toMatchObject({ status: 400 });
  }
  expect(sequelize.query).not.toHaveBeenCalled();
});
