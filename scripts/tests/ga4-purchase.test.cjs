const { test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs'), path = require('node:path'), vm = require('node:vm');
function tracker({ blockedStorage = false, googleReady = true } = {}) {
  const google=[], meta=[], timers=[], stored=new Map();
  const fbq=Object.assign((...args)=>meta.push(args),{callMethod(){}});
  const window={fbq,__brandGa4Ready:googleReady,gtag:(...args)=>google.push(args),addEventListener(){}};
  const source=fs.readFileSync(path.join(__dirname,'../../shared/frontend/pixel.js'),'utf8').replace(/^import .*;\n/gm,'').replace(/^export /gm,'');
  const context=vm.createContext({window,process:{env:{}},getConsent:()=>({marketing:true}),ensurePurchasePixel:()=>Promise.resolve(true),completePurchaseForThankYou(){},setTimeout:fn=>timers.push(fn),sessionStorage:{getItem(k){if(blockedStorage)throw Error('blocked');return stored.get(k);},setItem(k,v){if(blockedStorage)throw Error('blocked');stored.set(k,v);}}});
  vm.runInContext(source,context);return {purchase:context.fbPurchase,google,meta,flush:()=>timers.shift()?.()};
}
test('blocked storage still sends one Meta Purchase and never duplicates server GA4 revenue',async()=>{
 const t=tracker({blockedStorage:true});const a=t.purchase('ORDER-1',{value:799}),b=t.purchase('ORDER-1',{value:799});assert.equal(a,b);t.flush();assert.equal(await a,true);assert.equal(t.meta.length,1);assert.equal(t.meta[0][3].eventID,'Purchase_ORDER-1');assert.equal(t.google.length,0);
});
test('Purchase does not depend on GA4 readiness or send a browser GA4 purchase',async()=>{
 const t=tracker({googleReady:false});const sent=t.purchase('ORDER-2',{value:799});t.flush();assert.equal(await sent,true);assert.equal(t.meta.length,1);assert.equal(t.google.length,0);
});
test('placeholder references cannot create a Purchase',async()=>{
 const t=tracker();assert.equal(await t.purchase('—',{}),false);assert.equal(await t.purchase(null,{}),false);assert.equal(t.meta.length,0);assert.equal(t.google.length,0);
});
