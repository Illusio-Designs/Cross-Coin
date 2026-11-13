const {resolveRefundAmount}=require('../../utils/refundAmount.js');
test.each([0,'0','0.00',NaN,Infinity,-1,'','  ','300abc','1e2',true,false,{},[],0.001,'0.001',799.01,'799.01'])('invalid refund %p cannot become a full refund',value=>{
 expect(()=>resolveRefundAmount(value,799)).toThrow('Refund amount');
});
test.each([null,undefined])('only %p defaults to the full eligible amount',value=>expect(resolveRefundAmount(value,799)).toEqual({amount:799,paise:79900,isPartial:false}));
test.each([[300,30000],['300.10',30010],[' 300.00 ',30000],[0.01,1]])('valid amount %p stays exact in paise',(value,paise)=>{
 expect(resolveRefundAmount(value,799)).toEqual({amount:paise/100,paise,isPartial:true});
});
test.each([0,-799,NaN,Infinity,'','bad',799.001])('invalid eligible balance %p is rejected',value=>expect(()=>resolveRefundAmount(null,value)).toThrow('payment amount'));
