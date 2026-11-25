jest.mock('../../config/db.js', () => ({ sequelize: { query: jest.fn() } }));

const { sequelize } = require('../../config/db.js');
const { listBalances, saveBalance } = require('../../services/providerWalletService.js');

test('distinguishes a recorded zero balance from a missing snapshot', async () => {
  sequelize.query.mockResolvedValueOnce([]).mockResolvedValueOnce([
    { provider: 'ithink', amount: '0.00', currency: 'INR', recorded_at: new Date('2026-11-25T09:00:00Z') },
  ]);
  await expect(listBalances()).resolves.toEqual([
    { provider: 'meta', amount: null, currency: 'INR', recordedAt: null },
    { provider: 'ithink', amount: 0, currency: 'INR', recordedAt: '2026-11-25T09:00:00.000Z' },
  ]);
});

test('validates wallet inputs before attempting to store them', async () => {
  sequelize.query.mockClear();
  for (const data of [{ provider: 'wrong', currency: 'INR', amount: '10' },
    { provider: 'ithink', currency: 'USD', amount: '10' }, { provider: 'meta', currency: 'INR', amount: '1.999' }]) {
    await expect(saveBalance(data, 1)).rejects.toMatchObject({ status: 400 });
  }
  expect(sequelize.query).not.toHaveBeenCalled();
});
