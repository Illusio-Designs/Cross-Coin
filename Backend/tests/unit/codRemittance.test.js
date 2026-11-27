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
    { waybill: 'AWB1', order_number: 'MX-1', payment_type: 'cod', final_amount: '449.10' },
    { tracking_number: 'AWB2', order_number: 'SB-1', payment_type: 'cod', final_amount: '489.00' },
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
  sequelize.query.mockResolvedValue([{ waybill: 'AWB1', order_number: 'MX-1', payment_type: 'cod', final_amount: '449.10' }]);
  await expect(reconcileCod('2026-11-25')).resolves.toMatchObject({
    status: 'partial', netRemittedPaise: null, matched: 1, rows: [{ awb: 'AWB1', status: 'matched' }],
  });
});
