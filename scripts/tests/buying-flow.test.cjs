const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), vm = require('node:vm'), path = require('node:path');
const root = path.join(__dirname, '../..');
function flow() {
  const context = vm.createContext({ URL });
  vm.runInContext(fs.readFileSync(path.join(root, 'shared/frontend/buyingFlow.js'), 'utf8').replace(/^export /gm, ''), context);
  return context;
}
test('repeated opening shares one task; failure releases it for a safe retry', async () => {
  const c = flow(); let finish, calls = 0;
  const start = () => { calls++; return new Promise((resolve) => { finish = resolve; }); };
  const a = c.runCheckoutOpening('soxbae', start), b = c.runCheckoutOpening('soxbae', start);
  assert.equal(a, b); await Promise.resolve(); assert.equal(calls, 1); finish(); await a;
  await assert.rejects(c.runCheckoutOpening('soxbae', () => Promise.reject(Error('failed'))));
  await c.runCheckoutOpening('soxbae', () => { calls++; }); assert.equal(calls, 2);
});
test('same provider return shares verification, different stores are isolated', async () => {
  const c = flow(); let calls = 0;
  const request = async () => { calls++; return { ok: true, order_number: 'ORDER-1', value: 799, items: [{ id: '12', quantity: 1 }] }; };
  const a = c.confirmVerifiedOrder('morbix', 'provider-1', request), b = c.confirmVerifiedOrder('morbix', 'provider-1', request);
  assert.equal(a, b); await Promise.all([a,b]); assert.equal(calls, 1);
  await c.confirmVerifiedOrder('crosscoin', 'provider-1', request); assert.equal(calls, 2);
});
test('HTTP success without a saved order and contents is never a confirmed purchase', async () => {
  const c = flow();
  for (const reply of [{ok:true}, {ok:true,order_number:'X',value:799,items:[]}, {ok:true,order_number:'X',value:-1,items:[{}]}, {ok:false,order_number:'X',value:799,items:[{}]}]) {
    await assert.rejects(c.confirmVerifiedOrder('crosscoin','provider',async()=>reply), /confirmation is still pending/);
  }
});
test('quantities are whole, positive and duplicate variations merge', () => {
  const c = flow();
  assert.equal(JSON.stringify(c.normalizeCheckoutLines([{variationId:12,quantity:1},{variationId:'12',quantity:2}])), JSON.stringify([{variationId:'12',quantity:3}]));
  for (const quantity of [0,-1,1.5,NaN,Infinity]) assert.throws(()=>c.normalizeCheckoutLines([{variationId:12,quantity}]));
});
for (const [brand,key,base] of [['Crosscoin','cc-purchase','src/'],['Morbix','mbx-purchase',''],['Soxbae','soxbae-purchase',''],['Knitwink','kw-purchase',''],['Velmique','vlq-purchase',''],['Velquira','vq-purchase',''],['Gripzus','gz-purchase','src/']]) {
  test(`${brand}: native receipt survives pixel acknowledgement and rejects an invented URL`, () => {
    const data = new Map(), context = vm.createContext({sessionStorage:{getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v),removeItem:k=>data.delete(k)}});
    vm.runInContext(fs.readFileSync(path.join(root,brand,base+'lib/thankYou.js'),'utf8').replace(/^import .*;$/gm,'').replace(/^export /gm,''),context);
    assert.equal(context.hasConfirmedPurchase('invented'),false);
    context.savePurchaseForThankYou('ORDER-1',{value:799});
    assert.equal(context.hasConfirmedPurchase('ORDER-1'),true);
    context.completePurchaseForThankYou('ORDER-1');
    assert.equal(context.takePurchaseForThankYou('ORDER-1'),null);
    assert.equal(context.hasConfirmedPurchase('ORDER-1'),true);
    assert.equal(data.get(`${key}:confirmed:ORDER-1`),'1');
  });
}
test('token transport errors and missing/invalid token never reach SDK', async () => {
  const c = flow();
  for (const [ok,data] of [[false,{success:true,token:'x'}],[true,{success:true,token:{}}],[true,{success:false,token:'x'}],[true,{}]]) {
    await assert.rejects(c.readCheckoutTokenResponse({ok,json:async()=>data}));
  }
});
for (const [brand,base] of [['Morbix',''],['Soxbae',''],['Knitwink',''],['Velmique',''],['Velquira',''],['Gripzus','src/']]) {
  test(`${brand}: browser Purchase waits for live pixel, sends once, preserves server event ID`, async () => {
    const raw = fs.readFileSync(path.join(root,brand,base+'utils/pixel.js'),'utf8');
    const source = raw.slice(raw.indexOf('const pendingPurchases =')).replace(/^export /gm,'');
    const timers=[],events=[],storage=new Map();let completed=0;
    const context=vm.createContext({window:{fbq:(...args)=>events.push(args)},getConsent:()=>({marketing:true}),ensurePurchasePixel:()=>Promise.resolve(false),completePurchaseForThankYou:()=>completed++,sessionStorage:{getItem:k=>storage.get(k),setItem:(k,v)=>storage.set(k,v)},setTimeout:fn=>timers.push(fn)});
    vm.runInContext(source,context);
    const a=context.fbPurchase('ORDER-1',{value:799,currency:'INR'}),b=context.fbPurchase('ORDER-1',{value:799,currency:'INR'});
    assert.equal(a,b);timers.shift()();assert.equal(events.length,0);assert.equal(storage.size,0);
    context.window.fbq.callMethod=()=>{};timers.shift()();assert.equal(await a,true);
    assert.equal(events.length,1);assert.equal(events[0][3].eventID,'Purchase_ORDER-1');assert.equal(events[0][2].value,799);assert.equal(completed,1);
    await context.fbPurchase('ORDER-1',{});assert.equal(events.length,1);
  });
}

