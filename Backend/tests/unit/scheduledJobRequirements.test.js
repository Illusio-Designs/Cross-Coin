jest.mock('../../services/jobRunService.js', () => ({
  ranSince: jest.fn(),
  istDayStart: () => new Date('2026-11-25T18:30:00.000Z'),
  runLogged: jest.fn(),
}));
jest.mock('../../services/whatsappService.js', () => ({ isAutomationEnabled: jest.fn() }));
jest.mock('../../services/cartRecoveryService.js', () => ({
  getCartRules: jest.fn(),
  cronWindow: jest.fn(() => ({ from: new Date(), to: new Date() })),
}));
jest.mock('../../model/abandonedCartModel.js', () => ({ AbandonedCart: { findAll: jest.fn() } }));
jest.mock('../../model/associations.js', () => ({ Cart: { findAll: jest.fn() } }));

const { getJob, runJob, runJobLogged } = require('../../config/cronJobs.js');
const { ranSince, runLogged } = require('../../services/jobRunService.js');
const { isAutomationEnabled } = require('../../services/whatsappService.js');
const { Cart } = require('../../model/associations.js');
const { AbandonedCart } = require('../../model/abandonedCartModel.js');

beforeEach(() => {
  jest.clearAllMocks();
  isAutomationEnabled.mockResolvedValue(true);
  ranSince.mockResolvedValue(false);
  AbandonedCart.findAll.mockResolvedValue([]);
  Cart.findAll.mockResolvedValue([]);
  runLogged.mockImplementation(async (_, fn) => {
    const result = await fn();
    return typeof result === 'string' ? { status: 'ok', summary: result } : result;
  });
});

test('the merged recovery job checks both sources while the old schedule is retired', async () => {
  expect(getJob('abandoned-cart')).toBeNull();
  expect(getJob('shiprocket-order-reconciliation')).toBeNull();
  const result = await runJobLogged(getJob('abandoned-checkout'));
  expect(result).toMatchObject({ status: 'ok', summary: expect.stringContaining('Saved carts') });
  expect(AbandonedCart.findAll.mock.invocationCallOrder[0]).toBeLessThan(Cart.findAll.mock.invocationCallOrder[0]);
  expect(runLogged).toHaveBeenCalledWith('abandoned-cart', expect.any(Function), { reportFailure: false });
});

test('the five-minute checkout sweep does not rescan saved carts within the hour', async () => {
  ranSince.mockResolvedValue(true);
  await runJob(getJob('abandoned-checkout'));
  expect(ranSince).toHaveBeenCalledWith('abandoned-cart', expect.any(Date));
  expect(AbandonedCart.findAll).toHaveBeenCalledTimes(1);
  expect(Cart.findAll).not.toHaveBeenCalled();
});

test('a disabled automation skips eligibility checks for scheduled and manual runs', async () => {
  isAutomationEnabled.mockResolvedValue(false);
  expect(await runJobLogged(getJob('abandoned-checkout'))).toMatchObject({ status: 'skipped' });
  expect(await runJob(getJob('abandoned-checkout'))).toMatchObject({ status: 'skipped' });
  expect(AbandonedCart.findAll).not.toHaveBeenCalled();
  expect(Cart.findAll).not.toHaveBeenCalled();
});

test('a daily job already run in India today does no further work', async () => {
  ranSince.mockResolvedValue(true);
  const job = { ...getJob('winback'), run: jest.fn() };
  expect(await runJobLogged(job)).toMatchObject({ status: 'skipped', summary: 'Already ran today' });
  expect(ranSince).toHaveBeenCalledWith('winback', new Date('2026-11-25T18:30:00.000Z'));
  expect(job.run).not.toHaveBeenCalled();
});
