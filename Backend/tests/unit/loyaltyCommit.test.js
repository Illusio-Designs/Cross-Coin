jest.mock('timers',()=>({setImmediate:jest.fn()}));
jest.mock('../../config/db.js',()=>({sequelize:{transaction:jest.fn()}}));
jest.mock('../../config/logging.js',()=>({logger:{info:jest.fn(),warn:jest.fn(),error:jest.fn()}}));
jest.mock('../../model/userModel.js',()=>({User:{findByPk:jest.fn()}}));
jest.mock('../../model/loyaltyTransactionModel.js',()=>({LoyaltyTransaction:{findOne:jest.fn(),create:jest.fn()}}));
jest.mock('../../services/settingsHelper.js',()=>({getSetting:jest.fn(async(brand,key,fallback)=>fallback)}));
jest.mock('../../services/whatsappService.js',()=>({sendLoyaltyNotification:jest.fn()}));
const {creditPoints}=require('../../services/loyaltyService.js');
const {commitTransaction,rollbackTransaction}=require('../../utils/transactionEffects.js');
const {User}=require('../../model/userModel.js');
const {LoyaltyTransaction}=require('../../model/loyaltyTransactionModel.js');
const {sequelize}=require('../../config/db.js');
const {setImmediate}=require('timers');
const whatsapp=require('../../services/whatsappService.js');
let tx,user,tasks;
beforeEach(()=>{
 jest.clearAllMocks();tasks=[];setImmediate.mockImplementation(fn=>tasks.push(fn));jest.spyOn(global,'setImmediate').mockImplementation(fn=>tasks.push(fn));
 tx={LOCK:{UPDATE:'UPDATE'},commit:jest.fn(),rollback:jest.fn()};sequelize.transaction.mockResolvedValue(tx);
 user={id:2,phone:'9999999999',username:'Test Buyer',loyalty_points:0,update:jest.fn()};User.findByPk.mockResolvedValue(user);LoyaltyTransaction.findOne.mockResolvedValue(null);LoyaltyTransaction.create.mockResolvedValue({id:10});
});
afterEach(()=>jest.restoreAllMocks());
const flush=async()=>{for(const task of tasks)await task();};
test('delivery loyalty is saved in the shipping transaction and notified only after its commit',async()=>{
 await creditPoints(2,1,799,3,{transaction:tx});expect(user.update).toHaveBeenCalledWith({loyalty_points:79},{transaction:tx});expect(tasks).toHaveLength(0);
 await commitTransaction(tx);await flush();expect(whatsapp.sendLoyaltyNotification).toHaveBeenCalledWith('9999999999',{customerName:'Test Buyer',points:79,balance:79},3);
});
test('rolling back shipping never sends an earned-points message',async()=>{
 await creditPoints(2,1,799,3,{transaction:tx});await rollbackTransaction(tx);await flush();expect(tasks).toHaveLength(0);expect(whatsapp.sendLoyaltyNotification).not.toHaveBeenCalled();
});
test('a failed shipping commit discards the earned-points message',async()=>{
 tx.commit.mockRejectedValueOnce(Error('commit failed'));await creditPoints(2,1,799,3,{transaction:tx});await expect(commitTransaction(tx)).rejects.toThrow('commit failed');await flush();expect(whatsapp.sendLoyaltyNotification).not.toHaveBeenCalled();
});
test('account-linking loyalty with its own transaction still commits before notifying',async()=>{
 let release;tx.commit.mockImplementationOnce(()=>new Promise(resolve=>{release=resolve;}));const result=creditPoints(2,1,799,3);for(let i=0;i<30;i++)await Promise.resolve();expect(tasks).toHaveLength(0);
 release();await result;await flush();expect(tx.commit).toHaveBeenCalledTimes(1);expect(whatsapp.sendLoyaltyNotification).toHaveBeenCalledTimes(1);
});
