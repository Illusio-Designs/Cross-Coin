// Actual report, dropdown, shared filters and React Query; simulated report API.
// NODE_PATH must provide esbuild, playwright, react, react-dom and @tanstack/react-query.
const fs=require('fs'),path=require('path'),os=require('os'),assert=require('node:assert/strict');
const esbuild=require('esbuild'),{chromium}=require('playwright');
const root=path.resolve(__dirname,'../..'),temp=fs.mkdtempSync(path.join(os.tmpdir(),'marketing-orders-ui-'));
const react=path.dirname(require.resolve('react/package.json')),reactDom=path.dirname(require.resolve('react-dom/package.json'));
const s={placedOrders:8,units:20,cancelledOrders:2,cancelledUnits:7,rtoOrders:1,rtoUnits:2,returnedOrders:1,returnedUnits:1,keptOrders:3,keptUnits:6,pendingOrders:1,spend:800,importedSpend:800,spendRows:1,currencies:['INR'],costPerOrder:100,costPerUnit:40,costPerKeptUnit:133.33,costPerKeptOrder:266.67};
const rows=[{id:1,order_number:'CANCEL-1',brand:'Cross Coin',status:'cancelled',payment_type:'cod',payment_status:'cancelled',units:7,final_amount:799,created_at:'2026-11-12T12:00:00Z'}, {id:2,order_number:'RTO-1',brand:'Cross Coin',status:'rto delivered',payment_type:'cod',payment_status:'cancelled',units:2,final_amount:799,created_at:'2026-11-12T12:00:00Z'}];
const base={success:true,summary:s,brands:[{...s,brandId:1,brand:'Cross Coin'}],daily:[{...s,brandId:1,brand:'Cross Coin',day:'2026-11-12'}],orders:rows,missingBrands:[],lastSyncedAt:'2026-11-12T12:00:00Z',filteredOrders:51,page:1,pages:2};
const services=`export const brandService={getAllBrands:async()=>({success:true,data:[{id:1,name:'Cross Coin'},{id:2,name:'Soxbae'}]})};export const reportPagesService={get:async(name,params)=>{const r=await fetch('/api/reports/'+name+'?'+new URLSearchParams(Object.entries(params).filter(([,v])=>v!=null)));const d=await r.json();if(!r.ok)throw Error(d.message);return d;}};export const adminApi={get:async(url,options)=>{const r=await fetch(url+'?'+new URLSearchParams(Object.entries(options.params).filter(([,v])=>v!=null)));if(!r.ok)throw Error('export failed');return {data:await r.blob()};}};`;
(async()=>{
 const outfile=path.join(temp,'report.js');
 await esbuild.build({stdin:{contents:`import React from 'react';import {createRoot} from 'react-dom/client';import {QueryClient,QueryClientProvider} from '@tanstack/react-query';import Report from '${root}/Dashboard/src/pages/dashboard/reports/marketingOrdersReport.jsx';createRoot(document.getElementById('root')).render(<QueryClientProvider client={new QueryClient({defaultOptions:{queries:{retry:false}}})}><Report/></QueryClientProvider>);`,loader:'jsx',resolveDir:root},outfile,bundle:true,jsx:'automatic',alias:{react,'react-dom':reactDom},nodePaths:[path.dirname(react)],plugins:[{name:'report-fixtures',setup(build){build.onResolve({filter:/.*/},args=>{
  if(args.path==='../../../services')return{path:'services',namespace:'fixture'};
  if(args.path==='../../../components/ui')return{path:'ui',namespace:'fixture'};
  if(args.path==='../../../components/Dashboard/primitives')return{path:path.join(root,'Dashboard/src/components/Dashboard/primitives/PageHeader.jsx'),namespace:'header'};
 });build.onLoad({filter:/.*/,namespace:'fixture'},args=>({contents:args.path==='services'?services:`export function SkeletonKpis(){return <p>Loading report…</p>}export function DateRangePicker({startDate,endDate,onStartChange,onEndChange}){return <><input aria-label="Start date" type="date" value={startDate} onChange={e=>onStartChange(e.target.value)}/><input aria-label="End date" type="date" value={endDate} onChange={e=>onEndChange(e.target.value)}/></>}`,loader:'jsx',resolveDir:root}));build.onLoad({filter:/.*/,namespace:'header'},args=>({contents:fs.readFileSync(args.path,'utf8').replace('export default function PageHeader','export function PageHeader'),loader:'jsx',resolveDir:root}));}}]});
 const browser=await chromium.launch({executablePath:process.env.CHROMIUM_PATH||'/usr/bin/chromium',args:['--no-sandbox']});
 try{for(const width of [1440,390]){
  const page=await browser.newPage({viewport:{width,height:900},acceptDownloads:true}),errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('https://report.test/**',async route=>{
   const url=new URL(route.request().url());
   if(url.pathname.startsWith('/api/')){
    requests.push(Object.fromEntries(url.searchParams));
    if(url.searchParams.get('format')==='csv')return route.fulfill({contentType:'text/csv',body:'Order,Status\nCANCEL-1,cancelled\nRTO-1,rto delivered\n'});
    const data=JSON.parse(JSON.stringify(base));data.page=Number(url.searchParams.get('page')||1);
    if(url.searchParams.get('stage')==='rto'){data.orders=[rows[1]];data.filteredOrders=1;data.pages=1;}
    if(url.searchParams.get('brandId')==='2'){data.summary={...s,spend:null,costPerOrder:null,costPerUnit:null,costPerKeptUnit:null,costPerKeptOrder:null};data.missingBrands=['Soxbae'];}
    return route.fulfill({contentType:'application/json',body:JSON.stringify(data)});
   }
   return route.fulfill({contentType:'text/html',body:'<div id="root"></div>'});
  });
  await page.goto('https://report.test/');
  for(const file of ['tokens.css','primitives.css','reports.css'])await page.addStyleTag({path:path.join(root,'Dashboard/src/styles/dashboard',file)});
  await page.addStyleTag({content:'body{margin:0;padding:16px;font-family:Arial;background:var(--ds-color-bg)}*{box-sizing:border-box}.dashboard-sections{display:flex;flex-direction:column;gap:16px;min-width:0}.rep-panel{min-width:0}'});
  await page.addScriptTag({path:outfile});await page.getByRole('heading',{name:'Marketing Orders',exact:true}).waitFor();
  await page.getByRole('cell',{name:'CANCEL-1',exact:true}).waitFor();assert.equal(await page.getByRole('cell',{name:'RTO-1',exact:true}).count(),1);
  await page.getByRole('button',{name:'Next',exact:true}).click();await page.getByText('Page 2 of 2',{exact:true}).waitFor();assert.ok(requests.some(r=>r.page==='2'));
  await page.getByRole('button',{name:'All orders',exact:true}).click();await page.getByText('RTO',{exact:true}).last().click();await page.getByText('1 matching orders',{exact:true}).waitFor();assert.equal(await page.getByRole('cell',{name:'CANCEL-1',exact:true}).count(),0);assert.ok(requests.some(r=>r.stage==='rto'));
  const download=page.waitForEvent('download');await page.getByRole('button',{name:'Export all matching orders'}).click();assert.match((await download).suggestedFilename(),/^marketing-orders-/);assert.ok(requests.some(r=>r.format==='csv'&&r.stage==='rto'));
  await page.getByRole('button',{name:'All brands',exact:true}).click();await page.getByText('Soxbae',{exact:true}).click();await page.getByText(/No spend rows were imported for: Soxbae/).waitFor();assert.ok(requests.some(r=>r.brandId==='2'));
  await page.getByLabel('Start date').fill('2026-11-01');await page.waitForFunction(()=>document.querySelector('input[aria-label="Start date"]').value==='2026-11-01');
  await page.waitForTimeout(200);assert.ok(requests.some(r=>r.startDate==='2026-11-01'));assert.deepEqual(errors,[]);
  const overflow=await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth+2);assert.equal(overflow,false,`Page overflow at ${width}px`);
  await page.screenshot({path:path.join(temp,`marketing-orders-${width}.png`),fullPage:true});console.log(`PASS ${width}px: cancelled/RTO orders, pagination, filters, CSV, missing spend, no page overflow`);await page.close();
 }}finally{await browser.close();}
 console.log('Screenshots: '+temp);
})().catch(e=>{console.error(e);process.exit(1)});
