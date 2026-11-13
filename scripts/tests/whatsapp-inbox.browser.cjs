// Real inbox component and React; simulated authenticated API/webhook timing.
// Requires esbuild, playwright, react and react-dom via NODE_PATH.
const fs=require('fs'),path=require('path'),os=require('os'),assert=require('node:assert/strict');
const esbuild=require('esbuild'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'whatsapp-live-ui-'));
const react=path.dirname(require.resolve('react/package.json')),reactDom=path.dirname(require.resolve('react-dom/package.json'));
const icons=['Search01Icon','Cancel01Icon','ArrowLeft01Icon','InformationCircleIcon','Tick02Icon','RefreshIcon','SentIcon','SmileIcon','Attachment01Icon','ShoppingBag01Icon','Clock01Icon','ArrowTurnBackwardIcon','WhatsappIcon','FlashIcon'];
const services=`async function call(url,options={}){const qs=new URLSearchParams(options.params||{});const r=await fetch(url+(qs.size?'?'+qs:''),{signal:options.signal});if(!r.ok)throw Error('API unavailable');return {data:await r.json()};}export const adminApi={get:call,post:call};`;
(async()=>{
 const outfile=path.join(temp,'inbox.js');
 await esbuild.build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import Inbox from '${root}/Dashboard/src/components/whatsapp/InboxPage.jsx';createRoot(document.getElementById('root')).render(<Inbox brands={[{id:1,name:'Cross Coin'}]}/>);`,loader:'jsx',resolveDir:root},outfile,bundle:true,jsx:'automatic',alias:{react,'react-dom':reactDom},nodePaths:[path.dirname(react)],plugins:[{name:'fixtures',setup(build){build.onResolve({filter:/.*/},args=>{
 const stubs={
 '../../services':services,
 '@hugeicons/react':`export const HugeiconsIcon=({icon,size,strokeWidth,...props})=><span {...props}/>;`,
 '@hugeicons/core-free-icons':icons.map(name=>`export const ${name}={};`).join(''),
 '../ui':`export const Skeleton=()=>null;export const SkeletonList=()=>null;export const SkeletonText=()=>null;export const Modal=()=>null;export const Select=()=>null;`,
 '../../context/AuthContext':`export const useAuth=()=>({canAccessView:()=>true});`,
 '../../utils/toastNotification':`export const showSuccess=()=>{};export const showError=()=>{};`,
 './InboxMedia':`export const API_BASE='';export const MsgContent=({msg})=><span>{msg.body}</span>;export const msgPreview=m=>m.body||'';export const FormattedText=({text})=><span>{text}</span>;`,
 './AiChatBar':`export default function AiChatBar(){return null}`,
 };
 if(stubs[args.path])return{path:args.path,namespace:'fixture',pluginData:stubs[args.path]};
 });build.onLoad({filter:/.*/,namespace:'fixture'},args=>({contents:args.pluginData,loader:'jsx',resolveDir:root}));}}]});
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try{for(const width of [1400,390]){
  const page=await browser.newPage({viewport:{width,height:900}}),errors=[];page.on('pageerror',e=>errors.push(e.message));
  let phase='sent',statusWake=false,inbound=false,lists=0,messages=0,streams=0,failNext=false,legacyLeft=1,legacyRecovered=false;
  const at=new Date().toISOString(),conv={id:1,brand_id:1,customer_name:'Test Customer',customer_phone:'919999999999',last_message:'Hello',last_message_at:at,status:'open',unread_count:0,window_open:true,window_closes_at:new Date(Date.now()+86400000).toISOString()};
  await page.route('https://inbox.test/**',async route=>{
   const u=new URL(route.request().url());let data={success:true};
   if(u.pathname==='/api/whatsapp/stream'){
    streams++;assert.equal(u.searchParams.get('changes'),'1');if(u.searchParams.has('since'))legacyRecovered=true;
    if(failNext){failNext=false;return route.fulfill({status:500,contentType:'application/json',body:'{}'});}
    await new Promise(r=>setTimeout(r,150));const after=inbound?2:1;const first=!u.searchParams.has('after');
    const kind=first?'initial':Number(u.searchParams.get('after'))!==after?'message':statusWake?'status':'timeout';statusWake=false;
    data=legacyLeft-->0?{success:true,conversations:[conv],serverTime:at}:{success:true,changed:kind!=='timeout',kind,after};
   }else if(u.pathname==='/api/whatsapp/conversations'){
    lists++;data={success:true,conversations:[{...conv,last_message:inbound?'Customer new message':'Hello'}],total:1,counts:{all:1,unread:0}};
   }else if(u.pathname==='/api/whatsapp/conversations/1/messages'){
    messages++;data={success:true,conversation:conv,hasMore:false,messages:[{id:1,conversation_id:1,direction:'outbound',type:'text',body:'Agent reply',status:phase,sent_at:at,createdAt:at},...(inbound?[{id:2,conversation_id:1,direction:'inbound',type:'text',body:'Customer new message',status:'received',sent_at:at}]:[])]};
   }else if(u.pathname.endsWith('/context'))data={success:true,replyWindow:{open:true,closesAt:conv.window_closes_at}};
   else if(!u.pathname.startsWith('/api/'))return route.fulfill({contentType:'text/html',body:'<div id="root"></div>'});
   try{await route.fulfill({contentType:'application/json',body:JSON.stringify(data)});}catch{/* aborted hidden-tab request */}
  });
  await page.goto('https://inbox.test/');await page.addStyleTag({path:path.join(root,'Dashboard/src/styles/dashboard/whatsapp.css')});await page.addScriptTag({path:outfile});
  await page.getByText('Test Customer',{exact:true}).click();await page.locator('.wib-msgs [aria-label="sent"]').waitFor();await page.waitForTimeout(2200);assert.ok(legacyRecovered,'older API response must reconnect with its legacy cursor');
  const initialLists=lists;phase='delivered';statusWake=true;await page.locator('.wib-msgs [aria-label="delivered"]').waitFor({timeout:6000});assert.equal(lists,initialLists,'status-only change must not rebuild the inbox list');
  phase='read';await page.locator('.wib-msgs [aria-label="read"]').waitFor({timeout:6000});assert.equal(lists,initialLists,'cross-worker read fallback must only refresh the active thread');
  await page.waitForTimeout(200);const readQueries=messages;await page.waitForTimeout(1600);assert.equal(messages,readQueries,'a fully-read idle chat should stop message polling');
  inbound=true;await page.locator('.wib-msgs').getByText('Customer new message',{exact:true}).waitFor({timeout:6000});assert.ok(lists>initialLists,'new inbound must refresh the conversation list');
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:true});document.dispatchEvent(new Event('visibilitychange'));});await page.waitForTimeout(250);const paused=streams;await page.waitForTimeout(1400);assert.equal(streams,paused,'hidden tab must pause live requests');
  await page.evaluate(()=>{Object.defineProperty(document,'hidden',{configurable:true,value:false});document.dispatchEvent(new Event('visibilitychange'));});await page.waitForTimeout(500);assert.ok(streams>paused,'returning to tab should reconnect immediately');
  const beforeRecovery=streams;failNext=true;await page.waitForTimeout(2600);assert.ok(streams>beforeRecovery+1,'transient stream failure should retry');
  assert.deepEqual(errors,[]);await page.screenshot({path:path.join(temp,`inbox-${width}.png`),fullPage:true});console.log(`PASS ${width}px: delivered/read ticks, cross-worker heartbeat fallback, no duplicate list fetch, idle/hidden pause, inbound refresh, retry and API rollout compatibility`);await page.close();
 }}finally{await browser.close();}
 console.log('Screenshots: '+temp);
})().catch(e=>{console.error(e);process.exit(1)});
