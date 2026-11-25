jest.mock('../../services/prepaidRecoveryStore.js', () => ({ rememberCheckout: jest.fn(), validPaymentId: (id) => /^pay_/.test(id || '') }));
jest.mock('../../model/associations.js', () => ({ Product: {}, Category: {}, Brand: {} }));
jest.mock('../../model/bundleTierModel.js', () => ({ BundleTier: {} }));
jest.mock('../../services/settingsHelper.js', () => ({}));
jest.mock('../../services/customCheckoutService.js', () => ({
  createCheckoutToken: jest.fn(),
  ensureProductsPushed: jest.fn(), fetchCheckoutOrder: jest.fn(), ingestCheckoutOrder: jest.fn(),
  parseAttrs: (attrs) => attrs || {},
  isCodOrder: () => false,
}));
jest.mock('../../config/logging.js', () => ({ logger: { warn: jest.fn(), error: jest.fn() } }));

const checkout = require('../../services/customCheckoutService.js');
const controller = require('../../controller/customCheckoutController.js');
const response = () => ({ status: jest.fn().mockReturnThis(), json: jest.fn() });

beforeEach(() => jest.resetAllMocks());

test('a verified provider preview is skipped during order import', async () => {
  checkout.fetchCheckoutOrder.mockResolvedValue({ result: {
    cart_data: { items: [{ variant_id: '536' }], custom_attributes: { velmique_pack_preview: '1' } },
  } });
  const res = response();
  await controller.orderWebhook({ brandId: 8, body: { order_id: 'preview' } }, res);
  expect(checkout.ingestCheckoutOrder).not.toHaveBeenCalled();
  expect(res.json).toHaveBeenCalledWith({ ok: true, skipped: 'pack_preview' });
});

test('regular checkout strips the reserved preview marker from browser input', async () => {
  checkout.ensureProductsPushed.mockResolvedValue([{ pushed: 'unchanged' }]);
  checkout.createCheckoutToken.mockResolvedValue({ token: 'regular-fixture' });
  await controller.createToken({ brandId: 8, brand: { slug: 'velmique' }, headers: {}, body: {
    items: [{ variant_id: 536, quantity: 1 }], redirect_url: 'https://velmique.co.in/order-confirmation',
    custom_attributes: { velmique_pack_preview: '1' },
  } }, response());
  expect(checkout.createCheckoutToken.mock.calls[0][1].custom_attributes).toEqual({ store: 'velmique' });
});
