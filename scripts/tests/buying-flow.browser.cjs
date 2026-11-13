// Mobile UI regression fixtures: real confirmation components, simulated verified API and pixel.
// Run with esbuild, playwright, react and react-dom available via NODE_PATH.
const fs=require('fs'),path=require('path'),esbuild=require('esbuild');
const {chromium}=require('playwright');
const root=path.resolve(__dirname,'../..');
const temp=fs.mkdtempSync(path.join(require('os').tmpdir(),'buying-flow-browser-'));
const reactPath=path.dirname(require.resolve('react/package.json'));
const reactDomPath=path.dirname(require.resolve('react-dom/package.json'));
const files={Crosscoin:'src/pages/test/thank-you.jsx',Morbix:'app/order-confirmation/OrderConfirmationClient.jsx',Soxbae:'app/order-confirmation/OrderConfirmationClient.jsx',Knitwink:'app/order-confirmation/OrderConfirmationClient.jsx',Velquira:'app/order-confirmation/OrderConfirmationClient.jsx',Gripzus:'src/pages/order-confirmation.jsx',Velmique:'app/order-confirmation/CheckoutReturn.jsx'};
const store=`const clear=()=>window.cleared=(window.cleared||0)+1; const noop=()=>{};export const clearCart=clear;export const useCart=()=>({clear,clearCart:clear,openCart:noop,cartReady:true,hydrated:true});export const useCartContext=useCart;export const useStore=()=>({cartHydrated:true,clearCart:clear,setCartOpen:noop});`;
const next=`export const useRouter=()=>({isReady:true,query:Object.fromEntries(new URLSearchParams(location.search)),push:()=>{}});`;
(async()=>{const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});let checks=0;
for(const [brand,file]of Object.entries(files)){
const base=brand==='Crosscoin'||brand==='Gripzus'?'src/':'';
const thank=path.join(root,brand,base+'lib/thankYou.js');
const sdk=`import {confirmVerifiedOrder} from '${root}/shared/frontend/buyingFlow.js';export const SR_SOURCE_KEY='fixture-source';export const confirmShiprocketOrder=(id)=>confirmVerifiedOrder('${brand}',id,async()=>{window.verifications=(window.verifications||0)+1;const result=new URLSearchParams(location.search).get('result');if(result==='pending')throw Error('unavailable');if(result==='malformed')return {ok:true};return {ok:true,order_number:'ORDER-1',value:799,items:[{id:'12',quantity:1}]};});export const confirmCheckoutReturn=confirmShiprocketOrder;`;
const pixel=`export const rememberBuyer=()=>{};export const fbPurchase=(order,data)=>{if(new URLSearchParams(location.search).get('effect')==='error')throw Error('pixel unavailable');(window.purchases||=[]).push({order,data});return Promise.resolve(true);};`;
const stubs={'next/router':next,'next/head':'export default function Head(){return null}', 'next/link':`export default function Link({children,href,...props}){return <a href={href} {...props}>{children}</a>}`,'lucide-react':'export const CheckCircle=()=>null;export const XCircle=()=>null;export const Clock=()=>null;export const Truck=()=>null;'};
const outfile=path.join(temp,brand+'.js');
await esbuild.build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import Page from '${path.join(root,brand,file)}';import {savePurchaseForThankYou} from '${thank}';const q=new URLSearchParams(location.search);const own=q.get('order')||'';if(q.get('receipt')==='1')savePurchaseForThankYou(own,{value:799,currency:'INR',contents:[{id:'12',quantity:1}]});sessionStorage.setItem('fixture-source','cart');createRoot(document.getElementById('root')).render(<Page order={own} oid={q.get('oid')||''} ost={q.get('ost')||''} mode={own?'own':'success'} orderId={q.get('oid')||''} orderNumber={own}><h1>Order placed</h1></Page>);`,loader:'jsx',resolveDir:root},outfile,bundle:true,alias:{react:reactPath,'react-dom':reactDomPath},jsx:'automatic',nodePaths:[path.dirname(reactPath)],plugins:[{name:'fixtures',setup(build){build.onResolve({filter:/.*/},args=>{
 let content=stubs[args.path];
 if(/thankYou$/.test(args.path))return {path:thank};
 if(/shiprocketCheckout$/.test(args.path)||args.path==='@/lib/api/orders')content=sdk;
 if(/utils\/(?:pixel|fbqTrack)$/.test(args.path)||/fbAdvancedMatching$/.test(args.path))content=pixel;
 if(/(?:context\/CartContext|lib\/store)$/.test(args.path)||/components\/test\/store$/.test(args.path))content=store;
 if(/TestLayout$/.test(args.path))content='export default function Layout({children}){return children}';
 if(/components\/test\/routes$/.test(args.path))content="export const R={home:'/',shop:'/shop'}";
 if(/components\/test\/ui$/.test(args.path))content='export const I={check:()=>null}';
 if(/components\/Icon$/.test(args.path))content='export default function Icon(){return null}';
 if(/PageHero$/.test(args.path))content='export default function Hero({title,accent,intro}){return <><h1>{title} {accent}</h1><p>{intro}</p></>}';
 if(content)return {path:args.path,namespace:'fixture',pluginData:content};
 });build.onLoad({filter:/.*/,namespace:'fixture'},args=>({contents:args.pluginData,loader:'jsx',resolveDir:root}));}}]});
for(const [query,want,tracked,cleared] of [
 ['?oid=provider&ost=SUCCESS','placed',true,true],['?oid=provider&ost=SUCCESS&result=pending','pending',false,false],['?oid=provider&ost=SUCCESS&result=malformed','pending',false,false],['?order=ORDER-1&receipt=1','placed',true,false],['?order=invented','pending',false,false],['?oid=provider&ost=SUCCESS&effect=error','placed',false,true],['?order=ORDER-1&receipt=1&effect=error','placed',false,false]]){
const page=await browser.newPage({viewport:{width:390,height:844}});const errors=[];page.on('pageerror',e=>errors.push(e.message));
await page.route('https://fixture.test/**',r=>r.fulfill({contentType:'text/html',body:'<div id="root"></div>'}));await page.goto('https://fixture.test/'+query);await page.addScriptTag({path:outfile});
await page.waitForFunction(want=>Array.from(document.querySelectorAll('h1')).some(el=>el.textContent.toLowerCase().includes(want)),want,{timeout:9000}).catch(async e=>{console.error(brand,query,errors,await page.locator('body').innerText());throw e;});
if(query.includes('effect=error')&&query.includes('oid='))await page.waitForTimeout(650);
const state=await page.evaluate(()=>({verifications:window.verifications||0,purchases:window.purchases||[],cleared:window.cleared||0,text:document.body.innerText}));
if(want==='pending'&&/Your order is received|Order placed|is confirmed\./i.test(state.text))throw Error('Premature success copy: '+brand);
if(query.includes('effect=error')&&query.includes('oid=')&&state.verifications!==1)throw Error('Analytics retriggered verification: '+brand);
if(state.purchases.length!==(tracked?1:0)||!!state.cleared!==cleared||errors.length)throw Error(JSON.stringify({brand,query,state,errors}));
console.log('PASS '+brand+' '+query+': '+want+', purchases='+state.purchases.length+', cartCleared='+state.cleared);checks++;await page.close();}
}
console.log('PASS '+checks+' mobile confirmation scenarios');await browser.close();})().catch(e=>{console.error(e);process.exit(1)});
