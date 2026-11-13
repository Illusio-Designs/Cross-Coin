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
const shiftDay = value => { const d = new Date(`${value}T00:00:00Z`); d.setUTCDate(d.getUTCDate()-29); return d.toISOString().slice(0,10); };
const columns = ['Total orders','Total sold units','Meta spend','Ad cost / order','Ad cost / sold unit'];
function Metrics({ row }) {
  return <><td>{count(row.placedOrders)}</td><td>{count(row.units)}</td>
    {[row.spend,row.costPerOrder,row.costPerUnit].map((value,i)=><td key={`m${i}`}>{money(value)}</td>)}</>;
}
function Breakdown({ title, rows, daily=false }) {
  return <section className="rep-panel rep-panel--flush" aria-label={title} style={{padding:0}}>
    <h2 style={{padding:'16px',margin:0,fontSize:16}}>{title}</h2>
    <div style={{overflow:'auto',maxHeight:420}}><table className="rep-table" style={{minWidth:720}}>
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
  const [brands,setBrands]=useState([]),[page,setPage]=useState(1),[exporting,setExporting]=useState(false),[exportError,setExportError]=useState('');
  useEffect(()=>{let active=true;brandService.getAllBrands(true).then(r=>{if(active&&r?.success)setBrands(r.data||[]);}).catch(()=>{});return()=>{active=false;};},[]);
  useEffect(()=>{setPage(1);setExportError('');},[from,to,brandId]);
  const params={startDate:from,endDate:to,brandId:brandId||undefined,page};
  const {data,isLoading,isFetching,error,refetch}=useQuery({queryKey:['reports','marketing-orders',from,to,brandId,page],queryFn:()=>reportPagesService.get('marketing-orders',params),enabled:!!(from&&to),staleTime:30000});
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
    <PageHeader title="Marketing Orders" subtitle="Total orders and Meta advertising costs for the selected period."
      actions={<div className="obz-rep-head"><Dropdown value={brandId||'all'} onChange={v=>setBrandId(v==='all'?'':v)} options={[{value:'all',label:'All brands'},...brands.map(b=>({value:b.id,label:b.display_name||b.name}))]} className="bset-brand-select"/>
        <DateRangePicker label="" inline startDate={from} endDate={to} onStartChange={setFrom} onEndChange={setTo} maxDate={istDate()}/>
        <button type="button" className="order-sync-main-btn" onClick={exportOrders} disabled={exporting||!data}>{exporting?'Exporting…':'Export all matching orders'}</button>
        <button type="button" className="order-sync-main-btn" onClick={()=>refetch()} disabled={isFetching}>Refresh</button></div>}/>
    {exportError?<p role="alert">{exportError}</p>:null}
    {isLoading?<SkeletonKpis count={4} label="Loading marketing orders…"/>:error?<div className="rep-state" role="alert">Could not load the report: {error.message}<button type="button" onClick={()=>refetch()}>Try again</button></div>:null}
    {data&&s?<>
      <div className="rep-kpis" aria-busy={isFetching||undefined}>
        {[
          ['Total orders',count(s.placedOrders),'All orders combined'],
          ['Imported Meta spend',money(s.spend),data.lastSyncedAt?`Last sync: ${dateTime(data.lastSyncedAt)} IST`:'No ad sync recorded'],
          ['Ad cost per order',money(s.costPerOrder),'Spend ÷ total orders'],
          ['Ad cost per sold unit',money(s.costPerUnit),`Spend ÷ ${count(s.units)} ordered units`],
        ].map(([label,value,note])=><div className="rep-kpi" key={label}><div className="rep-kl">{label}</div><div className="rep-kv num">{value}</div><div className="rep-kf">{note}</div></div>)}
      </div>
      <div className="rep-panel" style={{fontSize:13}}>
        <p style={{marginTop:0}}>Every order is included in the totals regardless of its current status, including orders with an untracked marketing source. One pack counts as one sold unit.</p>
        <p>Costs cover Meta advertising only, excluding product costs, shipping, payment fees and other marketing channels. Orders use India time; spend follows Meta’s reporting day.</p>
        {data.missingBrands.length?<p role="status">No spend rows were imported for: {data.missingBrands.join(', ')}. Overall ad costs are unavailable until spend coverage is confirmed.{s.importedSpend!=null?` Imported INR spend available: ${money(s.importedSpend)}.`:''}</p>:null}
        {s.currencies.some(c=>c!=='INR')?<p role="status">Spend includes {s.currencies.join(', ')}. Currency amounts are not combined or converted; INR ad costs are unavailable for mixed or non-INR accounts.</p>:null}
        {!s.spendRows?<p>No Meta spend was imported for this period. A dash means unavailable, not zero cost. Use Marketing reports → Ads to check account links and sync spend.</p>:null}
      </div>
      <Breakdown title="By store" rows={data.brands}/><Breakdown title="By order day and store" rows={data.daily} daily/>
      <section className="rep-panel rep-panel--flush" aria-label="All marketing orders" style={{padding:0}}>
        <div className="obz-rep-head" style={{padding:16}}><h2 style={{margin:0,fontSize:16}}>Orders</h2><span>{count(data.filteredOrders)} total orders</span></div>
        <div style={{overflow:'auto'}}><table className="rep-table" style={{minWidth:1000}}><thead><tr>{['Order','Store','Placed (IST)','Payment','Sold units','Order value','Source','Campaign'].map(label=><th key={label}>{label}</th>)}</tr></thead>
          <tbody>{data.orders.map(order=><tr key={order.id}><td>{order.order_number}</td><td>{order.brand}</td><td>{dateTime(order.created_at)}</td><td>{order.payment_type}</td><td>{count(order.units)}</td><td>{money(order.final_amount)}</td><td>{order.source||'Untracked'}</td><td>{order.campaign||'—'}</td></tr>)}
            {!data.orders.length?<tr><td colSpan={8}>No orders match this period.</td></tr>:null}</tbody></table></div>
        <div className="obz-rep-head" style={{padding:16}}><button type="button" onClick={()=>setPage(p=>p-1)} disabled={page<=1||isFetching}>Previous</button><span>Page {data.page} of {data.pages}</span><button type="button" onClick={()=>setPage(p=>p+1)} disabled={page>=data.pages||isFetching}>Next</button></div>
      </section>
    </>:null}
  </div>;
}
