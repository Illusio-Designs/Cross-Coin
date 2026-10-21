import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { orderService, trafficReportService, brandService } from '../../../services';
import { DateRangePicker, Skeleton, SkeletonKpis, SkeletonTableRows } from '../../../components/ui';
import Dropdown from '../../../components/ui/Dropdown';
import { PageHeader } from '../../../components/Dashboard/primitives';
import { showSuccess, showError } from '../../../utils/toastNotification';
import { HugeiconsIcon } from '@hugeicons/react';
import { Download04Icon } from '@hugeicons/core-free-icons';
import { useReportState } from '../../../lib/reportFilters';

/* ──────────────────────────────────────────────────────────────
   Reports — sales on the same pipeline the Orders page uses.
   Every number comes from GET /api/reports/sales-summary:
     · Net sales  = delivered order value − refunds paid out
     · Booked     = placed − cancelled
     · RTO rate   = courier returns ÷ orders that reached an outcome
     · Return rate = customer returns ÷ delivered
   Days are India days. The brand dropdown scopes every section.
   ────────────────────────────────────────────────────────────── */

const money = (n) => `₹${(Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const num = (n) => (Number(n) || 0).toLocaleString('en-IN');
const pctTxt = (n) => `${Number(n) || 0}%`;
const label = (s) => String(s || '—').replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

const istDate = (d = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
// Invalid / empty day (e.g. a half-picked date range) is returned as-is.
const shiftDay = (s, n) => { const d = new Date(s + 'T00:00:00Z'); if (Number.isNaN(d.getTime())) return s; d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const validRange = (from, to) => /^\d{4}-\d{2}-\d{2}$/.test(from || '') && /^\d{4}-\d{2}-\d{2}$/.test(to || '') && from <= to;

const RAMP = ['var(--rr1)', 'var(--rr2)', 'var(--rr3)', 'var(--rr4)', 'var(--rr5)'];

function exportCsv(filename, columns, rows) {
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;
  const head = columns.map((c) => esc(c.label)).join(',');
  const body = rows.map((r) => columns.map((c) => esc(c.value(r))).join(',')).join('\n');
  const blob = new Blob(['﻿' + head + '\n' + body], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

const DlIcon = () => <HugeiconsIcon icon={Download04Icon} size={16} strokeWidth={2} />;

/* ▲/▼ vs the previous period of the same length. null = no baseline. */
function Delta({ pct, invert = false }) {
  if (pct === undefined) return null;
  if (pct === null || !Number.isFinite(pct)) return <span className="delta">no earlier data</span>;
  const up = pct >= 0;
  const good = invert ? !up : up;
  return <span className={`delta ${good ? 'up' : 'down'}`}>{up ? '▲' : '▼'} {Math.abs(pct)}%</span>;
}

/* Sales over time (by the India day orders were placed): order value per day,
   the part of it that has turned into net sales so far, and the previous
   period's order value (dotted) for comparison. */
function SalesTrend({ daily, previousDaily, from, to }) {
  const series = useMemo(() => {
    if (!validRange(from, to)) return [];
    const byDay = new Map((daily || []).map((d) => [d.day, d]));
    const prev = previousDaily || [];
    const span = Math.round((new Date(to) - new Date(from)) / 864e5) + 1;
    const prevStart = shiftDay(from, -span);
    const prevByDay = new Map(prev.map((d) => [d.day, d]));
    const out = [];
    let i = 0;
    for (let d = from; d <= to && out.length < 400; d = shiftDay(d, 1), i += 1) {
      const r = byDay.get(d) || {};
      const pr = prevByDay.get(shiftDay(prevStart, i)) || {};
      out.push({ day: d, value: Number(r.orderValue) || 0, net: Number(r.netSales) || 0, prev: Number(pr.orderValue) || 0, orders: Number(r.placed) || 0 });
    }
    return out;
  }, [daily, previousDaily, from, to]);
  const [hover, setHover] = useState(null);

  if (!validRange(from, to) || series.length < 2 || series.every((p) => !p.value && !p.prev)) {
    return <div className="rep-ph"><span className="hint">No orders in this period yet.</span></div>;
  }
  const W = 720, H = 200, PAD = 12;
  const max = Math.max(1, ...series.map((p) => Math.max(p.value, p.prev)));
  const x = (i) => (i / (series.length - 1)) * W;
  const y = (v) => H - PAD - (v / max) * (H - PAD * 2);
  const path = (k) => series.map((p, i) => `${i ? 'L' : 'M'}${x(i).toFixed(1)} ${y(p[k]).toFixed(1)}`).join(' ');
  const total = (k) => series.reduce((a, p) => a + p[k], 0);
  const h = hover != null ? series[hover] : null;
  const ticks = [0, Math.floor((series.length - 1) / 2), series.length - 1];
  return (
    <>
      <div className="rep-trend-wrap" onMouseLeave={() => setHover(null)}>
        <svg className="rep-chart" viewBox={`0 0 ${W} ${H}`} height="200" preserveAspectRatio="none" role="img"
          aria-label="Order value and net sales per day"
          onMouseMove={(e) => {
            const r = e.currentTarget.getBoundingClientRect();
            setHover(Math.max(0, Math.min(series.length - 1, Math.round(((e.clientX - r.left) / r.width) * (series.length - 1)))));
          }}>
          <line x1="0" y1={H * 0.33} x2={W} y2={H * 0.33} stroke="var(--ds-color-border-soft)" vectorEffect="non-scaling-stroke" />
          <line x1="0" y1={H * 0.66} x2={W} y2={H * 0.66} stroke="var(--ds-color-border-soft)" vectorEffect="non-scaling-stroke" />
          <path d={path('prev')} fill="none" stroke="var(--ds-color-text-faint)" strokeWidth="1.5" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
          <path d={`${path('value')} L${W} ${H} L0 ${H} Z`} fill="var(--ds-color-surface-soft)" />
          <path d={path('value')} fill="none" stroke="var(--ds-color-text)" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
          <path d={path('net')} fill="none" stroke="var(--ds-color-success, #16a34a)" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
          {h ? <line x1={x(hover)} y1="0" x2={x(hover)} y2={H} stroke="var(--ds-color-border)" vectorEffect="non-scaling-stroke" /> : null}
        </svg>
        <div className="rep-trend-ticks">{ticks.map((t) => <span key={t}>{new Date(series[t].day + 'T00:00:00Z').toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'UTC' })}</span>)}</div>
        {h ? (
          <div className="rep-trend-tip" style={{ left: `${(hover / (series.length - 1)) * 100}%` }}>
            <b>{new Date(h.day + 'T00:00:00Z').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })}</b>
            <span>{num(h.orders)} orders · {money(h.value)}</span>
            <span className="ok">Net sales so far {money(h.net)}</span>
            <span className="mut">Previous period {money(h.prev)}</span>
          </div>
        ) : null}
      </div>
      <div className="rep-legend">
        <div className="rep-leg"><i className="rep-key" style={{ background: 'var(--ds-color-text)' }} /><div><b className="num">{money(total('value'))}</b><small>order value</small></div></div>
        <div className="rep-leg"><i className="rep-key" style={{ background: 'var(--ds-color-success, #16a34a)' }} /><div><b className="num">{money(total('net'))}</b><small>net sales so far</small></div></div>
        <div className="rep-leg"><i className="rep-key rep-key--dash" /><div><b className="num">{money(total('prev'))}</b><small>previous period</small></div></div>
      </div>
    </>
  );
}

/* Average order value per day: booked order value ÷ booked orders (cancelled
   left out), with the previous period dotted. */
function AovTrend({ daily, previousDaily, from, to }) {
  const series = useMemo(() => {
    if (!validRange(from, to)) return [];
    const byDay = new Map((daily || []).map((d) => [d.day, d]));
    const span = Math.round((new Date(to) - new Date(from)) / 864e5) + 1;
    const prevStart = shiftDay(from, -span);
    const prevByDay = new Map((previousDaily || []).map((d) => [d.day, d]));
    const aov = (r) => (Number(r.booked) > 0 ? (Number(r.bookedValue) || 0) / Number(r.booked) : null);
    const out = [];
    let i = 0;
    for (let d = from; d <= to && out.length < 400; d = shiftDay(d, 1), i += 1) {
      out.push({ day: d, v: aov(byDay.get(d) || {}), p: aov(prevByDay.get(shiftDay(prevStart, i)) || {}), r: byDay.get(d) || {} });
    }
    return out;
  }, [daily, previousDaily, from, to]);
  const [hover, setHover] = useState(null);
  const sum = (k) => series.reduce((a, x) => a + (Number(x.r[k]) || 0), 0);
  const prevTot = (previousDaily || []).reduce((a, d) => [a[0] + (Number(d.bookedValue) || 0), a[1] + (Number(d.booked) || 0)], [0, 0]);
  const periodAov = sum('booked') ? sum('bookedValue') / sum('booked') : 0;
  const prevAov = prevTot[1] ? prevTot[0] / prevTot[1] : 0;
  if (!validRange(from, to) || !series.some((x) => x.v != null)) return <div className="rep-ph"><span className="hint">No orders in this period yet.</span></div>;
  const W = 720, H = 150, PAD = 12;
  const max = Math.max(1, ...series.map((x) => Math.max(x.v || 0, x.p || 0)));
  const X = (i) => (i / Math.max(1, series.length - 1)) * W;
  const Y = (v) => H - PAD - (v / max) * (H - PAD * 2);
  // Days without orders break the line instead of dropping to ₹0.
  const path = (k) => series.map((x, i) => (x[k] == null ? '' : `${i && series[i - 1][k] != null ? 'L' : 'M'}${X(i).toFixed(1)} ${Y(x[k]).toFixed(1)}`)).join(' ');
  const h = hover != null ? series[hover] : null;
  return (
    <>
      <div className="rep-trend-wrap" onMouseLeave={() => setHover(null)}>
        <svg className="rep-chart" viewBox={`0 0 ${W} ${H}`} height="150" preserveAspectRatio="none" role="img" aria-label="Average order value per day"
          onMouseMove={(e) => { const r = e.currentTarget.getBoundingClientRect(); setHover(Math.max(0, Math.min(series.length - 1, Math.round(((e.clientX - r.left) / r.width) * (series.length - 1))))); }}>
          <line x1="0" y1={H / 2} x2={W} y2={H / 2} stroke="var(--ds-color-border-soft)" vectorEffect="non-scaling-stroke" />
          <path d={path('p')} fill="none" stroke="var(--ds-color-text-faint)" strokeWidth="1.5" strokeDasharray="4 4" vectorEffect="non-scaling-stroke" />
          <path d={path('v')} fill="none" stroke="var(--ds-color-text)" strokeWidth="2" vectorEffect="non-scaling-stroke" strokeLinejoin="round" />
          {h ? <line x1={X(hover)} y1="0" x2={X(hover)} y2={H} stroke="var(--ds-color-border)" vectorEffect="non-scaling-stroke" /> : null}
        </svg>
        {h ? (
          <div className="rep-trend-tip" style={{ left: `${(hover / Math.max(1, series.length - 1)) * 100}%` }}>
            <b>{new Date(h.day + 'T00:00:00Z').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })}</b>
            <span>{h.v == null ? 'No orders' : `AOV ${money(h.v)} · ${num(h.r.booked)} orders`}</span>
            <span className="mut">Previous period {h.p == null ? '—' : money(h.p)}</span>
          </div>
        ) : null}
      </div>
      <div className="rep-legend">
        <div className="rep-leg"><i className="rep-key" style={{ background: 'var(--ds-color-text)' }} /><div><b className="num">{money(periodAov)}</b><small>average order value</small></div></div>
        <div className="rep-leg"><i className="rep-key rep-key--dash" /><div><b className="num">{money(prevAov)}</b><small>previous period</small></div></div>
      </div>
    </>
  );
}

/* Order value → net sales: every line by the day orders were placed. */
function SalesBreakdown({ b }) {
  if (!b) return null;
  const rounding = Math.round(((b.orderValue || 0) - ((b.gross || 0) - (b.discounts || 0) + (b.shipping || 0))) * 100) / 100;
  const Row = ({ name, v, sign = '', strong, note, tone }) => (
    <div className={`rep-bd-row${strong ? ' is-total' : ''}`}>
      <span className="rep-bd-name">{name}{note ? <small>{note}</small> : null}</span>
      <span className={`rep-bd-v num${tone ? ` ${tone}` : ''}`}>{sign}{money(Math.abs(v || 0))}</span>
    </div>
  );
  return (
    <div className="rep-bd">
      <Row name="Gross sales" v={b.gross} note="item prices × quantity" />
      <Row name="Discounts" v={b.discounts} sign="− " tone="bad" />
      <Row name="Shipping charges" v={b.shipping} sign="+ " />
      {Math.abs(rounding) >= 1 ? <Row name="Rounding & adjustments" v={rounding} sign={rounding < 0 ? '− ' : '+ '} /> : null}
      <Row name="Order value" v={b.orderValue} strong note={`${num(b.placed)} orders placed`} />
      <Row name="Cancelled" v={b.cancelled} sign="− " tone="bad" />
      <Row name="RTO (came back)" v={b.rto} sign="− " tone="bad" />
      <Row name="Not delivered yet" v={b.pending} sign="− " note="to confirm, to ship, in transit" />
      <Row name="Refunds" v={b.refunds} sign="− " tone="bad" />
      <Row name="Net sales" v={b.netSales} strong tone="ok" note={`${num(b.delivered)} orders delivered`} />
    </div>
  );
}

/* Day-by-day: order value and how much of it has become net sales. */
function DayTable({ daily, from, to, onExport }) {
  const rows = useMemo(() => {
    const byDay = new Map((daily || []).map((d) => [d.day, d]));
    const out = [];
    for (let d = to; d >= from && out.length < 400; d = shiftDay(d, -1)) out.push({ day: d, ...(byDay.get(d) || {}) });
    return out;
  }, [daily, from, to]);
  return (
    <div className="rep-panel rep-panel--flush">
      <div className="rep-ph"><h3>Day by day</h3><span className="hint">by the day the order was placed · newest first</span>
        <button type="button" className="order-sync-main-btn" onClick={onExport} style={{ marginLeft: 'auto' }}><DlIcon /> CSV</button></div>
      <div className="rep-tbl-wrap" style={{ maxHeight: 420, overflowY: 'auto' }}>
        <table className="rep-table">
          <thead><tr><th>Day</th><th className="r">Orders</th><th className="r">Order value</th><th className="r">AOV</th><th className="r">Cancelled</th><th className="r">RTO</th><th className="r">Not delivered yet</th><th className="r">Refunds</th><th className="r">Net sales</th></tr></thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.day}>
                <td className="num">{new Date(r.day + 'T00:00:00Z').toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' })}</td>
                <td className="r num">{num(r.placed)}</td>
                <td className="r num"><b>{money(r.orderValue)}</b></td>
                <td className="r num">{r.booked ? money((r.bookedValue || 0) / r.booked) : '—'}</td>
                <td className="r num">{r.cancelled ? money(r.cancelled) : '—'}</td>
                <td className="r num">{r.rto ? money(r.rto) : '—'}</td>
                <td className="r num">{r.pending ? money(r.pending) : '—'}</td>
                <td className="r num">{r.refunds ? money(r.refunds) : '—'}</td>
                <td className="r num"><b>{money(r.netSales)}</b></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

/* One horizontal bar row. */
const Bar = ({ name, right, pct, color = RAMP[0] }) => (
  <div className="rep-bar-row">
    <div className="rep-bar-top">
      <span className="rep-bar-name"><span className="lbl">{name}</span></span>
      <span className="rep-sb-pct num">{right}</span>
    </div>
    <div className="rep-track"><div className="rep-fill" style={{ width: `${Math.min(100, Math.max(pct > 0 ? 1 : 0, pct))}%`, background: color }} /></div>
  </div>
);

/* First-load placeholder for a bar list: name + value line over a track. */
const SkBars = ({ rows = 5 }) => (
  <div className="rep-bars" aria-hidden="true">
    {Array.from({ length: rows }, (_, i) => (
      <div key={i} className="rep-bar-row">
        <div className="rep-bar-top"><Skeleton w={`${40 + (i % 3) * 12}%`} h={12} /><Skeleton w={64} h={12} /></div>
        <Skeleton w="100%" h={8} r={5} />
      </div>
    ))}
  </div>
);

const Empty = ({ cols, text }) => (
  <tr><td colSpan={cols} style={{ textAlign: 'center', color: 'var(--ds-color-text-faint)' }}>{text}</td></tr>
);

export default function Reports() {
  const [from, setFrom] = useReportState('from', shiftDay(istDate(), -29));
  const [to, setTo] = useReportState('to', istDate());
  const [brandId, setBrandId] = useReportState('brandId', '');
  const [brandList, setBrandList] = useState([]);
  const [exporting, setExporting] = useState('');

  useEffect(() => {
    let off = false;
    brandService.getAllBrands(true)
      .then((r) => { if (!off && r?.success) setBrandList(r.data || []); })
      .catch(() => {});
    return () => { off = true; };
  }, []);

  // Loads as soon as both dates are set — no Apply button.
  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ['reports', 'sales-summary', from, to, brandId],
    queryFn: () => trafficReportService.getSalesSummary(from, to, brandId || undefined),
    enabled: !!(from && to),
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
  });

  const s = data?.summary || {};
  const rates = s.rates || {};
  const deltas = data?.deltas || {};
  const byBrand = data?.byBrand || [];
  const topProducts = data?.topProducts || [];
  const rtoByCourier = data?.rtoByCourier || [];
  const rtoByState = data?.rtoByState || [];
  const returnsByReason = data?.returnsByReason || [];
  const brandName = brandId ? (brandList.find((b) => String(b.id) === String(brandId))?.display_name || brandList.find((b) => String(b.id) === String(brandId))?.name) : 'All brands';
  const period = `${from}_to_${to}`;
  const placed = Number(s.placed) || 0;
  const share = (v) => (placed > 0 ? Math.round((v / placed) * 1000) / 10 : 0);

  const runExport = async (kind) => {
    setExporting(kind);
    try {
      const r = kind === 'gst'
        ? await orderService.exportGstReport(from, to)
        : await orderService.exportDeliveredOrders(from, to);
      if (r?.success) showSuccess('exported', kind === 'gst' ? 'GST report downloaded.' : 'Delivered orders downloaded.');
      else showError('exportFailed', r?.message || 'No delivered orders in that range.');
    } catch (e) {
      showError('exportFailed', e?.message || 'No delivered orders in that range.');
    } finally { setExporting(''); }
  };

  const exportSummary = () => exportCsv(`sales-summary_${period}.csv`,
    [{ label: 'Metric', value: (r) => r[0] }, { label: 'Value', value: (r) => r[1] }],
    [
      ['Brand', brandName], ['From', from], ['To', to],
      ['Orders placed', s.placed], ['Cancelled', s.cancelled], ['Booked orders', s.booked],
      ['Delivered orders', s.delivered], ['Delivered value', s.deliveredValue],
      ['Refunds paid', s.refunds], ['Net sales', s.netSales], ['Average order (delivered)', s.aov],
      ['Still in pipeline', s.inPipeline], ['Pipeline value', s.pipelineValue], ['Delivery problems', s.problems],
      ['Customer returns', s.returned], ['Courier RTO', s.rto], ['RTO value', s.rtoValue],
      ['Delivery rate %', rates.delivery], ['RTO rate %', rates.rto], ['COD RTO %', rates.codRto],
      ['Prepaid RTO %', rates.prepaidRto], ['Return rate %', rates.return], ['Cancellation rate %', rates.cancellation],
      ['COD share %', rates.codShare],
    ]);

  const exportDays = () => exportCsv(`sales-by-day_${period}.csv`, [
    { label: 'Day', value: (d) => d.day },
    { label: 'Orders placed', value: (d) => d.placed },
    { label: 'Gross sales', value: (d) => d.gross },
    { label: 'Discounts', value: (d) => d.discounts },
    { label: 'Shipping charges', value: (d) => d.shipping },
    { label: 'Order value', value: (d) => d.orderValue },
    { label: 'AOV (booked)', value: (d) => (d.booked ? Math.round((d.bookedValue / d.booked) * 100) / 100 : '') },
    { label: 'Cancelled', value: (d) => d.cancelled },
    { label: 'RTO', value: (d) => d.rto },
    { label: 'Not delivered yet', value: (d) => d.pending },
    { label: 'Refunds', value: (d) => d.refunds },
    { label: 'Net sales', value: (d) => d.netSales },
  ], data?.daily || []);

  const exportBrands = () => exportCsv(`sales-by-brand_${period}.csv`, [
    { label: 'Brand', value: (b) => b.brand },
    { label: 'Placed', value: (b) => b.placed },
    { label: 'Booked', value: (b) => b.booked },
    { label: 'Delivered', value: (b) => b.delivered },
    { label: 'Refunds', value: (b) => b.refunds },
    { label: 'Net sales', value: (b) => b.netSales },
    { label: 'AOV', value: (b) => b.aov },
    { label: 'In pipeline', value: (b) => b.pipelineValue },
    { label: 'RTO %', value: (b) => b.rtoRate },
    { label: 'Return %', value: (b) => b.returnRate },
    { label: 'Cancel %', value: (b) => b.cancellationRate },
    { label: 'COD %', value: (b) => b.codShare },
  ], byBrand);

  const exportProducts = () => exportCsv(`top-products_${period}.csv`, [
    { label: 'Product', value: (p) => p.name },
    { label: 'Units booked', value: (p) => p.units },
    { label: 'Booked value', value: (p) => p.value },
    { label: 'Units delivered', value: (p) => p.deliveredUnits },
    { label: 'Units returned', value: (p) => p.returnedUnits },
    { label: 'Units RTO', value: (p) => p.rtoUnits },
  ], topProducts);

  // First load (nothing to show yet) → skeletons in place of each section.
  // A date-range / brand change keeps the old figures on screen, dimmed.
  const first = isLoading && !data;
  const refreshing = isFetching && !!data;
  const dim = refreshing ? { opacity: 0.6, transition: 'opacity .15s' } : undefined;

  const flow = [
    { name: 'Waiting for COD call', v: s.toConfirm, c: RAMP[3] },
    { name: 'To ship / in transit', v: (s.inPipeline || 0) - (s.toConfirm || 0) - (s.problems || 0), c: RAMP[2] },
    { name: 'Delivery problem (NDR)', v: s.problems, c: RAMP[3] },
    { name: 'Delivered & kept', v: (s.delivered || 0) - (s.returned || 0), c: RAMP[0] },
    { name: 'Delivered, then returned', v: s.returned, c: RAMP[1] },
    { name: 'Courier RTO', v: s.rto, c: RAMP[4] },
    { name: 'Cancelled', v: s.cancelled, c: RAMP[4] },
  ];

  return (
    <div className="dashboard-sections obz-rep">
      <PageHeader
        title="Reports"
        subtitle={`${brandName} · ${from} → ${to} (India time)${isFetching && data ? ' · updating…' : ''}. Net sales = delivered orders minus refunds.`}
        actions={
          <div className="obz-rep-head">
            <Dropdown
              value={brandId || 'all'}
              onChange={(v) => setBrandId(v === 'all' ? '' : v)}
              options={[{ value: 'all', label: 'All brands' }, ...brandList.map((b) => ({ value: b.id, label: b.display_name || b.name }))]}
              className="bset-brand-select"
            />
            <DateRangePicker label="" inline startDate={from} endDate={to}
              onStartChange={setFrom} onEndChange={setTo} maxDate={istDate()} />
            <button type="button" className="order-sync-main-btn" onClick={exportSummary} disabled={!data}>
              <DlIcon /> Summary CSV
            </button>
            <button type="button" className="order-sync-main-btn" onClick={() => runExport('delivered')} disabled={!!exporting}
              title="Excel of orders delivered in this range (all brands)">
              <DlIcon /> {exporting === 'delivered' ? 'Exporting…' : 'Delivered orders'}
            </button>
            <button type="button" className="order-sync-main-btn" onClick={() => runExport('gst')} disabled={!!exporting}
              title="GST sales report: delivered orders by invoice date, per line item (all brands)">
              <DlIcon /> {exporting === 'gst' ? 'Exporting…' : 'GST report'}
            </button>
          </div>
        }
      />

      {first ? (
        <>
          <SkeletonKpis count={5} label="Loading the report…" />
          <div className="rep-panel" aria-hidden="true">
            <div className="rep-ph"><h3>Sales over time</h3><span className="hint">by the day the order was placed, India days</span></div>
            <Skeleton w="100%" h={200} r={10} />
            <div className="rep-legend" style={{ marginTop: 12 }}>
              {[0, 1, 2].map((i) => <div key={i} className="rep-leg"><div style={{ flex: 1 }}><Skeleton w="55%" h={16} /><Skeleton w="70%" h={10} style={{ marginTop: 4 }} /></div></div>)}
            </div>
          </div>
          <div className="rep-masonry" aria-hidden="true">
            <div className="rep-panel"><div className="rep-ph"><h3>Where the orders are now</h3></div><SkBars rows={5} /></div>
            <div className="rep-panel">
              <div className="rep-ph"><h3>Rates</h3></div>
              <div className="rep-tiles">
                {Array.from({ length: 6 }, (_, i) => (
                  <div key={i} className="rep-tile"><Skeleton w="50%" h={10} /><Skeleton w="45%" h={18} style={{ marginTop: 7 }} /><Skeleton w="70%" h={10} style={{ marginTop: 6 }} /></div>
                ))}
              </div>
            </div>
            {[
              ['COD vs prepaid', ['', 'Orders', 'Delivered', 'Delivered value', 'RTO', 'RTO %'], 2],
              ...(!brandId ? [['By brand', ['Brand', 'Booked', 'Delivered', 'Net sales', 'RTO %', 'Return %'], 4]] : []),
              ['Top products', ['#', 'Product', 'Units', 'Value', 'Delivered', 'Back'], 6],
              ['RTO by courier', ['Courier', 'Delivered', 'RTO', 'RTO %'], 4],
            ].map(([title, cols, rows]) => (
              <div key={title} className="rep-panel rep-panel--flush">
                <div className="rep-ph"><h3>{title}</h3></div>
                <div className="rep-tbl-wrap">
                  <table className="rep-table">
                    <thead><tr>{cols.map((c, i) => <th key={i} className={i ? 'r' : undefined}>{c}</th>)}</tr></thead>
                    <tbody><SkeletonTableRows rows={rows} cols={cols.length} /></tbody>
                  </table>
                </div>
              </div>
            ))}
            <div className="rep-panel"><div className="rep-ph"><h3>RTO by state</h3></div><SkBars rows={5} /></div>
            <div className="rep-panel rep-panel--flush">
              <div className="rep-ph"><h3>Returns by reason</h3></div>
              <div className="rep-tbl-wrap">
                <table className="rep-table">
                  <thead><tr><th>Reason</th><th className="r">Returns</th><th className="r">Refunded</th><th className="r">Refund value</th></tr></thead>
                  <tbody><SkeletonTableRows rows={4} cols={4} /></tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      ) : error ? (
        <div className="rep-state" style={{ color: 'var(--ds-color-danger)' }}>Couldn't load the report: {error.message || 'try again'}</div>
      ) : !data ? null : (
        <>
          <div className="rep-kpis" style={dim} aria-busy={refreshing || undefined}>
            <div className="rep-kpi">
              <div className="rep-kl">Order value</div>
              <div className="rep-kv num">{money(data.breakdown?.orderValue)}</div>
              <div className="rep-kf">{num(s.placed)} orders placed · {money(data.breakdown?.pending)} not delivered yet</div>
            </div>
            <div className="rep-kpi">
              <div className="rep-kl">Net sales</div>
              <div className="rep-kv num">{money(s.netSales)}</div>
              <div className="rep-kf"><Delta pct={deltas.netSales} /> · {money(s.deliveredValue)} delivered − {money(s.refunds)} refunds</div>
            </div>
            <div className="rep-kpi">
              <div className="rep-kl">Orders booked</div>
              <div className="rep-kv num">{num(s.booked)}</div>
              <div className="rep-kf"><Delta pct={deltas.booked} /> · {num(s.placed)} placed, {num(s.cancelled)} cancelled</div>
            </div>
            <div className="rep-kpi">
              <div className="rep-kl">Delivered</div>
              <div className="rep-kv num">{num(s.delivered)}</div>
              <div className="rep-kf"><Delta pct={deltas.delivered} /> · {pctTxt(rates.delivery)} delivery rate</div>
            </div>
            <div className="rep-kpi">
              <div className="rep-kl">Avg order (delivered)</div>
              <div className="rep-kv num">{money(s.aov)}</div>
              <div className="rep-kf"><Delta pct={deltas.aov} /> vs previous {`${Math.round((new Date(to) - new Date(from)) / 864e5) + 1}`} days</div>
            </div>
          </div>

          <div className="rep-grid2 rep-grid2--wide" style={dim} aria-busy={refreshing || undefined}>
            <div className="rep-panel">
              <div className="rep-ph"><h3>Sales over time</h3><span className="hint">by the day the order was placed, India days</span></div>
              <SalesTrend daily={data.daily} previousDaily={data.previousDaily} from={from} to={to} />
            </div>
            <div className="rep-panel">
              <div className="rep-ph"><h3>Sales breakdown</h3><span className="hint">order value → net sales</span></div>
              <SalesBreakdown b={data.breakdown} />
            </div>
          </div>

          <div className="rep-panel" style={dim} aria-busy={refreshing || undefined}>
            <div className="rep-ph"><h3>Average order value over time</h3><span className="hint">order value ÷ orders (cancelled left out), by order day</span></div>
            <AovTrend daily={data.daily} previousDaily={data.previousDaily} from={from} to={to} />
          </div>

          <div style={dim}><DayTable daily={data.daily} from={from} to={to} onExport={exportDays} /></div>

          <div className="rep-masonry" style={dim} aria-busy={refreshing || undefined}>
            <div className="rep-panel">
              <div className="rep-ph"><h3>Where the orders are now</h3><span className="hint">{num(placed)} placed in this period</span></div>
              <div className="rep-bars">
                {placed === 0 ? <span className="hint">No orders in this period</span>
                  : flow.filter((f) => f.v > 0).map((f) => (
                    <Bar key={f.name} name={f.name} right={`${num(f.v)} · ${share(f.v)}%`} pct={share(f.v)} color={f.c} />
                  ))}
              </div>
            </div>

            <div className="rep-panel">
              <div className="rep-ph"><h3>Rates</h3></div>
              <div className="rep-tiles">
                <div className="rep-tile"><div className="rep-tl">RTO rate</div><div className="rep-tv num">{pctTxt(rates.rto)}</div><div className="rep-ts bad">{num(s.rto)} came back · {money(s.rtoValue)}</div></div>
                <div className="rep-tile"><div className="rep-tl">Return rate</div><div className="rep-tv num">{pctTxt(rates.return)}</div><div className="rep-ts">{num(s.returned)} of {num(s.delivered)} delivered</div></div>
                <div className="rep-tile"><div className="rep-tl">COD RTO</div><div className="rep-tv num">{pctTxt(rates.codRto)}</div><div className="rep-ts bad">{num(s.cod?.rto)} orders</div></div>
                <div className="rep-tile"><div className="rep-tl">Prepaid RTO</div><div className="rep-tv num">{pctTxt(rates.prepaidRto)}</div><div className="rep-ts">{num(s.prepaid?.rto)} orders</div></div>
                <div className="rep-tile"><div className="rep-tl">Cancelled</div><div className="rep-tv num">{pctTxt(rates.cancellation)}</div><div className="rep-ts">{num(s.cancelled)} orders</div></div>
                <div className="rep-tile"><div className="rep-tl">Still open</div><div className="rep-tv num">{money(s.pipelineValue)}</div><div className="rep-ts">{num(s.inPipeline)} orders not delivered yet</div></div>
              </div>
            </div>

            <div className="rep-panel rep-panel--flush">
              <div className="rep-ph"><h3>COD vs prepaid</h3><span className="hint">COD is {pctTxt(rates.codShare)} of orders</span></div>
              <div className="rep-tbl-wrap">
                <table className="rep-table">
                  <thead><tr><th></th><th className="r">Orders</th><th className="r">Delivered</th><th className="r">Delivered value</th><th className="r">RTO</th><th className="r">RTO %</th></tr></thead>
                  <tbody>
                    {[['COD', s.cod, rates.codRto], ['Prepaid', s.prepaid, rates.prepaidRto]].map(([n, p, r]) => (
                      <tr key={n}>
                        <td className="strong">{n}</td>
                        <td className="r num">{num(p?.orders)}</td>
                        <td className="r num">{num(p?.delivered)}</td>
                        <td className="r strong num">{money(p?.deliveredValue)}</td>
                        <td className="r num">{num(p?.rto)}</td>
                        <td className="r num">{pctTxt(r)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            {!brandId && (
              <div className="rep-panel rep-panel--flush">
                <div className="rep-ph">
                  <h3>By brand</h3>
                  <button type="button" className="order-sync-main-btn" onClick={exportBrands} disabled={!byBrand.length}><DlIcon /> CSV</button>
                </div>
                <div className="rep-tbl-wrap">
                  <table className="rep-table">
                    <thead><tr><th>Brand</th><th className="r">Booked</th><th className="r">Delivered</th><th className="r">Net sales</th><th className="r">RTO %</th><th className="r">Return %</th></tr></thead>
                    <tbody>
                      {byBrand.length === 0 ? <Empty cols={6} text="No orders in this period" /> : byBrand.map((b, i) => (
                        <tr key={b.brandId ?? b.brand}>
                          <td className="strong"><span className="rep-dot" style={{ background: RAMP[i % RAMP.length] }} />{b.brand}</td>
                          <td className="r num">{num(b.booked)}</td>
                          <td className="r num">{num(b.delivered)}</td>
                          <td className="r strong num">{money(b.netSales)}</td>
                          <td className="r num">{pctTxt(b.rtoRate)}</td>
                          <td className="r num">{pctTxt(b.returnRate)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            <div className="rep-panel rep-panel--flush">
              <div className="rep-ph">
                <h3>Top products</h3>
                <button type="button" className="order-sync-main-btn" onClick={exportProducts} disabled={!topProducts.length}><DlIcon /> CSV</button>
              </div>
              <div className="rep-tbl-wrap">
                <table className="rep-table">
                  <thead><tr><th style={{ width: 32 }}>#</th><th>Product</th><th className="r">Units</th><th className="r">Value</th><th className="r">Delivered</th><th className="r">Back</th></tr></thead>
                  <tbody>
                    {topProducts.length === 0 ? <Empty cols={6} text="No products sold in this period" /> : topProducts.slice(0, 10).map((p, i) => (
                      <tr key={p.id ?? i}>
                        <td className="rank">{i + 1}</td>
                        <td className="strong rep-prod">{p.name}</td>
                        <td className="r num">{num(p.units)}</td>
                        <td className="r strong num">{money(p.value)}</td>
                        <td className="r num">{num(p.deliveredUnits)}</td>
                        <td className="r num" title="returned + RTO units">{num((p.returnedUnits || 0) + (p.rtoUnits || 0))}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rep-panel rep-panel--flush">
              <div className="rep-ph"><h3>RTO by courier</h3><span className="hint">of orders that reached an outcome</span></div>
              <div className="rep-tbl-wrap">
                <table className="rep-table">
                  <thead><tr><th>Courier</th><th className="r">Delivered</th><th className="r">RTO</th><th className="r">RTO %</th></tr></thead>
                  <tbody>
                    {rtoByCourier.length === 0 ? <Empty cols={4} text="Nothing delivered or returned yet" /> : rtoByCourier.map((c) => (
                      <tr key={c.courier}>
                        <td className="strong">{c.courier}</td>
                        <td className="r num">{num(c.delivered)}</td>
                        <td className="r num">{num(c.rto)}</td>
                        <td className="r strong num">{pctTxt(c.rtoRate)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rep-panel">
              <div className="rep-ph"><h3>RTO by state</h3><span className="hint">states with the most courier returns</span></div>
              <div className="rep-bars">
                {rtoByState.length === 0 ? <span className="hint">No RTO in this period</span>
                  : rtoByState.slice(0, 8).map((r) => (
                    <Bar key={r.state} name={r.state || 'Unknown'} right={`${num(r.rto)} of ${num((r.delivered || 0) + (r.rto || 0))} · ${pctTxt(r.rtoRate)}`} pct={r.rtoRate} color={RAMP[4]} />
                  ))}
              </div>
            </div>

            <div className="rep-panel rep-panel--flush">
              <div className="rep-ph"><h3>Returns by reason</h3><span className="hint">customer returns raised in this period</span></div>
              <div className="rep-tbl-wrap">
                <table className="rep-table">
                  <thead><tr><th>Reason</th><th className="r">Returns</th><th className="r">Refunded</th><th className="r">Refund value</th></tr></thead>
                  <tbody>
                    {returnsByReason.length === 0 ? <Empty cols={4} text="No returns in this period" /> : returnsByReason.map((r) => (
                      <tr key={r.reason}>
                        <td className="strong">{label(r.reason)}</td>
                        <td className="r num">{num(r.returns)}</td>
                        <td className="r num">{num(r.refunded)}</td>
                        <td className="r strong num">{money(r.refundValue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
