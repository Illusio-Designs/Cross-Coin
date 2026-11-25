jest.mock('../../config/db.js', () => ({ sequelize: { query: jest.fn() } }));
jest.mock('../../model/orderModel.js', () => ({ Order: { findAll: jest.fn() } }));
jest.mock('../../services/shiprocketOrderReconciliation.js', () => ({
  enabledBrands: jest.fn(), orderPage: jest.fn(), orderReference: (order) => order.platform_order_id, PAGE_SIZE: 50,
}));
jest.mock('../../controller/customCheckoutController.js', () => ({
  fetchProviderOrder: jest.fn(), ingestVerifiedOrder: jest.fn(),
}));

const { sequelize } = require('../../config/db.js');
const { Order } = require('../../model/orderModel.js');
const { enabledBrands, orderPage } = require('../../services/shiprocketOrderReconciliation.js');
const { fetchProviderOrder, ingestVerifiedOrder } = require('../../controller/customCheckoutController.js');
const backfill = require('../../services/shiprocketOrderBackfill.js');

test('persists progress and claims at most one order per minute', async () => {
  let row;
  let minutePassed = true;
  enabledBrands.mockResolvedValue([{ id: 7, slug: 'morbix' }]);
  Order.findAll.mockResolvedValue([]);
  orderPage.mockResolvedValue([{ platform_order_id: 'older-1' }, { platform_order_id: 'older-2' }]);
  fetchProviderOrder.mockImplementation(async (_, id) => ({ platform_order_id: id, payment_status: 'success' }));
  ingestVerifiedOrder.mockResolvedValue({ created: true });

  sequelize.query.mockImplementation(async (sql, { replacements = {} } = {}) => {
    if (sql.startsWith('SELECT')) return row ? [row] : [];
    if (sql.includes('active = TRUE, progress') && !row?.active) {
      row = { active: true, progress: replacements.progress };
    }
    if (sql.includes('INTERVAL 60 SECOND') && row?.active && minutePassed) {
      row.lease = replacements.lease;
      minutePassed = false;
    }
    if (sql.includes('SET active = :active') && row?.lease === replacements.lease) {
      row = { active: replacements.active, progress: replacements.progress };
    }
    return [];
  });

  await backfill.start();
  await backfill.run();
  await expect(backfill.run()).resolves.toMatchObject({ status: 'skipped' });
  expect(ingestVerifiedOrder).toHaveBeenCalledTimes(1);
  expect(ingestVerifiedOrder.mock.calls[0][1]).toBe('older-1');
  await expect(backfill.status()).resolves.toMatchObject({ active: true, checked: 1, recovered: 1 });

  minutePassed = true;
  await backfill.run();
  expect(ingestVerifiedOrder).toHaveBeenCalledTimes(2);
  expect(ingestVerifiedOrder.mock.calls[1][1]).toBe('older-2');
  await expect(backfill.status()).resolves.toMatchObject({ active: false, checked: 2, recovered: 2 });
});
