jest.mock('axios', () => ({ get: jest.fn() }));
jest.mock('../../config/db.js', () => ({ sequelize: { query: jest.fn() } }));
jest.mock('../../config/logging.js', () => ({ logger: { warn: jest.fn() } }));
jest.mock('../../services/settingsHelper.js', () => ({ getSetting: jest.fn(), getGlobal: jest.fn() }));

const axios = require('axios');
const settings = require('../../services/settingsHelper.js');
const { getBillingBalance, clearCaches } = require('../../services/metaAdsService.js');

beforeEach(() => {
  jest.resetAllMocks();
  clearCaches();
  settings.getSetting.mockResolvedValue(null);
  settings.getGlobal.mockResolvedValue(null);
});

test('reads the mapped account with the brand token and returns the bill due in currency units', async () => {
  settings.getSetting.mockImplementation(async (_, key) => key === 'META_ADS_TOKEN' ? 'fixture-brand-token' : null);
  axios.get.mockResolvedValue({ status: 200, data: { account_id: '88123', balance: '44910', currency: 'INR' } });
  await expect(getBillingBalance(8, '88123')).resolves.toEqual({ status: 'ok', accountId: '88123', amount: 449.1, currency: 'INR' });
  expect(axios.get).toHaveBeenCalledWith(expect.stringContaining('/act_88123'), expect.objectContaining({
    params: { fields: 'account_id,balance,currency', access_token: 'fixture-brand-token' }, timeout: 6000,
  }));
});

test('never uses a response from a different ad account as the requested balance', async () => {
  settings.getGlobal.mockResolvedValue('fixture-shared-token');
  axios.get.mockResolvedValue({ status: 200, data: { account_id: '77123', balance: '200', currency: 'USD' } });
  await expect(getBillingBalance(8, '88123')).resolves.toEqual({ status: 'unavailable', accountId: '88123' });
  await expect(getBillingBalance(8, null)).resolves.toEqual({ status: 'unmapped' });
  expect(axios.get).toHaveBeenCalledTimes(1);
});
