'use strict';
const { sequelize } = require('../../config/db.js');
const { QueryTypes } = require('sequelize');
const { parseRange } = require('./common.js');
const { STAGE_SQL } = require('../salesReportService.js');
const { ensureSchema } = require('../metaAdsService.js');
const { logger } = require('../../config/logging.js');
const q = (sql, replacements) => sequelize.query(sql, { replacements, type: QueryTypes.SELECT });
const n = v => Number(v) || 0;
const round = v => Math.round(v * 100) / 100;
const ratio = (spend, units) => spend == null || units <= 0 ? null : round(spend / units);
const ymd = d => new Date(new Date(d).getTime() + 330 * 60000).toISOString().slice(0,10);
const day = d => d instanceof Date ? d.toISOString().slice(0,10) : String(d).slice(0,10);
const STAGES = ['all','cancelled','rto','returned','delivered','to_confirm','to_ship','in_transit','problems','other'];
// Aggregate order lines BEFORE joining orders. A ten-line order is still one
// order, and its value/spend must not be multiplied by the number of items.
const JOINS = `LEFT JOIN (SELECT order_id, SUM(quantity) AS units FROM order_items GROUP BY order_id) li ON li.order_id = o.id
 LEFT JOIN (SELECT DISTINCT order_id FROM returns) rt ON rt.order_id = o.id`;
function scope(p) { return `o.created_at BETWEEN :start AND :end${p.brandId ? ' AND o.brand_id = :brandId' : ''}`; }
function empty(extra={}) { return {...extra,placedOrders:0,units:0,cancelledOrders:0,cancelledUnits:0,rtoOrders:0,rtoUnits:0,returnedOrders:0,returnedUnits:0,keptOrders:0,keptUnits:0,pendingOrders:0,placedValue:0,importedSpend:0,spendRows:0,currencies:new Set()}; }
function addOrder(g,r) {
 const count=n(r.orders),units=n(r.units);g.placedOrders+=count;g.units+=units;g.placedValue+=n(r.value);
 if(r.stage==='cancelled'){g.cancelledOrders+=count;g.cancelledUnits+=units;}
 else if(r.stage==='rto'){g.rtoOrders+=count;g.rtoUnits+=units;}
 else if(r.stage==='returned'){g.returnedOrders+=count;g.returnedUnits+=units;}
 else if(r.stage==='delivered'){g.keptOrders+=count;g.keptUnits+=units;}
 else g.pendingOrders+=count;
}
function addSpend(g,r){g.importedSpend+=n(r.spend);g.spendRows+=n(r.spend_rows);g.currencies.add(String(r.currency||'unknown').toUpperCase());}
function finish(g,missing=false){
 const {currencies,...rest}=g;
 const valid=!missing && g.spendRows>0 && currencies.size===1 && currencies.has('INR');
 const spend=valid?round(g.importedSpend):null;
 return {...rest,placedValue:round(g.placedValue),importedSpend:currencies.size===1&&currencies.has('INR')?round(g.importedSpend):null,currencies:[...currencies],spend,
  costPerOrder:ratio(spend,g.placedOrders),costPerUnit:ratio(spend,g.units),costPerKeptUnit:ratio(spend,g.keptUnits),costPerKeptOrder:ratio(spend,g.keptOrders)};
}
function buildReport(orderRows,spendRows,brands){
 const names=new Map(brands.map(b=>[String(b.id),b.name])),byBrand=new Map(),byDay=new Map(),total=empty();
 const get=(id,date)=>{
  const key=String(id),dateKey=`${key}:${date}`;
  if(!byBrand.has(key))byBrand.set(key,empty({brandId:n(id),brand:names.get(key)||`Store ${id}`}));
  if(!byDay.has(dateKey))byDay.set(dateKey,empty({brandId:n(id),brand:names.get(key)||`Store ${id}`,day:date}));
  return [byBrand.get(key),byDay.get(dateKey),total];
 };
 for(const r of orderRows)for(const g of get(r.brand_id,day(r.day)))addOrder(g,r);
 for(const r of spendRows)for(const g of get(r.brand_id,day(r.day)))addSpend(g,r);
 const missingBrands=[...byBrand.values()].filter(g=>g.placedOrders>0&&!g.spendRows).map(g=>g.brand);
 return {summary:finish(total,missingBrands.length>0),brands:[...byBrand.values()].map(g=>finish(g)).sort((a,b)=>b.placedOrders-a.placedOrders),
  daily:[...byDay.values()].map(g=>finish(g)).sort((a,b)=>b.day.localeCompare(a.day)||a.brand.localeCompare(b.brand)),missingBrands};
}
function detailSql(p,cursor=false){return `SELECT o.id,o.order_number,o.brand_id,o.created_at,o.status,o.payment_type,o.payment_status,o.final_amount,
 COALESCE(li.units,0) AS units, ${STAGE_SQL} AS stage, u.utm_source AS source,u.utm_campaign AS campaign
 FROM orders o ${JOINS} LEFT JOIN utm_tracking u ON u.id=o.utm_tracking_id
 WHERE ${scope(p)}${p.stage==='all'?'':` AND (${STAGE_SQL}) = :stage`}
 ${cursor?' AND (o.created_at < :cursorDate OR (o.created_at = :cursorDate AND o.id < :cursorId))':''}
 ORDER BY o.created_at DESC,o.id DESC LIMIT :limit${p.offset==null?'':' OFFSET :offset'}`;}
