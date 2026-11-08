jest.mock('../../model/associations.js', () => ({ Product: {}, Category: {}, Brand: {} }));
jest.mock('../../services/settingsHelper.js', () => ({}));
jest.mock('../../config/logging.js', () => ({ logger: { error: jest.fn() } }));
jest.mock('../../services/customCheckoutService.js', () => ({ ensureProductsPushed: jest.fn(), createCheckoutToken: jest.fn() }));
const service = require('../../services/customCheckoutService');
const { createToken } = require('../../controller/customCheckoutController');
beforeEach(() => jest.clearAllMocks());
const request = () => ({ brandId: 2, brand: { slug: 'soxbae' }, body: { items: [{ variant_id: 12, quantity: 2 }], redirect_url: 'https://soxbaesocks.com/order-confirmation' }, headers: {}, ip: '127.0.0.1' });
const response = () => { const res = { status: jest.fn(), json: jest.fn() }; res.status.mockReturnValue(res); return res; };
test.each([[], [{ error: 'sync failed' }], [{ skipped: 'not_found' }], [{ pushed: true }, { error: 'one product failed' }]].map((catalog) => [catalog]))('failed catalog %j prevents token creation', async (catalog) => {
  service.ensureProductsPushed.mockResolvedValue(catalog);
  const res = response(); await createToken(request(), res);
  expect(res.status).toHaveBeenCalledWith(503);
  expect(service.createCheckoutToken).not.toHaveBeenCalled();
});
test('catalog exception prevents token creation', async () => {
  service.ensureProductsPushed.mockRejectedValue(new Error('database error'));
  const res = response(); await createToken(request(), res);
  expect(res.status).toHaveBeenCalledWith(503);
  expect(service.createCheckoutToken).not.toHaveBeenCalled();
});
test.each([true, 'unchanged', 'background'])('valid catalog state %s creates brand-scoped token', async (pushed) => {
  service.ensureProductsPushed.mockResolvedValue([{ productId: 1, pushed }]);
  service.createCheckoutToken.mockResolvedValue({ token: 'fixture-token' });
  const res = response(); await createToken(request(), res);
  expect(service.createCheckoutToken).toHaveBeenCalledWith(2, expect.objectContaining({ items: [{ variant_id: '12', quantity: 2 }] }), 'https://soxbaesocks.com/order-confirmation');
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, token: 'fixture-token' }));
});
test('provider business rejection is reported distinctly and no checkout token is issued', async () => {
  service.ensureProductsPushed.mockResolvedValue([{ productId: 1, code: 'CHECKOUT_CATALOG_REJECTED', error: 'Shiprocket rejected the product catalog update.' }]);
  const res = response(); await createToken(request(), res);
  expect(service.createCheckoutToken).not.toHaveBeenCalled();
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: false, code: 'CHECKOUT_CATALOG_REJECTED' }));
});