test('checkout retry strips accumulated provider fallback attributes and preserves selection', () => {
 const c=flow();const url=new URL(c.cleanCheckoutFallbackUrl('https://www.crosscoin.in/products/socks?color=Black&attributes[fastrr_redirect]=1&attributes[fastrr_redirect_uuid]=old&attributes[fastrr_redirect_uuid]=new'));
 assert.equal(url.searchParams.get('color'),'Black');assert.equal(url.searchParams.has('attributes[fastrr_redirect]'),false);assert.equal(url.searchParams.has('attributes[fastrr_redirect_uuid]'),false);
});

test('native lost-response retry reuses its key, including without browser storage', async () => {
  const c = flow(); const first={items:[{id:1}],idempotency_key:'first'};
  await assert.rejects(c.runNativeOrder('soxbae',first,async()=>{throw Error('lost response');}));
  const retry={items:[{id:1}],idempotency_key:'second'};
  const result=await c.runNativeOrder('soxbae',retry,async()=>({order:'saved'}));
  assert.equal(retry.idempotency_key,'first'); assert.equal(result.order,'saved');
  let calls=0; await c.runNativeOrder('soxbae',retry,async()=>{calls++;}); assert.equal(calls,0);
  c.resetNativeOrderAttempts('soxbae');
  const next={items:[{id:1}],idempotency_key:'new-order'};
  await c.runNativeOrder('soxbae',next,async()=>{calls++;}); assert.equal(calls,1); assert.equal(next.idempotency_key,'new-order');
});
test('native retry key survives reload without storing buyer details in the storage key', async () => {
  const saved=new Map();
  const make=()=>{
    const c=vm.createContext({URL,TextEncoder,crypto:require('node:crypto').webcrypto,sessionStorage:{getItem:k=>saved.get(k),setItem:(k,v)=>saved.set(k,v),removeItem:k=>saved.delete(k)}});
    vm.runInContext(fs.readFileSync(path.join(root,'shared/frontend/buyingFlow.js'),'utf8').replace(/^export /gm,''),c);return c;
  };
  const body=()=>({items:[{variation_id:12,quantity:1}],guest_info:{phone:'private-phone',email:'private-email'},idempotency_key:'original'});
  await assert.rejects(make().runNativeOrder('crosscoin',body(),async()=>{throw Error('response lost');}));
  const retry=body();retry.idempotency_key='different';
  const fresh=make();await fresh.runNativeOrder('crosscoin',retry,async()=>({order:'CC-1'}));
  assert.equal(retry.idempotency_key,'original');
  assert.match([...saved.keys()][0],/^crosscoin:native-order:[a-f0-9]{64}$/);
  fresh.resetNativeOrderAttempts('crosscoin');assert.equal(saved.size,0);
});
