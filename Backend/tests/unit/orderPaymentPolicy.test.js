const {paymentStatusAfterCancellation,assertPaymentCanConfirm,cancellationRefundInfo}=require('../../services/orderPaymentPolicy.js');
test.each([
 ['paid','refund_pending'],['pending','cancelled'],['failed','cancelled'],['cancelled','cancelled'],
 ['refund_pending','refund_pending'],['partial_refund','partial_refund'],['refunded','refunded'],
])('closing fulfillment keeps %s money state as %s', (before,after)=>{
 expect(paymentStatusAfterCancellation(before)).toBe(after);
});
test.each(['pending','failed','refund_pending','partial_refund','refunded','cancelled'])('prepaid %s cannot be confirmed',(payment_status)=>{
 expect(()=>assertPaymentCanConfirm({payment_type:'razorpay',payment_status})).toThrow('payment');
 try{assertPaymentCanConfirm({payment_type:'razorpay',payment_status});}catch(error){expect(error.status).toBe(409);}
});
test.each(['cod','razorpay','upi','credit_card'])('a paid %s order can be confirmed',(payment_type)=>{
 expect(()=>assertPaymentCanConfirm({payment_type,payment_status:'paid'})).not.toThrow();
});
test('COD is confirmable before collection, but refunds/cancellation cannot be reopened as confirmation',()=>{
 expect(()=>assertPaymentCanConfirm({payment_type:'cod',payment_status:'pending'})).not.toThrow();
 for(const payment_status of ['refunded','partial_refund','refund_pending','cancelled','failed'])expect(()=>assertPaymentCanConfirm({payment_type:'cod',payment_status})).toThrow();
});
test('cancellation messages distinguish no payment, pending, partial and completed refunds',()=>{
 expect(cancellationRefundInfo({payment_type:'cod',payment_status:'cancelled'})).toMatch('no refund is needed');
 expect(cancellationRefundInfo({payment_type:'razorpay',payment_status:'pending'})).toMatch('No payment was collected');
 for(const payment_status of ['paid','refund_pending']){
  const text=cancellationRefundInfo({payment_type:'razorpay',payment_status});expect(text).toMatch('refund is pending');expect(text).not.toMatch(/already been processed|5.?7|₹/);
 }
 expect(cancellationRefundInfo({payment_type:'razorpay',payment_status:'partial_refund'})).toMatch('partial refund has already been processed');
 expect(cancellationRefundInfo({payment_type:'razorpay',payment_status:'refunded'})).toBe('Your refund has already been processed.');
});
