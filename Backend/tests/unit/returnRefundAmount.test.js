jest.mock('sequelize',()=>({Op:{in:Symbol.for('in')}}),{virtual:true});
jest.mock('../../config/logging.js',()=>({logger:{warn:jest.fn(),error:jest.fn()}}));
jest.mock('../../model/associations.js',()=>({Return:{findByPk:jest.fn()},Order:{findByPk:jest.fn()},User:{findByPk:jest.fn()},Payment:{findOne:jest.fn()},OrderStatusHistory:{create:jest.fn()}}));
jest.mock('../../services/imagekitService.js',()=>({}));
jest.mock('../../services/settingsHelper.js',()=>({}));
jest.mock('../../services/refundService.js',()=>({processRefund:jest.fn(async()=>({success:true,refund:{amount:300}}))}));
jest.mock('../../services/exceptionsService.js',()=>({logEvent:jest.fn()}));
const models=require('../../model/associations.js'),refund=require('../../services/refundService.js');
const {refundReturn}=require('../../controller/returnController.js');
let ret,order;
const response=()=>{const r={status:jest.fn(),json:jest.fn()};r.status.mockReturnValue(r);return r;};
beforeEach(()=>{
 jest.clearAllMocks();order={id:1,brand_id:3,status:'return_initiated',final_amount:799,update:jest.fn(),reload:jest.fn()};
 ret={id:2,order_id:1,return_number:'RET-1',status:'received',requested_amount:300,refund_amount:300,Order:order,update:jest.fn(),reload:jest.fn()};models.Return.findByPk.mockResolvedValue(ret);models.Payment.findOne.mockResolvedValue({id:10,transaction_id:'pay_fixture'});
});
test('an approved ₹300 return against a ₹799 payment sends exactly ₹300, never the full-payment shortcut',async()=>{
 const r=response();await refundReturn({params:{id:2},body:{},user:{id:5}},r);
 expect(refund.processRefund).toHaveBeenCalledWith(expect.objectContaining({paymentId:10,amount:300,brandId:3}));expect(r.status).not.toHaveBeenCalled();
});
test.each([0,'bad','300oops',true,0.001,300.01])('invalid return amount %p is rejected before saving or refunding',async(refund_amount)=>{
 const r=response();await refundReturn({params:{id:2},body:{refund_amount},user:{id:5}},r);
 expect(r.status).toHaveBeenCalledWith(400);expect(ret.update).not.toHaveBeenCalled();expect(refund.processRefund).not.toHaveBeenCalled();
});
test('an invalid previously stored amount cannot become a full refund',async()=>{
 ret.refund_amount=0;const r=response();await refundReturn({params:{id:2},body:{},user:{id:5}},r);
 expect(r.status).toHaveBeenCalledWith(400);expect(refund.processRefund).not.toHaveBeenCalled();
});
