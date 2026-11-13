import React, { useEffect, useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { adminApi, reportPagesService, brandService } from '../../../services';
import { DateRangePicker, SkeletonKpis } from '../../../components/ui';
import Dropdown from '../../../components/ui/Dropdown';
import { PageHeader } from '../../../components/Dashboard/primitives';
import { istDate, useReportState } from '../../../lib/reportFilters';

const count = value => Number(value || 0).toLocaleString('en-IN');
const money = value => value == null ? '—' : `₹${Number(value).toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const dateTime = value => value && Number.isFinite(new Date(value).getTime()) ? new Date(value).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'medium', timeStyle: 'short' }) : '—';
const stages = [['all','All orders'],['cancelled','Cancelled'],['rto','RTO'],['returned','Customer returns'],['delivered','Delivered & kept'],['to_confirm','Awaiting confirmation'],['to_ship','Preparing to ship'],['in_transit','In transit'],['problems','Delivery problems'],['other','Other']];
const shiftDay = value => { const d = new Date(`${value}T00:00:00Z`); d.setUTCDate(d.getUTCDate()-29); return d.toISOString().slice(0,10); };
const columns = ['Orders','Cancelled','RTO','Returned','Sold units','Kept units','Meta spend','Ad cost / order','Ad cost / sold unit','Ad cost / kept unit','Ad cost / kept order'];
function Metrics({ row }) {
  return <><td>{count(row.placedOrders)}</td>{[['cancelledOrders','cancelledUnits'],['rtoOrders','rtoUnits'],['returnedOrders','returnedUnits']].map(([orders,units])=><td key={orders}>{count(row[orders])}<small style={{display:'block',color:'var(--ds-color-text-muted)'}}>{count(row[units])} units</small></td>)}<td>{count(row.units)}</td><td>{count(row.keptUnits)}</td>
    {[row.spend,row.costPerOrder,row.costPerUnit,row.costPerKeptUnit,row.costPerKeptOrder].map((value,i)=><td key={`m${i}`}>{money(value)}</td>)}</>;
}
function Breakdown({ title, rows, daily=false }) {
  return <section className="rep-panel rep-panel--flush" aria-label={title} style={{padding:0}}>
    <h2 style={{padding:'16px',margin:0,fontSize:16}}>{title}</h2>
    <div style={{overflow:'auto',maxHeight:420}}><table className="rep-table" style={{minWidth:1200}}>
      <thead><tr>{daily?<th>Reporting day</th>:null}<th>Store</th>{columns.map(label=><th key={label}>{label}</th>)}</tr></thead>
      <tbody>{rows.map(row=><tr key={`${row.brandId}:${row.day||''}`}>{daily?<td>{row.day}</td>:null}<td>{row.brand}</td><Metrics row={row}/></tr>)}
      {!rows.length?<tr><td colSpan={columns.length+(daily?2:1)}>No orders or imported ad spend in this period.</td></tr>:null}</tbody>
    </table></div>
  </section>;
}
export default function MarketingOrdersReport() {
  const [from,setFrom]=useReportState('from',shiftDay(istDate()));
  const [to,setTo]=useReportState('to',istDate());
  const [brandId,setBrandId]=useReportState('brandId','');
  const [brands,setBrands]=useState([]),[stage,setStage]=useState('all'),[page,setPage]=useState(1),[exporting,setExporting]=useState(false),[exportError,setExportError]=useState('');
  useEffect(()=>{let active=true;brandService.getAllBrands(true).then(r=>{if(active&&r?.success)setBrands(r.data||[]);}).catch(()=>{});return()=>{active=false;};},[]);
  useEffect(()=>{setPage(1);setExportError('');},[from,to,brandId,stage]);
  const params={startDate:from,endDate:to,brandId:brandId||undefined,stage,page};
  const {data,isLoading,isFetching,error,refetch}=useQuery({queryKey:['reports','marketing-orders',from,to,brandId,stage,page],queryFn:()=>reportPagesService.get('marketing-orders',params),enabled:!!(from&&to),staleTime:30000});
  useEffect(()=>{if(data&&data.page>data.pages)setPage(data.pages);},[data]);
  const exportOrders=async()=>{
    setExporting(true);setExportError('');
    try{
      const result=await adminApi.get('/api/reports/marketing-orders',{params:{...params,format:'csv'},responseType:'blob',timeout:120000});
      const url=URL.createObjectURL(result.data),link=document.createElement('a');link.href=url;link.download=`marketing-orders-${from}-${to}.csv`;document.body.appendChild(link);link.click();link.remove();setTimeout(()=>URL.revokeObjectURL(url),1000);
    }catch(e){let message=e.response?.data?.message;if(e.response?.data instanceof Blob){try{message=JSON.parse(await e.response.data.text()).message;}catch{}}
      setExportError(message||'Could not export orders. Please try again.');
    }finally{setExporting(false);}
  };
  const s=data?.summary;
  return <div className="dashboard-sections obz-rep">
    <PageHeader title="Marketing Orders" subtitle="Every order placed in the selected period, including cancelled and RTO orders. Costs use imported Meta ad spend and current order outcomes."
      actions={<div className="obz-rep-head"><Dropdown value={brandId||'all'} onChange={v=>setBrandId(v==='all'?'':v)} options={[{value:'all',label:'All brands'},...brands.map(b=>({value:b.id,label:b.display_name||b.name}))]} className="bset-brand-select"/>
        <DateRangePicker label="" inline startDate={from} endDate={to} onStartChange={setFrom} onEndChange={setTo} maxDate={istDate()}/>
        <button type="button" className="order-sync-main-btn" onClick={exportOrders} disabled={exporting||!data}>{exporting?'Exporting…':'Export all matching orders'}</button>
        <button type="button" className="order-sync-main-btn" onClick={()=>refetch()} disabled={isFetching}>Refresh</button></div>}/>
    {exportError?<p role="alert">{exportError}</p>:null}
    {isLoading?<SkeletonKpis count={4} label="Loading marketing orders…"/>:error?<div className="rep-state" role="alert">Could not load the report: {error.message}<button type="button" onClick={()=>refetch()}>Try again</button></div>:null}
    {data&&s?<>
      <div className="rep-kpis" aria-busy={isFetching||undefined}>
        {[
          ['All placed orders',count(s.placedOrders),`${count(s.cancelledOrders)} cancelled · ${count(s.rtoOrders)} RTO · ${count(s.returnedOrders)} customer returns`],
          ['Imported Meta spend',money(s.spend),data.lastSyncedAt?`Last sync: ${dateTime(data.lastSyncedAt)} IST`:'No ad sync recorded'],
          ['Ad cost per order',money(s.costPerOrder),'Spend ÷ all placed orders, including cancelled and RTO'],
          ['Ad cost per sold unit',money(s.costPerUnit),`Spend ÷ ${count(s.units)} ordered units`],
          ['Ad cost per kept order',money(s.costPerKeptOrder),`Spend ÷ ${count(s.keptOrders)} orders delivered and kept`],
          ['Ad cost per kept unit',money(s.costPerKeptUnit),`Spend ÷ ${count(s.keptUnits)} units delivered and kept`],
          ['Still in progress',count(s.pendingOrders),'Awaiting confirmation, shipping or delivery resolution'],
        ].map(([label,value,note])=><div className="rep-kpi" key={label}><div className="rep-kl">{label}</div><div className="rep-kv num">{value}</div><div className="rep-kf">{note}</div></div>)}
      </div>
      <div className="rep-panel" style={{fontSize:13}}>
        <p style={{marginTop:0}}>This is a blended store report: all orders are included, even if their marketing source is untracked. Cancelled and RTO orders are included in placed-order and sold-unit costs; they are excluded from kept-unit costs. A customer return is shown separately from RTO.</p>
        <p>One pack counts as one sold unit. Costs here cover Meta advertising only, excluding product costs, shipping, payment fees and other marketing channels. Orders use India time; spend follows Meta’s reporting day. Store/date filters apply to every total; the status filter below applies only to the order list and CSV.</p>
        {data.missingBrands.length?<p role="status">No spend rows were imported for: {data.missingBrands.join(', ')}. Overall ad costs are unavailable until spend coverage is confirmed.{s.importedSpend!=null?` Imported INR spend available: ${money(s.importedSpend)}.`:''}</p>:null}
        {s.currencies.some(c=>c!=='INR')?<p role="status">Spend includes {s.currencies.join(', ')}. Currency amounts are not combined or converted; INR ad costs are unavailable for mixed or non-INR accounts.</p>:null}
        {!s.spendRows?<p>No Meta spend was imported for this period. A dash means unavailable, not zero cost. Use Marketing reports → Ads to check account links and sync spend.</p>:null}
      </div>
      <Breakdown title="By store" rows={data.brands}/><Breakdown title="By order day and store" rows={data.daily} daily/>
      <section className="rep-panel rep-panel--flush" aria-label="All marketing orders" style={{padding:0}}>
        <div className="obz-rep-head" style={{padding:16}}><h2 style={{margin:0,fontSize:16}}>Orders</h2><Dropdown value={stage} onChange={setStage} options={stages.map(([value,label])=>({value,label}))}/><span>{count(data.filteredOrders)} matching orders</span></div>
        <div style={{overflow:'auto'}}><table className="rep-table" style={{minWidth:1000}}><thead><tr>{['Order','Store','Placed (IST)','Status','Payment','Sold units','Order value','Source','Campaign'].map(label=><th key={label}>{label}</th>)}</tr></thead>
          <tbody>{data.orders.map(order=><tr key={order.id}><td>{order.order_number}</td><td>{order.brand}</td><td>{dateTime(order.created_at)}</td><td>{order.status}</td><td>{order.payment_type} · {order.payment_status}</td><td>{count(order.units)}</td><td>{money(order.final_amount)}</td><td>{order.source||'Untracked'}</td><td>{order.campaign||'—'}</td></tr>)}
            {!data.orders.length?<tr><td colSpan={9}>No orders match this status and period.</td></tr>:null}</tbody></table></div>
        <div className="obz-rep-head" style={{padding:16}}><button type="button" onClick={()=>setPage(p=>p-1)} disabled={page<=1||isFetching}>Previous</button><span>Page {data.page} of {data.pages}</span><button type="button" onClick={()=>setPage(p=>p+1)} disabled={page>=data.pages||isFetching}>Next</button></div>
      </section>
    </>:null}
  </div>;
}
