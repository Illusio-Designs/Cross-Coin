jest.mock('sequelize',()=>({Op:{or:Symbol.for('or')}}),{virtual:true});
jest.mock('timers',()=>({setImmediate:jest.fn()}));
jest.mock('../../config/db.js',()=>({sequelize:{query:jest.fn(),transaction:jest.fn()}}));
jest.mock('../../config/logging.js',()=>({logger:{debug:jest.fn(),info:jest.fn(),warn:jest.fn(),error:jest.fn()}}));
jest.mock('../../model/orderModel.js',()=>({Order:{findOne:jest.fn(),findAll:jest.fn()}}));
jest.mock('../../model/orderItemModel.js',()=>({OrderItem:{findAll:jest.fn()}}));
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
jest.mock('../../services/shippingProviderFactory.js',()=>({getProviderByName:jest.fn(),getShippingProvider:jest.fn(),getProviderName:jest.fn()}));
jest.mock('../../services/loyaltyService.js',()=>({reversePointsLater:jest.fn(),creditPoints:jest.fn()}));
jest.mock('../../services/addressQualityService.js',()=>({getAddressHash:jest.fn()}));
jest.mock('../../model/addressQualityScoreModel.js',()=>({AddressQualityScore:{increment:jest.fn()}}));
jest.mock('../../services/orderService.js',()=>({auditLog:jest.fn()}));
jest.mock('../../controller/returnController.js',()=>({applyReversePickupEvent:jest.fn(async()=>false)}));
jest.mock('../../services/ndrService.js',()=>({onStatus:jest.fn(async()=>{})}));
jest.mock('../../services/whatsappService.js',()=>({sendDeliveredWithInvoice:jest.fn(),sendOutForDelivery:jest.fn(),sendDeliveryFailed:jest.fn(),sendOrderPacked:jest.fn(),sendRtoPrepaid:jest.fn()}));
jest.mock('../../services/refundService.js',()=>({autoRefundOnRtoReceipt:jest.fn()}));
jest.mock('../../services/pickupScheduleService.js',()=>({shouldHoldForPickup:jest.fn(async()=>null),getNextPickupDate:jest.fn()}));
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
const {commitTransaction,rollbackTransaction}=require('../../utils/transactionEffects.js');
const loyalty=require('../../services/loyaltyService.js');
const refund=require('../../services/refundService.js');
const {OrderItem}=require('../../model/orderItemModel.js');
const {AddressQualityScore}=require('../../model/addressQualityScoreModel.js');
const pickup=require('../../services/pickupScheduleService.js');
const {OrderStatusHistory}=require('../../model/orderStatusHistoryModel.js');
const {Payment}=require('../../model/paymentModel.js');
beforeEach(()=>{jest.clearAllMocks();OrderItem.findAll.mockResolvedValue([]);sequelize.query.mockResolvedValue([[]]);OrderShipment.findOne.mockResolvedValue(null);ShippingAddress.findOne.mockResolvedValue({phone:'9999999999',full_name:'Test Buyer'});});
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
const flushEffects=async()=>{for(let i=0;i<setImmediate.mock.calls.length;i++)await setImmediate.mock.calls[i][0]();};
const settleWork=async()=>{for(let i=0;i<50;i++)await Promise.resolve();};
function ownedTransaction(){const tx={commit:jest.fn(),rollback:jest.fn()};sequelize.transaction.mockResolvedValue(tx);return tx;}
test('poll effects wait while the owning commit is pending, then send once',async()=>{
 const order=orderAt('out for delivery');order.shipping_order_id='provider-1';const tx=ownedTransaction();let release;
 tx.commit.mockImplementationOnce(()=>new Promise(resolve=>{release=resolve;}));
 const result=shipping.enhancedSyncSingleOrder(order,null,providerAt('delivered'),'fixture');await settleWork();
 expect(tx.commit).toHaveBeenCalledTimes(1);expect(setImmediate).not.toHaveBeenCalled();expect(whatsapp.sendDeliveredWithInvoice).not.toHaveBeenCalled();
 release();expect(await result).toMatchObject({success:true,action:'updated'});await flushEffects();
 expect(whatsapp.sendDeliveredWithInvoice).toHaveBeenCalledTimes(1);
});
test('a failed poll commit discards notifications and quality updates, preserving the original error',async()=>{
 const order=orderAt('out for delivery');order.shipping_order_id='provider-1';const tx=ownedTransaction();
 tx.commit.mockImplementationOnce(async()=>{tx.finished='commit';throw Error('commit unavailable');});
 const result=await shipping.enhancedSyncSingleOrder(order,null,providerAt('delivered'),'fixture');await flushEffects();
 expect(result).toMatchObject({success:false,error:'commit unavailable'});expect(tx.rollback).not.toHaveBeenCalled();
 expect(setImmediate).not.toHaveBeenCalled();expect(whatsapp.sendDeliveredWithInvoice).not.toHaveBeenCalled();expect(AddressQualityScore.increment).not.toHaveBeenCalled();
});
test('RTO loyalty reversal is deferred and discarded on rollback',async()=>{
 const order=orderAt('shipped'),tx={commit:jest.fn(),rollback:jest.fn()};
 expect(await updateOrderStatusFromShipping(order,tx,providerAt('rto'),'fixture')).toMatchObject({success:true});
 expect(loyalty.reversePointsLater).not.toHaveBeenCalled();expect(setImmediate).not.toHaveBeenCalled();
 await rollbackTransaction(tx);await flushEffects();expect(loyalty.reversePointsLater).not.toHaveBeenCalled();expect(whatsapp.sendRtoPrepaid).not.toHaveBeenCalled();
});
test('RTO loyalty reversal runs only after a successful commit',async()=>{
 const order=orderAt('shipped'),tx={commit:jest.fn(),rollback:jest.fn()};await updateOrderStatusFromShipping(order,tx,providerAt('rto'),'fixture');
 await commitTransaction(tx);await flushEffects();expect(loyalty.reversePointsLater).toHaveBeenCalledTimes(1);expect(whatsapp.sendRtoPrepaid).toHaveBeenCalledTimes(1);expect(refund.autoRefundOnRtoReceipt).not.toHaveBeenCalled();
});
test.each(['missing','error'])('warehouse refund is independent of %s WhatsApp contact lookup',async(mode)=>{
 const order=orderAt('rto'),tx={commit:jest.fn(),rollback:jest.fn()};
 if(mode==='missing')ShippingAddress.findOne.mockResolvedValue(null);else ShippingAddress.findOne.mockRejectedValueOnce(Error('contact unavailable')).mockRejectedValueOnce(Error('contact unavailable'));
 await updateOrderStatusFromShipping(order,tx,providerAt('rto delivered'),'fixture');expect(refund.autoRefundOnRtoReceipt).not.toHaveBeenCalled();
 await commitTransaction(tx);await flushEffects();expect(refund.autoRefundOnRtoReceipt).toHaveBeenCalledTimes(1);
 expect(refund.autoRefundOnRtoReceipt).toHaveBeenCalledWith(1,'Prepaid RTO received at warehouse',null);
});
test('a failed warehouse-receipt commit never starts the refund',async()=>{
 const order=orderAt('rto'),tx={commit:jest.fn(async()=>{throw Error('commit failed');}),rollback:jest.fn()};
 await updateOrderStatusFromShipping(order,tx,providerAt('rto delivered'),'fixture');
 await expect(commitTransaction(tx)).rejects.toThrow('commit failed');await flushEffects();expect(refund.autoRefundOnRtoReceipt).not.toHaveBeenCalled();expect(setImmediate).not.toHaveBeenCalled();
});
test('webhook warehouse refund also runs without a phone and after commit',async()=>{
 const order=orderAt('rto');Order.findOne.mockResolvedValue(order);ShippingAddress.findOne.mockResolvedValue(null);const tx=ownedTransaction();factory.getProviderByName.mockReturnValue(providerAt('rto delivered'));
 let release;tx.commit.mockImplementationOnce(()=>new Promise(resolve=>{release=resolve;}));
 const result=shipping.handleShippingWebhook({body:{waybill:'AWB-1',status:'rto delivered'}},response());await settleWork();
 expect(setImmediate).not.toHaveBeenCalled();expect(refund.autoRefundOnRtoReceipt).not.toHaveBeenCalled();
 release();await result;await flushEffects();expect(refund.autoRefundOnRtoReceipt).toHaveBeenCalledTimes(1);
});
test('caller-owned booking queues its packed notice until the outer commit',async()=>{
 const order=orderAt('confirmed'),tx={commit:jest.fn(),rollback:jest.fn()};const create=jest.spyOn(shipping,'createOrderInShipping').mockResolvedValueOnce({success:true,waybill:'AWB-1'});
 try{expect(await shipping.enhancedSyncSingleOrder(order,tx,providerAt('booked'),'fixture')).toMatchObject({success:true});expect(tx.commit).not.toHaveBeenCalled();expect(setImmediate).not.toHaveBeenCalled();await commitTransaction(tx);await flushEffects();expect(whatsapp.sendOrderPacked).toHaveBeenCalledTimes(1);}finally{create.mockRestore();}
});
test('a failed pickup-hold commit cannot continue into courier booking',async()=>{
 const order=orderAt('confirmed'),tx=ownedTransaction();pickup.shouldHoldForPickup.mockResolvedValueOnce('2026-11-15');
 tx.commit.mockImplementationOnce(async()=>{tx.finished='commit';throw Error('hold commit failed');});const create=jest.spyOn(shipping,'createOrderInShipping');
 try{expect(await shipping.enhancedSyncSingleOrder(order,null,providerAt('booked'),'fixture')).toMatchObject({success:false,error:'hold commit failed'});expect(create).not.toHaveBeenCalled();expect(setImmediate).not.toHaveBeenCalled();}finally{create.mockRestore();}
});
test('nested courier selection sends one packed notice after the outer commit',async()=>{
 const order=orderAt('confirmed'),tx=ownedTransaction();let release;tx.commit.mockImplementationOnce(()=>new Promise(resolve=>{release=resolve;}));
 const create=jest.spyOn(shipping,'createOrderInShipping').mockResolvedValueOnce({success:true,waybill:'AWB-1'});
 const select=jest.spyOn(shipping,'autoSelectCourierWithFallback').mockImplementationOnce(async(o,p,t)=>({success:true,courier:'fixture-courier',result:await shipping.enhancedSyncSingleOrder(o,t,p,'ithink','fixture-courier')}));
 try{
  const result=shipping.enhancedSyncSingleOrder(order,null,providerAt('booked'),'ithink');await settleWork();expect(setImmediate).not.toHaveBeenCalled();expect(tx.commit).toHaveBeenCalledTimes(1);
  release();expect(await result).toMatchObject({success:true});await flushEffects();expect(whatsapp.sendOrderPacked).toHaveBeenCalledTimes(1);
 }finally{create.mockRestore();select.mockRestore();}
});
test.each([false,true])('bulk refresh commit failure=%s gates the background work',async(fail)=>{
 const order=orderAt('out for delivery'),tx=ownedTransaction(),provider=providerAt('delivered');Order.findAll.mockResolvedValue([order]);
 provider.testConnection=jest.fn(async()=>({success:true}));factory.getShippingProvider.mockResolvedValue(provider);factory.getProviderName.mockResolvedValue('fixture');
 if(fail)tx.commit.mockImplementationOnce(async()=>{tx.finished='commit';throw Error('bulk commit failed');});
 const validate=jest.spyOn(shipping,'validateOrderForShipping').mockReturnValue([]),r=response();
 try{
  await shipping.bulkRefreshShippingStatus({query:{limit:'1'}},r);await flushEffects();
  expect(r.json).toHaveBeenCalledWith(expect.objectContaining({data:expect.objectContaining({updated:fail?0:1,errors:fail?1:0})}));
  expect(whatsapp.sendDeliveredWithInvoice).toHaveBeenCalledTimes(fail?0:1);
 }finally{validate.mockRestore();}
});
test('a rejected webhook warehouse-receipt commit never starts a refund or message',async()=>{
 const order=orderAt('rto');Order.findOne.mockResolvedValue(order);const tx=ownedTransaction();factory.getProviderByName.mockReturnValue(providerAt('rto delivered'));
 tx.commit.mockImplementationOnce(async()=>{tx.finished='commit';throw Error('webhook commit failed');});const r=response();
 await shipping.handleShippingWebhook({body:{waybill:'AWB-1',status:'rto delivered'}},r);await flushEffects();
 expect(r.status).toHaveBeenCalledWith(500);expect(setImmediate).not.toHaveBeenCalled();expect(refund.autoRefundOnRtoReceipt).not.toHaveBeenCalled();expect(tx.rollback).not.toHaveBeenCalled();
});
