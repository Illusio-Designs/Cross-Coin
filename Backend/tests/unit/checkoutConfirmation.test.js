jest.mock('../../model/associations.js', () => ({ Product: {}, Category: {}, Brand: {} }));
jest.mock('../../services/settingsHelper.js', () => ({}));
jest.mock('../../config/logging.js', () => ({ logger: { error: jest.fn(), warn: jest.fn() } }));
jest.mock('../../services/customCheckoutService.js', () => ({ fetchCheckoutOrder: jest.fn(), ingestCheckoutOrder: jest.fn(), purchasePayload: jest.fn() }));
jest.mock('../../integration/facebookPixel.js', () => ({ buyerMatchKeys: jest.fn(() => ({})), sendFacebookEvent: jest.fn() }));
const svc = require('../../services/customCheckoutService');
const { confirmReturn } = require('../../controller/customCheckoutController');
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
