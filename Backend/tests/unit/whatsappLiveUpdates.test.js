const {EventEmitter}=require('events');
jest.mock('sequelize',()=>({Op:{},QueryTypes:{SELECT:'SELECT'}}),{virtual:true});
jest.mock('../../model/whatsappConversationModel.js',()=>({WhatsappConversation:{findAll:jest.fn(),findByPk:jest.fn()},WhatsappMessage:{findAll:jest.fn(),update:jest.fn()}}));
jest.mock('../../services/whatsappService.js',()=>({}));
jest.mock('../../config/logging.js',()=>({logger:{warn:jest.fn(),error:jest.fn(),info:jest.fn()}}));
jest.mock('../../utils/uploadsDir.js',()=>'/tmp/whatsapp-test-media');
jest.mock('../../services/notificationService.js',()=>({getLatestWhatsAppId:jest.fn(),waitForWhatsApp:jest.fn(),notifyWhatsAppChanged:jest.fn()}));
const {streamUpdates,receiveWebhook}=require('../../controller/whatsappController.js');
const notifications=require('../../services/notificationService.js');
const {WhatsappConversation,WhatsappMessage}=require('../../model/whatsappConversationModel.js');
function response(){const r=new EventEmitter();r.status=jest.fn(()=>r);r.json=jest.fn();return r;}
beforeEach(()=>{jest.clearAllMocks();notifications.getLatestWhatsAppId.mockResolvedValue(12);notifications.waitForWhatsApp.mockResolvedValue('timeout');});
test('initial lightweight stream returns a cursor without rebuilding the conversation list',async()=>{
 const r=response();await streamUpdates({query:{changes:'1'}},r);expect(r.json).toHaveBeenCalledWith(expect.objectContaining({success:true,changed:true,kind:'initial',after:12}));expect(WhatsappConversation.findAll).not.toHaveBeenCalled();expect(notifications.waitForWhatsApp).not.toHaveBeenCalled();
});
test('an already-saved new message is returned without parking the request',async()=>{
 const r=response();await streamUpdates({query:{changes:'1',after:'11'}},r);expect(r.json).toHaveBeenCalledWith(expect.objectContaining({kind:'message',changed:true,after:12}));expect(notifications.waitForWhatsApp).not.toHaveBeenCalled();
});
test('a saved delivery/read status wakes the inbox even when no message id changed',async()=>{
 notifications.waitForWhatsApp.mockResolvedValueOnce('status');const r=response();await streamUpdates({query:{changes:'1',after:'12'}},r);
 expect(notifications.waitForWhatsApp).toHaveBeenCalledWith(3000,expect.objectContaining({signal:expect.any(AbortSignal)}));expect(r.json).toHaveBeenCalledWith(expect.objectContaining({kind:'status',changed:true,after:12}));
});
test('heartbeat supports the active-chat fallback without requesting a conversation snapshot',async()=>{
 const r=response();await streamUpdates({query:{changes:'1',after:'12'}},r);expect(r.json).toHaveBeenCalledWith(expect.objectContaining({changed:false,kind:'timeout',after:12}));expect(WhatsappConversation.findAll).not.toHaveBeenCalled();
});
test('an event missed while reconnecting is recovered by the primary-key cursor',async()=>{
 notifications.getLatestWhatsAppId.mockResolvedValueOnce(12).mockResolvedValueOnce(13);const r=response();await streamUpdates({query:{changes:'1',after:'12'}},r);expect(r.json).toHaveBeenCalledWith(expect.objectContaining({changed:true,kind:'message',after:13}));
});
test('closing the response aborts its parked waiter and removes listeners',async()=>{
 notifications.waitForWhatsApp.mockImplementationOnce((ms,{signal})=>new Promise(resolve=>signal.addEventListener('abort',()=>resolve('aborted'))));const r=response();const work=streamUpdates({query:{changes:'1',after:'12'}},r);for(let i=0;i<10;i++)await Promise.resolve();r.emit('close');await work;expect(r.json).not.toHaveBeenCalled();expect(r.listenerCount('close')).toBe(0);
});
test.each(['-1','bad','1.1','9007199254740993'])('invalid cursor %s is rejected',async after=>{
 const r=response();await streamUpdates({query:{changes:'1',after}},r);expect(r.status).toHaveBeenCalledWith(400);expect(notifications.getLatestWhatsAppId).not.toHaveBeenCalled();
});
test.each(['delivered','read','failed'])('webhook %s change notifies only after the status is saved',async status=>{
 const calls=[];WhatsappMessage.findAll.mockResolvedValue([{id:5,wa_message_id:'wamid-1',status:'sent'}]);WhatsappMessage.update.mockImplementation(async()=>{calls.push('saved');});notifications.notifyWhatsAppChanged.mockImplementation(()=>calls.push('notified'));
 const r=response();await receiveWebhook({body:{object:'whatsapp_business_account',entry:[{changes:[{field:'messages',value:{statuses:[{id:'wamid-1',status}]}}]}]}},r);
 expect(calls).toEqual(['saved','notified']);expect(notifications.notifyWhatsAppChanged).toHaveBeenCalledWith('status');
});
test('duplicate or stale status receipt does not trigger another refresh',async()=>{
 WhatsappMessage.findAll.mockResolvedValue([{id:5,wa_message_id:'wamid-1',status:'read'}]);await receiveWebhook({body:{object:'whatsapp_business_account',entry:[{changes:[{field:'messages',value:{statuses:[{id:'wamid-1',status:'delivered'}]}}]}]}},response());expect(WhatsappMessage.update).not.toHaveBeenCalled();expect(notifications.notifyWhatsAppChanged).not.toHaveBeenCalled();
});
test('a failed status write does not publish an unpersisted receipt',async()=>{
 WhatsappMessage.findAll.mockResolvedValue([{id:5,wa_message_id:'wamid-1',status:'sent'}]);WhatsappMessage.update.mockRejectedValueOnce(Error('DB unavailable'));
 await receiveWebhook({body:{object:'whatsapp_business_account',entry:[{changes:[{field:'messages',value:{statuses:[{id:'wamid-1',status:'read'}]}}]}]}},response());expect(notifications.notifyWhatsAppChanged).not.toHaveBeenCalled();
});
