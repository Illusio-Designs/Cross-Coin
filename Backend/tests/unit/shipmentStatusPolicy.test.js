const {shouldAdvanceOrderStatus}=require('../../services/shipmentStatusPolicy.js');
const states=['pending','awaiting_confirmation','confirmed','processing','booked','pickup initiated','manifested','in transit','shipped','out for delivery','undelivered','exception','delivered','rto','return_initiated','rto delivered','returned_rto','cancelled','order cancelled'];
test.each(['cancelled','order cancelled','rto delivered','returned_rto'])('%s stays terminal for every courier scan',current=>{
 for(const incoming of states)expect(shouldAdvanceOrderStatus(current,incoming)).toBe(false);
});
test('a delivered order only enters the separate customer-return workflow',()=>{
 for(const incoming of states)expect(shouldAdvanceOrderStatus('delivered',incoming)).toBe(incoming==='return_initiated');
});
test.each(['rto','return_initiated'])('%s can only advance to warehouse receipt',current=>{
 for(const incoming of states)expect(shouldAdvanceOrderStatus(current,incoming)).toBe(['rto delivered','returned_rto'].includes(incoming));
});
test.each([
 ['pending','shipped'],['booked','in transit'],['shipped','delivered'],['in transit','out for delivery'],
 ['out for delivery','undelivered'],['undelivered','out for delivery'],['undelivered','rto'],
 ['shipped','rto delivered'],['confirmed','cancelled'],['exception','delivered'],
])('legitimate scan %s → %s advances even with missing intermediate scans',(current,incoming)=>expect(shouldAdvanceOrderStatus(current,incoming)).toBe(true));
test.each([['in transit','manifested'],['shipped','confirmed'],['out for delivery','in transit'],['shipped','return_initiated']])('stale or unrelated %s → %s is ignored',(current,incoming)=>expect(shouldAdvanceOrderStatus(current,incoming)).toBe(false));
test('duplicates and unknown scans never advance an order',()=>{
 for(const status of states)expect(shouldAdvanceOrderStatus(status,status)).toBe(false);
 for(const incoming of [undefined,null,'','provider-only-status','toString','__proto__'])expect(shouldAdvanceOrderStatus('shipped',incoming)).toBe(false);
});
