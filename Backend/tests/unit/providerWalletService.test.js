jest.mock('../../config/db.js', () => ({ sequelize: { query: jest.fn() } }));
jest.mock('../../services/metaAdsService.js', () => ({ getRecentDailySpend: jest.fn() }));

const { sequelize } = require('../../config/db.js');
const { listBalances, listWalletMonitor, recordWalletCheck, saveBalance } = require('../../services/providerWalletService.js');
const { getRecentDailySpend } = require('../../services/metaAdsService.js');

beforeEach(() => jest.clearAllMocks());

test('returns the selected brand’s recorded Meta funds', async () => {
  sequelize.query.mockImplementation(async (sql) => {
    if (sql.includes('FROM brands b')) return [
      { id: 8, brand_name: 'Morbix', amount: '0.00', currency: 'INR', recorded_at: new Date('2026-11-25T09:00:00Z') },
    ];
    return [];
  });
  await expect(listBalances(8)).resolves.toEqual([
    { provider: 'meta', brandId: 8, brandName: 'Morbix', amount: 0, currency: 'INR', recordedAt: '2026-11-25T09:00:00.000Z',
      source: 'manual', syncStatus: null, checkedAt: null },
  ]);
  expect(sequelize.query).toHaveBeenCalledWith(expect.stringContaining('w.brand_id = b.id'),
    expect.objectContaining({ replacements: { brandId: 8 } }));
});

test('shows the last successful Meta amount when a later refresh fails', async () => {
  const synced = new Date('2026-11-25T12:00:00Z');
  const checked = new Date('2026-11-25T15:00:00Z');
  sequelize.query.mockResolvedValue([{
    id: 8, brand_name: 'Morbix', amount: '15500', currency: 'INR',
    recorded_at: new Date('2026-11-25T09:00:00Z'), synced_amount: '15575.89',
    synced_currency: 'INR', synced_at: synced, checked_at: checked, sync_status: 'failed',
  }]);
  await expect(listBalances(8)).resolves.toEqual([expect.objectContaining({
    amount: 15575.89, source: 'meta', recordedAt: synced.toISOString(), checkedAt: checked.toISOString(), syncStatus: 'failed',
  })]);
});

test('a missing funding amount records the failed check without supplying a new snapshot', async () => {
  sequelize.query.mockResolvedValue([]);
  const checkedAt = new Date('2026-11-25T15:00:00Z');
  await recordWalletCheck({ brandId: 8, accountId: '805062759008052', checkedAt, status: 'unavailable', funds: { amount: null } });
  expect(sequelize.query).toHaveBeenCalledWith(expect.stringContaining('VALUES(synced_at) IS NOT NULL'),
    { replacements: { brandId: 8, accountId: '805062759008052', checkedAt, status: 'unavailable', amount: null, currency: null, syncedAt: null } });
});

test('saves Meta funds by active brand', async () => {
  sequelize.query.mockImplementation(async (sql) => sql.startsWith('SELECT id FROM brands') ? [{ id: 8 }] : []);
  await saveBalance({ provider: 'meta', brandId: '8', currency: 'USD', amount: '29.50' }, 1);
  expect(sequelize.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO meta_brand_wallet_snapshots (brand_id,'),
    { replacements: { identity: 8, value: '29.50', currency: 'USD', actorId: 1 } });
});

test('uses only daily spend in the currency of the recorded wallet', async () => {
  sequelize.query.mockResolvedValue([
    { id: 8, brand_name: 'Morbix', amount: '1200', currency: 'INR' },
    { id: 9, brand_name: 'Velmique', amount: '250', currency: 'INR' },
    { id: 10, brand_name: 'VitaPerk', amount: '85', currency: 'USD' },
  ]);
  getRecentDailySpend.mockResolvedValue([
    { brand_id: 8, currency: 'INR', daily_spend: '2000' },
    { brand_id: 9, currency: 'USD', daily_spend: '500' },
    { brand_id: 10, currency: 'USD', daily_spend: '20' },
  ]);
  const wallets = await listWalletMonitor();
  expect(wallets.map(({ dailySpend }) => dailySpend)).toEqual([2000, null, 20]);
});

test('validates wallet inputs before attempting to store them', async () => {
  for (const data of [{ provider: 'wrong', currency: 'INR', amount: '10' },
    { provider: 'ithink', brandId: 8, currency: 'INR', amount: '10' },
    { provider: 'meta', currency: 'INR', amount: '100' },
    { provider: 'meta', brandId: 8, currency: 'INR', amount: '1.999' }]) {
    await expect(saveBalance(data, 1)).rejects.toMatchObject({ status: 400 });
  }
  expect(sequelize.query).not.toHaveBeenCalled();
});
