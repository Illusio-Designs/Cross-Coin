jest.mock('axios',()=>({}),{virtual:true});
jest.mock('../../config/logging.js',()=>({logger:{debug:jest.fn()}}));
jest.mock('../../services/settingsHelper.js',()=>({}));
const {IThinkService}=require('../../services/iThinkService.js');
const provider=new IThinkService(3);
test.each([null,undefined,'','UNKNOWN SCAN',999,'toString','__proto__'])('unknown courier status %s never becomes a processing scan',status=>{
 expect(provider.mapShippingStatusToCrossCoin(status)).toBeNull();
});
test.each([['Processing','processing'],['Delivered','delivered'],[' IN TRANSIT ','in transit'],['RTO Initiated','rto'],['RTO Delivered','rto delivered'],['Order Cancelled','order cancelled'],['Picked Up','pickup initiated'],['Ready To Ship','shipped']])('known courier %s maps to %s',(status,expected)=>{
 expect(provider.mapShippingStatusToCrossCoin(status)).toBe(expected);
});
