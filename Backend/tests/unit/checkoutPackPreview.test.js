jest.mock('../../model/associations.js', () => ({ Product: { findAll: jest.fn() }, Category: {}, Brand: {} }));
jest.mock('../../model/bundleTierModel.js', () => ({ BundleTier: { findOne: jest.fn() } }));
jest.mock('../../services/settingsHelper.js', () => ({ getSetting: jest.fn() }));
jest.mock('../../services/customCheckoutService.js', () => ({
  isConfigured: jest.fn(), productIncludes: jest.fn(), mapProduct: jest.fn(), createCheckoutToken: jest.fn(),
  ensureProductsPushed: jest.fn(), fetchCheckoutOrder: jest.fn(), ingestCheckoutOrder: jest.fn(),
}));
jest.mock('../../config/logging.js', () => ({ logger: { warn: jest.fn(), error: jest.fn() } }));

const { Product } = require('../../model/associations.js');
const { BundleTier } = require('../../model/bundleTierModel.js');
const settings = require('../../services/settingsHelper.js');
const checkout = require('../../services/customCheckoutService.js');
const controller = require('../../controller/customCheckoutController.js');
const response = () => ({ set: jest.fn().mockReturnThis(), status: jest.fn().mockReturnThis(), json: jest.fn() });

beforeEach(() => jest.resetAllMocks());

test('preview sends server-priced Velmique units with the signed token flow and leaves the catalog alone', async () => {
  settings.getSetting.mockResolvedValue('true');
  checkout.isConfigured.mockResolvedValue(true);
  BundleTier.findOne.mockResolvedValue({ discount_percent: '20.00' });
  const products = [{ slug: 'muse', title: 'Muse', id: 536 }, { slug: 'halva', title: 'Halva', id: 517 }];
  Product.findAll.mockResolvedValue(products);
  checkout.mapProduct.mockImplementation(({ title, id }) => ({
    title, variants: [{ id, quantity: 2, price: '999.00', image: { src: `https://images.example/${id}.webp` } }],
  }));
  checkout.createCheckoutToken.mockResolvedValue({ result: { token: 'preview-fixture' } });
  const res = response();
  await controller.createPackPreview({ brandId: 8, brand: { slug: 'velmique' }, body: { price: 1 } }, res);
  expect(checkout.ensureProductsPushed).not.toHaveBeenCalled();
  expect(checkout.createCheckoutToken).toHaveBeenCalledWith(8, {
    items: products.map(({ title, id }) => ({ variant_id: String(id), quantity: 1, catalog_data: {
      name: title, price: 799.2, image_url: `https://images.example/${id}.webp`,
    } })),
    custom_attributes: { store: 'velmique', velmique_pack_preview: '1' }, mobile_app: false,
  }, 'https://velmique.co.in/checkout-preview');
  expect(res.set).toHaveBeenCalledWith('Cache-Control', 'no-store');
  expect(res.json).toHaveBeenCalledWith({ token: 'preview-fixture', expectedPaise: 159840 });
});

test('only Velmique can issue a preview', async () => {
  const res = response();
  await controller.createPackPreview({ brandId: 1, brand: { slug: 'crosscoin' } }, res);
  expect(res.status).toHaveBeenCalledWith(404);
  expect(checkout.createCheckoutToken).not.toHaveBeenCalled();
});

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
