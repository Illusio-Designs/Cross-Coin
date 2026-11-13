jest.mock('../../config/logging.js', () => ({logger:{info:jest.fn(),warn:jest.fn(),error:jest.fn()}}));
jest.mock('../../config/db.js', () => ({sequelize:{transaction:jest.fn()}}));
jest.mock('../../model/paymentModel.js', () => ({Payment:{findByPk:jest.fn(),create:jest.fn()}}));
jest.mock('../../model/orderModel.js', () => ({Order:{findByPk:jest.fn()}}));
jest.mock('../../model/orderStatusHistoryModel.js', () => ({OrderStatusHistory:{create:jest.fn()}}));
jest.mock('../../model/shippingAddressModel.js', () => ({ShippingAddress:{findByPk:jest.fn()}}));
jest.mock('../../services/razorpayService.js', () => ({createRefund:jest.fn()}));
jest.mock('../../services/customCheckoutService.js', () => ({initiateRefund:jest.fn()}));
jest.mock('../../services/orderService.js', () => ({auditLog:jest.fn()}));
jest.mock('../../services/whatsappService.js', () => ({sendRefundProcessed:jest.fn()}));
jest.mock('../../services/loyaltyService.js', () => ({reversePointsLater:jest.fn()}));
const {sequelize}=require('../../config/db.js');
const {Payment}=require('../../model/paymentModel.js');
const {Order}=require('../../model/orderModel.js');
const {ShippingAddress}=require('../../model/shippingAddressModel.js');
const {OrderStatusHistory}=require('../../model/orderStatusHistoryModel.js');
const gateway=require('../../services/razorpayService.js');
const custom=require('../../services/customCheckoutService.js');
const whatsapp=require('../../services/whatsappService.js');
const loyalty=require('../../services/loyaltyService.js');
const {processRefund}=require('../../services/refundService.js');
let scheduled,releaseCommit,commitError;
const options={paymentId:10,amount:null,reason:'Customer cancelled',adminId:5,brandId:3};
beforeEach(()=>{
 jest.clearAllMocks();scheduled=[];commitError=null;
 jest.spyOn(global,'setImmediate').mockImplementation(fn=>scheduled.push(fn));
 const committed=new Promise(resolve=>{releaseCommit=resolve;});
 sequelize.transaction.mockImplementation(async work=>{const result=await work({});await committed;if(commitError)throw commitError;return result;});
 const payment={id:10,order_id:1,brand_id:3,status:'successful',payment_type:'razorpay',payment_gateway:'Razorpay',transaction_id:'pay_fixture',amount_paid:79900};
 payment.update=jest.fn(async patch=>Object.assign(payment,patch));Payment.findByPk.mockResolvedValue(payment);
 const order={id:1,order_number:'ORDER-1',brand_id:3,user_id:2,shipping_address_id:4,status:'cancelled',payment_status:'refund_pending'};
 order.update=jest.fn(async patch=>Object.assign(order,patch));Order.findByPk.mockResolvedValue(order);
 ShippingAddress.findByPk.mockResolvedValue({phone:'9999999999',full_name:'Test Buyer'});
 gateway.createRefund.mockResolvedValue({id:'rfnd_fixture',status:'processed'});
 custom.initiateRefund.mockResolvedValue({data:{id:'provider_refund_fixture',status:'INITIATED'}});
});
afterEach(()=>jest.restoreAllMocks());
const finish=async()=>{while(scheduled.length)await scheduled.shift()();};
const waitForWork=async()=>{for(let i=0;i<30;i++)await Promise.resolve();};
test('refund notifications and loyalty reversal wait for the refund records to commit',async()=>{
 const result=processRefund(options);await waitForWork();
 expect(gateway.createRefund).toHaveBeenCalledWith('pay_fixture',expect.objectContaining({amount:799,brandId:3}));
 expect(scheduled).toHaveLength(0);expect(loyalty.reversePointsLater).not.toHaveBeenCalled();expect(whatsapp.sendRefundProcessed).not.toHaveBeenCalled();
 releaseCommit();await expect(result).resolves.toMatchObject({success:true});await finish();
 expect(loyalty.reversePointsLater).toHaveBeenCalledWith(1,expect.objectContaining({ref:'rfnd_fixture'}));
 expect(whatsapp.sendRefundProcessed).toHaveBeenCalledWith('9999999999',expect.objectContaining({orderNumber:'ORDER-1',amount:'799.00'}),3);
});
test('failed refund commit never sends a success message or reverses loyalty',async()=>{
 const result=processRefund(options);await waitForWork();commitError=new Error('commit failed');releaseCommit();
 await expect(result).rejects.toThrow('commit failed');await finish();
 expect(loyalty.reversePointsLater).not.toHaveBeenCalled();expect(whatsapp.sendRefundProcessed).not.toHaveBeenCalled();
});
test('failed refund audit never queues a success message or loyalty reversal',async()=>{
 OrderStatusHistory.create.mockRejectedValueOnce(new Error('audit failed'));
 await expect(processRefund(options)).rejects.toThrow('audit failed');await finish();
 expect(scheduled).toHaveLength(0);expect(loyalty.reversePointsLater).not.toHaveBeenCalled();expect(whatsapp.sendRefundProcessed).not.toHaveBeenCalled();
});
test('a failed optional loyalty callback cannot suppress the refund message or reject the saved refund',async()=>{
 loyalty.reversePointsLater.mockImplementationOnce(()=>{throw Error('loyalty unavailable');});releaseCommit();
 await expect(processRefund(options)).resolves.toMatchObject({success:true});await finish();
 expect(whatsapp.sendRefundProcessed).toHaveBeenCalledTimes(1);
});
test('custom-checkout refund keeps its provider route, amount and brand',async()=>{
 const payment=await Payment.findByPk();payment.payment_gateway='CustomCheckout';payment.transaction_id='provider_txn';payment.notes='Custom checkout: cart_id cart-123';
 releaseCommit();await processRefund({...options,amount:200});await finish();
 expect(custom.initiateRefund).toHaveBeenCalledWith(3,{transaction_id:'provider_txn',cart_id:'cart-123',amount:200,refund_type:'PARTIAL'});
 expect(gateway.createRefund).not.toHaveBeenCalled();
 expect(loyalty.reversePointsLater).toHaveBeenCalledWith(1,expect.objectContaining({amount:200,ref:'provider_refund_fixture'}));
});
test.each([0,'0','',NaN,Infinity,-1,'200oops',true,0.001,799.01])('invalid amount %p never calls a gateway or writes a refund',async(amount)=>{
 releaseCommit();await expect(processRefund({...options,amount})).rejects.toThrow('Refund amount');
 expect(gateway.createRefund).not.toHaveBeenCalled();expect(custom.initiateRefund).not.toHaveBeenCalled();expect(Payment.create).not.toHaveBeenCalled();
});
test.each(['payment','order','request'])('wrong %s brand cannot use another store refund credentials',async(kind)=>{
 const payment=await Payment.findByPk(),order=await Order.findByPk();if(kind==='payment')payment.brand_id=4;if(kind==='order')order.brand_id=4;
 releaseCommit();await expect(processRefund({...options,brandId:kind==='request'?4:3})).rejects.toThrow('requested store');expect(gateway.createRefund).not.toHaveBeenCalled();expect(custom.initiateRefund).not.toHaveBeenCalled();
});
test('a negative refund ledger row is never treated as a captured payment',async()=>{
 const payment=await Payment.findByPk();payment.amount_paid=-79900;releaseCommit();await expect(processRefund(options)).rejects.toThrow('payment amount');expect(gateway.createRefund).not.toHaveBeenCalled();
});
test('a COD payment cannot use the hosted-checkout refund route',async()=>{
 const payment=await Payment.findByPk();Object.assign(payment,{payment_type:'cod',payment_gateway:'CustomCheckout'});releaseCommit();await expect(processRefund(options)).rejects.toThrow('manual payout');expect(custom.initiateRefund).not.toHaveBeenCalled();
});
test('simultaneous refund requests serialize on the order and re-read the payment before calling the gateway',async()=>{
 let lock=Promise.resolve();const order=await Order.findByPk();
 Order.findByPk.mockImplementation(async(id,{transaction,lock:forUpdate})=>{
  expect(forUpdate).toBe(true);const previous=lock;lock=new Promise(resolve=>{transaction.release=resolve;});await previous;return order;
 });
 sequelize.transaction.mockImplementation(async work=>{const t={};try{return await work(t);}finally{t.release?.();}});
 const results=await Promise.allSettled([processRefund(options),processRefund(options)]);
 expect(results.filter(r=>r.status==='fulfilled')).toHaveLength(1);expect(results.filter(r=>r.status==='rejected')).toHaveLength(1);
 expect(gateway.createRefund).toHaveBeenCalledTimes(1);expect(Payment.create).toHaveBeenCalledTimes(1);
 expect(Payment.findByPk).toHaveBeenCalledWith(10,expect.objectContaining({lock:true}));
});
