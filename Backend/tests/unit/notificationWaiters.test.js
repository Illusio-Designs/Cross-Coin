jest.mock('../../config/db.js',()=>({sequelize:{query:jest.fn(async()=>[[{id:1}]])}}));
const {waitForWhatsApp,notifyWhatsAppChanged,emitNewWhatsApp,waitForNotification,emitNewOrder}=require('../../services/notificationService.js');
beforeEach(()=>jest.useFakeTimers());afterEach(()=>{jest.runOnlyPendingTimers();jest.useRealTimers();});
test('status-only changes resolve parked WhatsApp requests immediately',async()=>{const waiting=waitForWhatsApp(25000);notifyWhatsAppChanged('status');await expect(waiting).resolves.toBe('status');});
test('inbound messages preserve the existing message wake-up',async()=>{const waiting=waitForWhatsApp(25000);emitNewWhatsApp('fixture','message');await expect(waiting).resolves.toBe('message');});
test('an aborted waiter is removed without waiting for its timeout',async()=>{const ac=new AbortController();const waiting=waitForWhatsApp(25000,{signal:ac.signal});ac.abort();await expect(waiting).resolves.toBe('aborted');notifyWhatsAppChanged('status');});
test('a quiet heartbeat resolves with timeout rather than falsely reporting a message',async()=>{const waiting=waitForWhatsApp(3000);jest.advanceTimersByTime(3000);await expect(waiting).resolves.toBe('timeout');});

test('delivery/read updates do not create a new global notification',async()=>{let woke=false;const general=waitForNotification(3000).then(()=>{woke=true;});const inbox=waitForWhatsApp(3000);notifyWhatsAppChanged('status');await inbox;expect(woke).toBe(false);jest.advanceTimersByTime(3000);await general;});
test('new order notifications still wake their existing global subscribers',async()=>{const general=waitForNotification(25000);emitNewOrder({id:1,order_number:'FIXTURE',final_amount:799,payment_type:'cod'});await expect(general).resolves.toBe('message');});
