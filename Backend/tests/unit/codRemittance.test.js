jest.mock('../../config/db.js', () => ({ sequelize: { query: jest.fn() } }));
jest.mock('../../model/brandModel.js', () => ({ findAll: jest.fn() }));
jest.mock('../../services/shippingProviderFactory.js', () => ({ getShippingProvider: jest.fn() }));

const { sequelize } = require('../../config/db.js');
const Brand = require('../../model/brandModel.js');
const { getShippingProvider } = require('../../services/shippingProviderFactory.js');
const { reconcileCod } = require('../../services/codRemittanceService.js');

test('reconciles remittance AWBs across brands and reads a shared iThink account only once', async () => {
  Brand.findAll.mockResolvedValue([{ id: 1 }, { id: 2 }]);
  const getCodRemittance = jest.fn().mockResolvedValue({
    summary: [{ cod_remitted: '400.00', wallet_amount: '25.00' }],
    shipments: [
      { airway_bill_no: 'AWB1', price: '449.10' },
      { airway_bill_no: 'AWB2', price: '499.00' },
      { airway_bill_no: 'AWB3', price: '699.00' },
    ],
  });
  getShippingProvider.mockResolvedValue({ initialize: async () => {}, env: 'production',
    accessToken: 'fixture', secretKey: 'fixture', getCodRemittance });
  sequelize.query.mockResolvedValue([
    { waybill: 'AWB1', order_number: 'MX-1', payment_type: 'cod', delivery_confirmed: 1, final_amount: '449.10' },
    { tracking_number: 'AWB2', order_number: 'SB-1', payment_type: 'cod', delivery_confirmed: 1, final_amount: '489.00' },
  ]);
  const result = await reconcileCod('2026-11-25');
  expect(getCodRemittance).toHaveBeenCalledTimes(1);
  expect(getCodRemittance).toHaveBeenCalledWith('2026-11-25');
  expect(result).toMatchObject({ status: 'ok', matched: 1, netRemittedPaise: 40000 });
  expect(result.rows.map(({ status }) => status)).toEqual(['matched', 'amount_mismatch', 'missing']);
  expect(sequelize.query).toHaveBeenCalledTimes(1);
});

test('keeps a provider failure separate from an empty remittance report', async () => {
  getShippingProvider.mockResolvedValue({ initialize: async () => {}, env: 'production',
    accessToken: 'fixture', secretKey: 'fixture', getCodRemittance: async () => { throw new Error('fixture timeout'); } });
  await expect(reconcileCod('2026-11-25')).resolves.toEqual({ status: 'unavailable', rows: [] });
});

test('keeps the net payout available when shipment details fail', async () => {
  Brand.findAll.mockResolvedValue([{ id: 1 }]);
  getShippingProvider.mockResolvedValue({ initialize: async () => {}, env: 'production',
    accessToken: 'fixture', secretKey: 'fixture', getCodRemittance: async () => ({
      summary: [{ cod_remitted: '400.00' }], shipments: null, issues: ['timeout'],
    }) });
  await expect(reconcileCod('2026-11-25')).resolves.toMatchObject({
    status: 'partial', netRemittedPaise: 40000, rows: [], shipmentsAvailable: false, issues: ['timeout'],
  });
});

test('reconciles shipment details while leaving the unavailable net remittance blank', async () => {
  Brand.findAll.mockResolvedValue([{ id: 1 }]);
  getShippingProvider.mockResolvedValue({ initialize: async () => {}, env: 'production',
    accessToken: 'fixture', secretKey: 'fixture', getCodRemittance: async () => ({
      summary: null, shipments: [{ airway_bill_no: 'AWB1', price: '449.10' }], issues: ['timeout'],
    }) });
  sequelize.query.mockResolvedValue([{ waybill: 'AWB1', order_number: 'MX-1', payment_type: 'cod', delivery_confirmed: 1, final_amount: '449.10' }]);
  await expect(reconcileCod('2026-11-25')).resolves.toMatchObject({
    status: 'partial', netRemittedPaise: null, matched: 1, rows: [{ awb: 'AWB1', status: 'matched' }],
  });
});

test('distinguishes missing amounts from mismatches and only matches delivery-confirmed shipments', async () => {
  Brand.findAll.mockResolvedValue([{ id: 1 }]);
  const getCodRemittance = jest.fn().mockResolvedValue({
    summary: [],
    shipments: [
      { airway_bill_no: 'AWB1' },
      { airway_bill_no: 'AWB2', price: '1,449.1000' },
      { airway_bill_no: 'AWB3', price: '499.00' },
      { airway_bill_no: 'AWB4', price: '499.00' },
      { airway_bill_no: 'AWB4', price: '' },
      { airway_bill_no: 'AWB5', price: '0.00' },
    ],
  });
  getShippingProvider.mockResolvedValue({ initialize: async () => {}, env: 'production',
    accessToken: 'fixture', secretKey: 'fixture', getCodRemittance });
  sequelize.query.mockResolvedValue([
    { waybill: 'AWB1', order_number: 'MX-1', payment_type: 'cod', delivery_confirmed: 1, final_amount: '499.00' },
    { waybill: 'AWB2', order_number: 'MX-2', payment_type: 'cod', delivery_confirmed: 1, final_amount: '1449.10' },
    { waybill: 'AWB3', order_number: 'MX-3', payment_type: 'cod', delivery_confirmed: 0, final_amount: '499.00' },
    { waybill: 'AWB4', order_number: 'MX-4', payment_type: 'cod', delivery_confirmed: 1, final_amount: null },
    { waybill: 'AWB5', order_number: 'MX-5', payment_type: 'cod', delivery_confirmed: 1, final_amount: '499.00' },
  ]);
  const result = await reconcileCod('2026-11-25');
  expect(result.matched).toBe(1);
  expect(result.rows.map(({ status, amountPaise }) => [status, amountPaise])).toEqual([
    ['courier_amount_unavailable', null], ['matched', 144910], ['delivery_not_confirmed', 49900],
    ['order_amount_unavailable', 49900], ['amount_mismatch', 0],
  ]);
  expect(sequelize.query).toHaveBeenLastCalledWith(
    expect.stringContaining("h.order_id = o.id AND h.status = 'delivered'"), expect.anything(),
  );
});
