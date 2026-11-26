jest.mock('../../services/prepaidRecoveryStore.js', () => ({ rememberCheckout: jest.fn(), validPaymentId: (id) => /^pay_/.test(id || '') }));
jest.mock('../../services/prepaidOrderRecovery.js', () => ({
  ...jest.requireActual('../../services/prepaidOrderRecovery.js'), resumeCaptureForCheckout: jest.fn(),
}));
jest.mock('../../model/associations.js', () => ({ Product: {}, Category: {}, Brand: {} }));
jest.mock('../../services/settingsHelper.js', () => ({}));
jest.mock('../../config/logging.js', () => ({ logger: { error: jest.fn(), warn: jest.fn() } }));
jest.mock('../../services/customCheckoutService.js', () => ({ fetchCheckoutOrder: jest.fn(), ingestCheckoutOrder: jest.fn(), purchasePayload: jest.fn(), parseAttrs: (attrs) => attrs || {}, isCodOrder: (order) => order.payment_method === 'COD' }));
jest.mock('../../integration/facebookPixel.js', () => ({ buyerMatchKeys: jest.fn(() => ({})), sendFacebookEvent: jest.fn() }));
const svc = require('../../services/customCheckoutService');
const { confirmReturn, verifyAndIngest, orderWebhook } = require('../../controller/customCheckoutController');
let immediate;
beforeEach(() => {
  jest.clearAllMocks(); immediate = jest.spyOn(global, 'setImmediate').mockImplementation(() => {});
  svc.fetchCheckoutOrder.mockResolvedValue({ result: { status:'SUCCESS', cart_data: { items:[{variant_id:12,quantity:1}] } } });
  svc.ingestCheckoutOrder.mockResolvedValue({order_number:'ORDER-1'});
  svc.purchasePayload.mockResolvedValue({ final_amount:799,items:[{product_id:4,quantity:1}],brand_id:1 });
});
afterEach(()=>immediate.mockRestore());
const req=()=>({brandId:1,body:{oid:'provider-1'},headers:{}});
const res=()=>{const r={json:jest.fn(),status:jest.fn()};r.status.mockReturnValue(r);return r;};
test('valid confirmation returns saved internal order and contents',async()=>{
 const r=res();await confirmReturn(req(),r);expect(r.json).toHaveBeenCalledWith(expect.objectContaining({ok:true,order_number:'ORDER-1',value:799,items:[{id:'4',quantity:1}]}));
});
test('unpaid checkout remains pending and is not reported as an order',async()=>{
 svc.ingestCheckoutOrder.mockResolvedValue({skipped:'awaiting_payment'});const r=res();await confirmReturn(req(),r);expect(r.json).toHaveBeenCalledWith(expect.objectContaining({ok:false,skipped:'awaiting_payment'}));expect(svc.purchasePayload).not.toHaveBeenCalled();
});
test('missing local or wrong-store payload never returns a false success',async()=>{
 svc.purchasePayload.mockResolvedValue(null);const r=res();await confirmReturn(req(),r);expect(r.status).toHaveBeenCalledWith(409);expect(r.json).toHaveBeenCalledWith(expect.objectContaining({ok:false,code:'CHECKOUT_CONFIRMATION_PENDING'}));
});
test('provider verification failure never imports or returns a success',async()=>{
 svc.fetchCheckoutOrder.mockRejectedValue(Error('unavailable'));const r=res();await confirmReturn(req(),r);expect(svc.ingestCheckoutOrder).not.toHaveBeenCalled();expect(r.status).toHaveBeenCalledWith(401);expect(r.json).toHaveBeenCalledWith(expect.objectContaining({ok:false}));
});

test.each([{ payment_status: 'pending' }, { payment_status: 'success', payment_method: 'COD' }])(
  'scheduled recovery skips an order whose details do not confirm a prepaid payment',
  async (payment) => {
    svc.fetchCheckoutOrder.mockResolvedValue({ result: { platform_order_id: 'provider-1', ...payment } });
    await expect(verifyAndIngest(1, 'provider-1', null, { prepaidOnly: true })).resolves.toEqual({ skipped: 'not_confirmed_prepaid' });
    expect(svc.ingestCheckoutOrder).not.toHaveBeenCalled();
  },
);

test('scheduled recovery rejects details for a different order ID', async () => {
  svc.fetchCheckoutOrder.mockResolvedValue({ result: { platform_order_id: 'provider-2', payment_status: 'success' } });
  await expect(verifyAndIngest(1, 'provider-1', null, { prepaidOnly: true })).rejects.toThrow('different order reference');
  expect(svc.ingestCheckoutOrder).not.toHaveBeenCalled();
});

test('an authenticated callback saves the checkout reference before a provider outage is returned', async () => {
  const { rememberCheckout } = require('../../services/prepaidRecoveryStore.js');
  svc.fetchCheckoutOrder.mockRejectedValue(Error('unavailable'));
  const response = res();
  await orderWebhook({ brandId: 1, body: { order_id: 'provider-1' } }, response);

  expect(rememberCheckout).toHaveBeenCalledWith(1, 'provider-1', { paymentId: null, gatewayOrderId: null });
  expect(rememberCheckout.mock.invocationCallOrder[0]).toBeLessThan(svc.fetchCheckoutOrder.mock.invocationCallOrder[0]);
  expect(response.status).toHaveBeenCalledWith(401);
});

test('a checkout callback supplies original details to an earlier Razorpay capture', async () => {
  const { resumeCaptureForCheckout } = require('../../services/prepaidOrderRecovery.js');
  const details = { platform_order_id: 'provider-1', payment_status: 'pending', status: 'PENDING', pg_order_id: 'order_fixture123' };
  svc.fetchCheckoutOrder.mockResolvedValue({ result: details });
  resumeCaptureForCheckout.mockResolvedValueOnce({ state: 'recovered', order: { order_number: 'ORDER-1', brand_id: 1 } });
  const response = res();
  await confirmReturn(req(), response);
  expect(resumeCaptureForCheckout).toHaveBeenCalledWith(1, 'provider-1', details,
    { paymentId: null, gatewayOrderId: 'order_fixture123' });
  expect(response.json).toHaveBeenCalledWith(expect.objectContaining({ ok: true, order_number: 'ORDER-1' }));
  expect(svc.ingestCheckoutOrder).not.toHaveBeenCalled();
});