const csvCell=value=>{
 let text=String(value??'');if(/^[\s]*[=+@-]/.test(text))text="'"+text;
 return '"'+text.replace(/"/g,'""')+'"';
};
async function writeCsv(res,text){
 if(res.destroyed) return;
 if(!res.write(text)) await new Promise(resolve=>{
  const done=()=>{res.removeListener('drain',done);res.removeListener('close',done);resolve();};
  res.once('drain',done);res.once('close',done);
 });
}
async function exportOrders(req,res,p,brands){
 const names=new Map(brands.map(b=>[String(b.id),b.name]));let cursor=null;
 res.setHeader('Content-Type','text/csv; charset=utf-8');res.setHeader('Content-Disposition','attachment; filename="marketing-orders.csv"');
 await writeCsv(res,'\uFEFF'+['Order','Store','Placed (IST)','Status','Payment type','Payment status','Sold units','Order value (INR)','Source','Campaign'].map(csvCell).join(',')+'\r\n');
 while(!req.aborted&&!res.destroyed){
  const rows=await q(detailSql({...p,offset:null},!!cursor),{...p,offset:null,limit:1000,...cursor});
  for(const r of rows){const at=new Date(r.created_at);const date=Number.isNaN(at.getTime())?'':new Date(at.getTime()+330*60000).toISOString().slice(0,19).replace('T',' ');
   if(req.aborted||res.destroyed)break;
   await writeCsv(res,[r.order_number,names.get(String(r.brand_id))||r.brand_id,date,r.status,r.payment_type,r.payment_status,n(r.units),n(r.final_amount),r.source,r.campaign].map(csvCell).join(',')+'\r\n');}
  if(rows.length<1000)break;
  const last=rows[rows.length-1];cursor={cursorDate:last.created_at,cursorId:last.id};
 }
 res.end();
}
async function handler(req,res){
 try{
  const query=req.query||{};
  for(const value of [query.startDate,query.endDate]){
    if(value!=null&&(!/^\d{4}-\d{2}-\d{2}$/.test(String(value))||!Number.isFinite(new Date(value+'T00:00:00Z').getTime())||new Date(value+'T00:00:00Z').toISOString().slice(0,10)!==value))return res.status(400).json({success:false,message:'Choose valid calendar dates.'});
  }
  const {start,end}=parseRange(query);
  if(!Number.isFinite(start.getTime())||!Number.isFinite(end.getTime())||start>end)return res.status(400).json({success:false,message:'Choose a valid date range.'});
  const asked=query.brandId==null||query.brandId===''?null:Number(query.brandId);
  if(asked!=null&&(!Number.isSafeInteger(asked)||asked<=0))return res.status(400).json({success:false,message:'Choose a valid store.'});
  const scoped=req.brand?.id||req.brandId||null;
  if(scoped&&asked&&Number(scoped)!==asked)return res.status(403).json({success:false,message:'This report belongs to another store.'});
  const brandId=scoped?Number(scoped):asked,stage=query.stage||'all';
  if(!STAGES.includes(stage))return res.status(400).json({success:false,message:'Choose a valid order status.'});
  const page=Math.max(1,Math.min(100000,Number.parseInt(query.page,10)||1)),limit=50;
  const p={start,end,brandId,stage,startDay:ymd(start),endDay:ymd(end),limit,offset:(page-1)*limit};
  const brands=await q(`SELECT id,COALESCE(display_name,name) AS name FROM brands${brandId?' WHERE id = :brandId':''} ORDER BY id`,p);
  if(query.format==='csv')return await exportOrders(req,res,p,brands);
  await ensureSchema();
  const [orders,spend,rows,sync]=await Promise.all([
   q(`SELECT o.brand_id,DATE(CONVERT_TZ(o.created_at,'+00:00','+05:30')) AS day,${STAGE_SQL} AS stage,
    COUNT(*) AS orders,SUM(COALESCE(li.units,0)) AS units,SUM(o.final_amount) AS value
    FROM orders o ${JOINS} WHERE ${scope(p)} GROUP BY o.brand_id,day,stage`,p),
   q(`SELECT brand_id,day,currency,SUM(spend) AS spend,COUNT(*) AS spend_rows FROM ad_spend_daily
    WHERE day BETWEEN :startDay AND :endDay AND brand_id IS NOT NULL${brandId?' AND brand_id = :brandId':''} GROUP BY brand_id,day,currency`,p),
   q(detailSql(p),p),
   q(`SELECT MAX(last_synced_at) AS lastSyncedAt FROM ad_spend_sync WHERE brand_id IS NOT NULL${brandId?' AND brand_id = :brandId':''}`,p)
  ]);
  const report=buildReport(orders,spend,brands),filteredOrders=orders.filter(r=>stage==='all'||r.stage===stage).reduce((sum,r)=>sum+n(r.orders),0);
  return res.json({success:true,...report,orders:rows.map(r=>({...r,brand:brands.find(b=>String(b.id)===String(r.brand_id))?.name||`Store ${r.brand_id}`,units:n(r.units),final_amount:n(r.final_amount)})),
   range:{startDate:p.startDay,endDate:p.endDay},page,pages:Math.max(1,Math.ceil(filteredOrders/limit)),filteredOrders,lastSyncedAt:sync[0]?.lastSyncedAt||null});
 }catch(error){logger.error('Marketing orders report failed:',error.message);if(res.headersSent){res.destroy(error);return;}return res.status(500).json({success:false,message:'Could not load the marketing orders report.'});}
}
module.exports={handler,buildReport,detailSql,csvCell};
