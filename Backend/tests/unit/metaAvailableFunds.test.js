jest.mock('axios', () => ({ get: jest.fn() }));
jest.mock('../../config/db.js', () => ({ sequelize: { query: jest.fn() } }));
jest.mock('../../config/logging.js', () => ({ logger: {} }));
jest.mock('../../services/settingsHelper.js', () => ({ getGlobal: jest.fn() }));

const axios = require('axios');
const { sequelize } = require('../../config/db.js');
const { getGlobal } = require('../../services/settingsHelper.js');
const { clearCaches, getPrepaidFundingDisplay, syncAll } = require('../../services/metaAdsService.js');
const { parseAvailableFunds } = require('../../utils/metaAvailableFunds.js');

test.each([
  ['Available funds (₹15,628.70 INR)', 'INR', '15628.70'],
  ['Available balance: INR 1,15,628.70', 'INR', '115628.70'],
  ['Saldo disponível (1.234,56 EUR)', 'EUR', '1234.56'],
  ['Available funds $0.00', 'USD', '0.00'],
  ['Available funds (€15.00)', 'USD', null],
  ['Ad credit (₹15,628.70)', 'INR', null],
  ['Available funds (₹15,628.70) limit ₹20,000', 'INR', null],
  ['Available funds -₹10.00', 'INR', null],
  ['Saldo disponível (R$1.234,56 BRL)', 'BRL', null],
])('parses %s for %s conservatively', (label, currency, amount) => {
  expect(parseAvailableFunds(label, currency)).toBe(amount);
});

beforeEach(() => {
  jest.clearAllMocks();
  clearCaches();
  sequelize.query.mockResolvedValue([{ brand_id: 8, value: 'act_805062759008052' }]);
  getGlobal.mockResolvedValue('fixture-token');
});

test('reads the funding label on the saved brand mapping with the configured token', async () => {
  axios.get.mockResolvedValue({ status: 200, data: {
    currency: 'INR', is_prepay_account: true, funding_source_details: { display_string: 'Available funds (₹15,628.70 INR)' },
  } });
  await expect(getPrepaidFundingDisplay(8)).resolves.toEqual({
    accountId: '805062759008052', isPrepaid: true, currency: 'INR',
    displayString: 'Available funds (₹15,628.70 INR)', amount: '15628.70',
  });
  expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('/act_805062759008052'), expect.objectContaining({
    params: { fields: 'currency,is_prepay_account,funding_source_details', access_token: 'fixture-token' },
  }));
});

test('withholds postpaid labels and reports a missing wallet amount', async () => {
  axios.get.mockResolvedValue({ status: 200, data: {
    currency: 'INR', is_prepay_account: false, funding_source_details: { display_string: 'Card ending in 1234' },
  } });
  await expect(getPrepaidFundingDisplay(8)).resolves.toMatchObject({ isPrepaid: false, displayString: null, amount: null });
});

test('explains the account-level permission when Meta denies funding access', async () => {
  axios.get.mockResolvedValue({ status: 403, data: { error: { code: 200, message: 'Denied' } } });
  await expect(getPrepaidFundingDisplay(8)).rejects.toMatchObject({ status: 502, message: expect.stringContaining('MANAGE') });
});

test.each([
  ['available', { status: 200, data: {
    currency: 'INR', is_prepay_account: true, funding_source_details: { display_string: 'Available balance (₹33,007.25 INR)' },
  } }, 'synced', '33007.25'],
  ['unreadable', { status: 200, data: {
    currency: 'INR', is_prepay_account: true, funding_source_details: { display_string: 'Prepaid wallet' },
  } }, 'unavailable', null],
  ['denied', { status: 403, data: { error: { code: 200 } } }, 'failed', null],
])('records a %s wallet check alongside a successful spend sync', async (_, funding, status, amount) => {
  sequelize.query.mockImplementation(async (sql) => sql.includes('SELECT brand_id, value')
    ? [{ brand_id: 8, value: 'act_805062759008052' }] : []);
  axios.get.mockImplementation(async (url) => url.endsWith('/insights') ? { status: 200, data: { data: [] } } : funding);
  await expect(syncAll({ days: 7, today: '2026-11-25' })).resolves.toMatchObject({ status: 'ok' });
  expect(sequelize.query).toHaveBeenCalledWith(expect.stringContaining('INSERT INTO meta_wallet_account_sync'),
    { replacements: expect.objectContaining({ brandId: 8, accountId: '805062759008052', status, amount,
      syncedAt: amount == null ? null : expect.any(Date) }) });
});
