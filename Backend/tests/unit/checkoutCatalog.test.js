jest.mock('../../model/associations.js', () => ({ Product: { findAll: jest.fn() }, ProductVariation: { findAll: jest.fn() }, Category: {}, Brand: {} }));
jest.mock('../../services/settingsHelper.js', () => ({ getSetting: jest.fn() }));
jest.mock('../../controller/bundleController.js', () => ({ bundlePerUnit: jest.fn(), packDiscountPercent: jest.fn() }));
jest.mock('../../config/logging.js', () => ({ logger: { error: jest.fn() } }));
jest.mock('../../services/customCheckoutService.js', () => ({ ensureProductsPushed: jest.fn(), createCheckoutToken: jest.fn(),
  isConfigured: jest.fn(), productIncludes: jest.fn(), mapProduct: jest.fn(),
}));
const service = require('../../services/customCheckoutService');
const settings = require('../../services/settingsHelper');
const { bundlePerUnit } = require('../../controller/bundleController');
const { Product, ProductVariation } = require('../../model/associations');
const { createToken, createPackToken } = require('../../controller/customCheckoutController');
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
test.each([0,-1,1.5,'bad'])('invalid quantity %s is rejected before catalog sync or token creation',async(quantity)=>{
 const req=request();req.body.items[0].quantity=quantity;const res=response();await createToken(req,res);expect(res.status).toHaveBeenCalledWith(400);expect(service.ensureProductsPushed).not.toHaveBeenCalled();expect(service.createCheckoutToken).not.toHaveBeenCalled();
});
test('duplicate variant lines are combined before provider token creation',async()=>{
 const req=request();req.body.items.push({variant_id:12,quantity:1});service.ensureProductsPushed.mockResolvedValue([{productId:1,pushed:'unchanged'}]);service.createCheckoutToken.mockResolvedValue({token:'fixture-token'});await createToken(req,response());expect(service.createCheckoutToken).toHaveBeenCalledWith(2,expect.objectContaining({items:[{variant_id:'12',quantity:3}]}),expect.anything());
});

test('pack endpoint replaces browser pricing with the brand bundle price before signing', async () => {
  settings.getSetting.mockResolvedValue('true');
  service.isConfigured.mockResolvedValue(true);
  ProductVariation.findAll.mockResolvedValue([{ id: 12, productId: 3 }]);
  Product.findAll.mockResolvedValue([{ id: 3 }]);
  service.mapProduct.mockReturnValue({ title: 'Socks', variants: [{ id: 12, price: '300', quantity: 8, image: { src: 'https://example.com/socks.webp' } }] });
  bundlePerUnit.mockResolvedValue(240);
  service.ensureProductsPushed.mockResolvedValue([{ productId: 3, pushed: 'unchanged' }]);
  service.createCheckoutToken.mockResolvedValue({ token: 'fixture-pack' });
  const req = request();
  req.body.items[0].pack_id = 'bundle';
  req.body.items[0].catalog_data = { price: 1 };
  req.body.custom_attributes = { cc_pack_quote: 'forged' };
  const res = response();
  await createPackToken(req, res);
  expect(bundlePerUnit).toHaveBeenCalledWith(2, 3, 2);
  expect(service.createCheckoutToken).toHaveBeenCalledWith(2, expect.objectContaining({
    items: [{ variant_id: '12', quantity: 2, catalog_data: { price: 240, name: 'Socks', image_url: 'https://example.com/socks.webp' } }],
    custom_attributes: expect.not.objectContaining({ cc_pack_quote: 'forged' }),
  }), req.body.redirect_url, { pack: true });
  expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ success: true, token: 'fixture-pack' }));
});
