jest.mock('timers',()=>({setImmediate:jest.fn()}));
jest.mock('../../config/logging.js',()=>({logger:{warn:jest.fn()}}));
const {setImmediate}=require('timers');
const {deferTransactionEffect,commitTransaction,rollbackTransaction}=require('../../utils/transactionEffects.js');
beforeEach(()=>jest.clearAllMocks());
test('a failed optional effect cannot block another effect or reject the committed save',async()=>{
 const tx={commit:jest.fn()},second=jest.fn();deferTransactionEffect(tx,'first',async()=>{throw Error('provider down');});deferTransactionEffect(tx,'second',second);
 await expect(commitTransaction(tx)).resolves.toBeUndefined();expect(second).not.toHaveBeenCalled();
 for(const [task] of setImmediate.mock.calls)await task();expect(second).toHaveBeenCalledTimes(1);
});
test('a rejected COMMIT discards all staged work, even when the transaction reports finished',async()=>{
 const tx={commit:jest.fn(async()=>{tx.finished='commit';throw Error('commit rejected');}),rollback:jest.fn()},effect=jest.fn();
 deferTransactionEffect(tx,'test',effect);await expect(commitTransaction(tx)).rejects.toThrow('commit rejected');await rollbackTransaction(tx);
 expect(setImmediate).not.toHaveBeenCalled();expect(effect).not.toHaveBeenCalled();expect(tx.rollback).not.toHaveBeenCalled();
});
test('rollback clears staged effects even if rollback itself fails',async()=>{
 const tx={rollback:jest.fn(async()=>{throw Error('connection lost');}),commit:jest.fn()};deferTransactionEffect(tx,'test',jest.fn());
 await expect(rollbackTransaction(tx)).rejects.toThrow('connection lost');await commitTransaction(tx);expect(setImmediate).not.toHaveBeenCalled();
});
test('effects cannot be attached to a missing or finished transaction',()=>{
 for(const tx of [undefined,null,{finished:'commit'},{finished:'rollback'}])expect(()=>deferTransactionEffect(tx,'test',jest.fn())).toThrow('active transaction');
});
