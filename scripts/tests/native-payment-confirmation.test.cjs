// Requires @babel/parser via NODE_PATH, like the browser fixture dependencies.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm'),path=require('node:path');
const parser=require('@babel/parser');
for(const brand of ['Morbix','Soxbae','Knitwink','Velmique','Velquira','Gripzus']){
 test(`${brand}: failed Razorpay verification retains the cart and never shows success`,async()=>{
  const file=path.join(__dirname,'../..',brand,brand==='Gripzus'?'src':'','components/cart/CartDrawer.jsx');
  const source=fs.readFileSync(file,'utf8'),ast=parser.parse(source,{sourceType:'module',plugins:['jsx']});let handler;
  function visit(node){if(!node||typeof node!=='object')return;if(node.type==='ObjectProperty'&&node.key?.name==='handler'&&source.slice(node.start,node.end).includes('verifyPayment('))handler=node.value;for(const value of Object.values(node))if(Array.isArray(value))value.forEach(visit);else if(value&&typeof value==='object')visit(value);}
  visit(ast);assert.ok(handler,'Razorpay handler found');let cleared=0,success=0,pending=0;
  const noop=()=>{},markPending=()=>pending++;
  const context=vm.createContext({verifyPayment:async()=>{throw Error('network unavailable');},reservationId:'reservation',clear:()=>cleared++,clearCart:()=>cleared++,finishSuccess:()=>success++,showThankYou:()=>success++,toastOrderPlaced:()=>success++,setOrderSuccess:()=>success++,setError:markPending,setErrorMsg:markPending,setPaymentFailed:markPending,setProcessing:noop,setIsProcessing:noop,toastPaymentError:markPending,toast:{error:markPending}});
  const callback=vm.runInContext('('+source.slice(handler.start,handler.end)+')',context);
  await callback({razorpay_payment_id:'payment',razorpay_order_id:'order',razorpay_signature:'signature'});
  assert.equal(cleared,0);assert.equal(success,0);assert.ok(pending>0);
 });
}
