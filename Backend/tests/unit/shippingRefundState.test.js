jest.mock('sequelize',()=>({Op:{or:Symbol.for('or')}}),{virtual:true});
jest.mock('timers',()=>({setImmediate:jest.fn()}));
jest.mock('../../config/db.js',()=>({sequelize:{query:jest.fn(),transaction:jest.fn()}}));
jest.mock('../../config/logging.js',()=>({logger:{debug:jest.fn(),info:jest.fn(),warn:jest.fn(),error:jest.fn()}}));
jest.mock('../../model/orderModel.js',()=>({Order:{findOne:jest.fn()}}));
jest.mock('../../model/orderItemModel.js',()=>({OrderItem:{}}));
jest.mock('../../model/orderStatusHistoryModel.js',()=>({OrderStatusHistory:{create:jest.fn()}}));
jest.mock('../../model/productModel.js',()=>({Product:{}}));
jest.mock('../../model/productVariationModel.js',()=>({ProductVariation:{}}));
jest.mock('../../model/shippingAddressModel.js',()=>({ShippingAddress:{findOne:jest.fn()}}));
jest.mock('../../model/paymentModel.js',()=>({Payment:{findOne:jest.fn()}}));
jest.mock('../../model/userModel.js',()=>({User:{}}));
jest.mock('../../model/guestUserModel.js',()=>({GuestUser:{}}));
jest.mock('../../model/brandModel.js',()=>({}));
jest.mock('../../model/orderShipmentModel.js',()=>({OrderShipment:{findOne:jest.fn(),create:jest.fn()}}));
jest.mock('../../services/settingsHelper.js',()=>({}));
jest.mock('../../services/shippingValidationService.js',()=>({}));
jest.mock('../../services/shippingProviderFactory.js',()=>({getProviderByName:jest.fn()}));
jest.mock('../../services/loyaltyService.js',()=>({}));
jest.mock('../../services/addressQualityService.js',()=>({getAddressHash:jest.fn()}));
jest.mock('../../model/addressQualityScoreModel.js',()=>({AddressQualityScore:{}}));
jest.mock('../../services/orderService.js',()=>({auditLog:jest.fn()}));
jest.mock('../../controller/returnController.js',()=>({applyReversePickupEvent:jest.fn(async()=>false)}));
jest.mock('../../services/ndrService.js',()=>({onStatus:jest.fn(async()=>{})}));
jest.mock('../../services/whatsappService.js',()=>({sendDeliveredWithInvoice:jest.fn(),sendOutForDelivery:jest.fn(),sendDeliveryFailed:jest.fn()}));
const shipping=require('../../controller/orderShippingController.js');
const {updateOrderStatusFromShipping}=shipping;
const {Order}=require('../../model/orderModel.js');
const {ShippingAddress}=require('../../model/shippingAddressModel.js');
const {OrderShipment}=require('../../model/orderShipmentModel.js');
const {sequelize}=require('../../config/db.js');
const factory=require('../../services/shippingProviderFactory.js');
const {setImmediate}=require('timers');
const whatsapp=require('../../services/whatsappService.js');
const {auditLog}=require('../../services/orderService.js');
const {OrderStatusHistory}=require('../../model/orderStatusHistoryModel.js');
const {Payment}=require('../../model/paymentModel.js');
beforeEach(()=>{jest.clearAllMocks();sequelize.query.mockResolvedValue([[]]);OrderShipment.findOne.mockResolvedValue(null);ShippingAddress.findOne.mockResolvedValue({phone:'9999999999',full_name:'Test Buyer'});});
test.each(['refund_pending','partial_refund','refunded'])('courier warehouse receipt preserves existing %s state',async(payment_status)=>{
 const order={id:1,order_number:'ORDER-1',brand_id:3,status:'rto',payment_type:'razorpay',payment_status,shipping_waybill:'AWB-1',shipping_label_url:'https://example.test/label'};
 order.update=jest.fn(async patch=>Object.assign(order,patch));
 order.reload=jest.fn(async()=>order);
 const provider={getTrackingHistory:jest.fn(async()=>({summary:{status:'returned'}})),mapShippingStatusToCrossCoin:()=> 'rto delivered'};
 const transaction={};const result=await updateOrderStatusFromShipping(order,transaction,provider,'fixture');
 expect(result).toMatchObject({success:true,statusChanged:true,newStatus:'rto delivered'});
 expect(order.payment_status).toBe(payment_status);
 expect(order.update).toHaveBeenCalledWith(expect.objectContaining({status:'rto delivered',payment_status}),{transaction});
 expect(OrderStatusHistory.create).toHaveBeenCalledWith(expect.objectContaining({status:'rto delivered'}),{transaction});
 expect(Payment.findOne).not.toHaveBeenCalled();
});
function orderAt(status){
 const order={id:1,order_number:'ORDER-1',brand_id:3,status,payment_type:'razorpay',payment_status:'paid',shipping_waybill:'AWB-1',shipping_address_id:4,shipping_label_url:'https://example.test/label'};
 order.update=jest.fn(async patch=>Object.assign(order,patch));order.reload=jest.fn(async()=>order);return order;
}
function providerAt(status){return {getTrackingHistory:jest.fn(async()=>({summary:{status:'provider-scan'}})),mapShippingStatusToCrossCoin:()=>status};}
const response=()=>{const r={json:jest.fn(),status:jest.fn()};r.status.mockReturnValue(r);return r;};
test.each([
 ['delivered','undelivered'],['delivered','cancelled'],['delivered','rto'],
 ['cancelled','delivered'],['rto delivered','rto'],['returned_rto','undelivered'],['in transit','manifested'],
 ['rto','delivered'],['return_initiated','delivered'],['shipped',null],
])('poll ignores %s → %s without status history, payment changes or notifications',async(current,incoming)=>{
 const order=orderAt(current);const result=await updateOrderStatusFromShipping(order,{},providerAt(incoming),'fixture');
 expect(result).toMatchObject({success:true,statusChanged:false});expect(order.status).toBe(current);expect(order.payment_status).toBe('paid');
 expect(OrderStatusHistory.create).not.toHaveBeenCalled();expect(Payment.findOne).not.toHaveBeenCalled();expect(setImmediate).not.toHaveBeenCalled();
 expect(order.reload).toHaveBeenCalledWith({transaction:{},lock:true,include:[]});
});
test.each([['delivered','undelivered'],['delivered','cancelled'],['cancelled','delivered'],['rto delivered','rto'],['shipped',null]])('webhook also ignores %s → %s',async(current,incoming)=>{
 const order=orderAt(current);Order.findOne.mockResolvedValue(order);
 const transaction={commit:jest.fn(),rollback:jest.fn()};sequelize.transaction.mockResolvedValue(transaction);
 factory.getProviderByName.mockReturnValue(providerAt(incoming));const r=response();
 await shipping.handleShippingWebhook({body:{waybill:'AWB-1',status:'provider-scan'}},r);
 expect(transaction.commit).toHaveBeenCalledTimes(1);expect(r.status).not.toHaveBeenCalled();expect(order.status).toBe(current);
 expect(Order.findOne).toHaveBeenCalledWith(expect.objectContaining({transaction,lock:true}));
 expect(OrderStatusHistory.create).not.toHaveBeenCalled();expect(setImmediate).not.toHaveBeenCalled();
});
test('a poll reloads the locked current row after the provider returns, preserving a concurrent cancellation',async()=>{
 const order=orderAt('out for delivery');order.reload.mockImplementationOnce(async()=>Object.assign(order,{status:'cancelled',payment_status:'refund_pending'}));
 await updateOrderStatusFromShipping(order,{},providerAt('delivered'),'fixture');
 expect(order.status).toBe('cancelled');expect(order.payment_status).toBe('refund_pending');expect(OrderStatusHistory.create).not.toHaveBeenCalled();expect(setImmediate).not.toHaveBeenCalled();
});
test('a response for a replaced waybill is discarded',async()=>{
 const order=orderAt('out for delivery');order.reload.mockImplementationOnce(async()=>Object.assign(order,{shipping_waybill:'NEW-AWB'}));
 const result=await updateOrderStatusFromShipping(order,{},providerAt('delivered'),'fixture');
 expect(result).toMatchObject({success:true,statusChanged:false});expect(order.status).toBe('out for delivery');expect(order.update).not.toHaveBeenCalled();expect(setImmediate).not.toHaveBeenCalled();
});
test('webhook followed by polling delivery records one transition and one customer message',async()=>{
 const order=orderAt('out for delivery');Order.findOne.mockResolvedValue(order);
 const transaction={commit:jest.fn(),rollback:jest.fn()};sequelize.transaction.mockResolvedValue(transaction);factory.getProviderByName.mockReturnValue(providerAt('delivered'));
 await shipping.handleShippingWebhook({body:{waybill:'AWB-1',status:'delivered'}},response());
 const poll=await updateOrderStatusFromShipping(order,{},providerAt('delivered'),'fixture');expect(poll.statusChanged).toBe(false);
 expect(OrderStatusHistory.create).toHaveBeenCalledTimes(1);expect(setImmediate).toHaveBeenCalledTimes(1);
 for(const [task] of setImmediate.mock.calls)await task();
 expect(whatsapp.sendDeliveredWithInvoice).toHaveBeenCalledTimes(1);expect(whatsapp.sendDeliveredWithInvoice).toHaveBeenCalledWith('9999999999',expect.objectContaining({orderNumber:'ORDER-1'}),3);
});
test('a real delivery re-attempt advances, and audit keeps the true previous status',async()=>{
 const order=orderAt('undelivered');const result=await updateOrderStatusFromShipping(order,{},providerAt('out for delivery'),'fixture');
 expect(result).toMatchObject({success:true,statusChanged:true,previousStatus:'undelivered',newStatus:'out for delivery'});
 expect(auditLog).toHaveBeenCalledWith(1,'shipping_status_change',null,'fixture_sync',expect.objectContaining({from:'undelivered',to:'out for delivery'}),{});
});
