import { useEffect, useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { reportPagesService, brandService } from '../../../services';
import { Button, DateRangePicker, Table, SkeletonKpis, Skeleton, StatusPill, FilterChips } from '../../../components/ui';
import Dropdown from '../../../components/ui/Dropdown';
import { PageHeader, Panel, StatGrid, StatTile } from '../../../components/Dashboard/primitives';
import { useReportState } from '../../../lib/reportFilters';

/* ──────────────────────────────────────────────────────────────
   Customer report — GET /api/reports/customers
   New vs returning buyers, whether first-time buyers come back, and
   who to reward or win back. A customer = a phone number (last 10
   digits), same as the Customers page. Revenue = delivered orders
   minus refunds (the Overview's net sales).
     part=summary → KPIs, monthly bars, cohort grid
     part=list&segment=top|lapsed|new → up to 50 customers (CSV: 1000)
   ────────────────────────────────────────────────────────────── */

const num = (v) => (Number(v) || 0).toLocaleString('en-IN');
const inr = (v) => `₹${(Math.round(Number(v) || 0)).toLocaleString('en-IN')}`;
const pct1 = (v) => `${(Number(v) || 0).toFixed(1)}%`;

const istDate = (d = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
const shiftDay = (s, n) => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const ymd = (d) => (d ? istDate(new Date(d)) : '');

const daysAgo = (n) => (n <= 0 ? 'Today' : n === 1 ? 'Yesterday' : `${num(n)} days ago`);

function exportCsv(filename, columns, rows) {
  const esc = (v) => {
    let s = String(v ?? '');
    if (/^[=+\-@\t\r]/.test(s)) s = `'${s}`;
    return `"${s.replace(/"/g, '""')}"`;
  };
  const head = columns.map((c) => esc(c.label)).join(',');
  const body = rows.map((r) => columns.map((c) => esc(c.value(r))).join(',')).join('\n');
  const blob = new Blob(['﻿' + head + '\n' + body], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url; a.download = filename; document.body.appendChild(a); a.click(); a.remove();
  URL.revokeObjectURL(url);
}

function openProfile(open) {
  if (!open) return;
  try { sessionStorage.setItem('obz-customer', JSON.stringify(open)); } catch { /* storage blocked */ }
  window.history.pushState({}, '', '/dashboard/customer');
  window.dispatchEvent(new PopStateEvent('popstate'));
}

const RET = 'var(--ds-color-success)';
const NEW = 'color-mix(in srgb, var(--ds-color-info) 45%, var(--ds-color-surface))';
const muted = { fontSize: 12, color: 'var(--ds-color-text-muted)' };
const note = { fontSize: 12, color: 'var(--ds-color-text-faint)', margin: 0 };

const Swatch = ({ color }) => (
  <span aria-hidden="true" style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 2, background: color, marginRight: 5 }} />
);

/* Stacked bar per month: returning on top of new. */
function MonthBars({ months }) {
  if (!months.length || months.every((m) => !m.orders)) {
    return <p style={muted}>Bars appear here once there are orders in these months.</p>;
  }
  const max = Math.max(1, ...months.map((m) => m.orders));
  return (
    <div style={{ display: 'flex', alignItems: 'flex-end', gap: 10, height: 220, paddingTop: 8 }}>
      {months.map((m) => {
        const h = m.orders ? Math.max(6, Math.round((m.orders / max) * 170)) : 0;
        const tip = `${m.label}: ${num(m.orders)} orders · ${num(m.returningOrders)} from returning, ${num(m.newOrders)} from new`;
        return (
          <div key={m.ym} title={tip} aria-label={tip} role="img"
            style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6, height: '100%', justifyContent: 'flex-end' }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: 'var(--ds-color-text)', fontVariantNumeric: 'tabular-nums' }}>
              {m.orders ? pct1(m.returningShare) : '—'}
            </span>
            <div style={{ width: '100%', maxWidth: 46, height: h, display: 'flex', flexDirection: 'column', gap: m.returningOrders && m.newOrders ? 2 : 0 }}>
              {m.returningOrders > 0 && <span style={{ flex: m.returningOrders, minHeight: 2, background: RET, borderRadius: '4px 4px 0 0' }} />}
              {m.newOrders > 0 && <span style={{ flex: m.newOrders, minHeight: 2, background: NEW, borderRadius: m.returningOrders ? 0 : '4px 4px 0 0' }} />}
            </div>
            <span style={muted}>{m.label}</span>
          </div>
        );
      })}
    </div>
  );
}

/* Cohort grid: % of each month's first-time buyers who came back. */
function CohortGrid({ cohorts }) {
  if (!cohorts.length || cohorts.every((c) => !c.buyers)) {
    return <p style={muted}>The grid fills in once customers have placed their first orders in these months.</p>;
  }
  const th = { padding: 4, fontSize: 11, fontWeight: 600, color: 'var(--ds-color-text-muted)', letterSpacing: '.04em' };
  return (
    <div style={{ overflowX: 'auto' }}>
      <table style={{ width: '100%', borderCollapse: 'separate', borderSpacing: 3, fontSize: 12.5, fontVariantNumeric: 'tabular-nums', minWidth: 460 }}>
        <thead>
          <tr>
            <th style={{ ...th, textAlign: 'left' }}>FIRST ORDER</th>
            <th style={{ ...th, textAlign: 'right' }}>BUYERS</th>
            {[1, 2, 3, 4, 5, 6].map((k) => <th key={k} style={th} title={`By the end of month ${k} after their first`}>M{k}</th>)}
          </tr>
        </thead>
        <tbody>
          {cohorts.map((c) => (
            <tr key={c.ym}>
              <td style={{ padding: 4, whiteSpace: 'nowrap' }}>{c.label}</td>
              <td style={{ padding: 4, textAlign: 'right', color: 'var(--ds-color-text-muted)' }}>{num(c.buyers)}</td>
              {c.cells.map((cell, i) => {
                if (!cell) return <td key={i} />;
                if (cell.pct == null) return <td key={i} style={{ textAlign: 'center', color: 'var(--ds-color-text-faint)' }}>—</td>;
                const mix = Math.min(55, 8 + cell.pct * 1.2);
                return (
                  <td key={i}
                    title={`${num(cell.customers)} of ${num(c.buyers)} ordered again${cell.partial ? ' (this month is still running)' : ''}`}
                    style={{ textAlign: 'center', padding: '7px 4px', borderRadius: 6, color: 'var(--ds-color-text)', background: `color-mix(in srgb, ${RET} ${mix}%, transparent)`, fontStyle: cell.partial ? 'italic' : undefined }}>
                    {pct1(cell.pct)}
                  </td>
                );
              })}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

const SEGMENTS = [
  { value: 'top', label: 'Top customers' },
  { value: 'lapsed', label: 'At risk / lapsed' },
  { value: 'new', label: 'New this week' },
];

const LIST_NOTES = {
  top: 'Customers who ordered in the picked dates, ranked by what they spent then (delivered orders minus refunds). Orders and spent are for those dates only.',
  lapsed: 'Customers with 2 or more orders who have gone quiet: their last order was at least 30 days ago and more than twice their usual gap between orders. Ranked by total spent; the date range is ignored.',
  new: 'Customers whose first ever order was in the last 7 days; the date range is ignored.',
};

export default function CustomerReport() {
  const [from, setFrom] = useReportState('from', shiftDay(istDate(), -29));
  const [to, setTo] = useReportState('to', istDate());
  const [brandId, setBrandId] = useReportState('brandId', '');
  const [brandList, setBrandList] = useState([]);
  const [segment, setSegment] = useState('top');
  const [exporting, setExporting] = useState(false);
  const [exportError, setExportError] = useState('');

  useEffect(() => {
    let off = false;
    brandService.getAllBrands(true)
      .then((r) => { if (!off && r?.success) setBrandList(r.data || []); })
      .catch(() => {});
    return () => { off = true; };
  }, []);

  const base = { startDate: from, endDate: to, brandId: brandId || undefined };
  const sumQ = useQuery({
    queryKey: ['report-customers', 'summary', from, to, brandId],
    queryFn: () => reportPagesService.get('customers', { ...base, part: 'summary' }),
    enabled: !!(from && to),
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
  });
  const listQ = useQuery({
    queryKey: ['report-customers', 'list', from, to, brandId, segment],
    queryFn: () => reportPagesService.get('customers', { ...base, part: 'list', segment }),
    enabled: !!(from && to),
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
  });

  const data = sumQ.data;
  const k = data?.kpis;
  const months = data?.months || [];
  const cohorts = data?.cohorts || [];
  const list = listQ.data?.list;
  const shownSegment = list?.segment || segment;
  const rows = list && list.segment === segment ? list.rows : [];
  const counts = list?.counts || {};
  const brandName = brandId
    ? (brandList.find((b) => String(b.id) === String(brandId))?.display_name || brandList.find((b) => String(b.id) === String(brandId))?.name || 'This store')
    : 'All brands';
  const dimSum = sumQ.isFetching && data ? { opacity: 0.6, transition: 'opacity .15s' } : undefined;
  const inPeriod = shownSegment === 'top';

  const columns = [
    { header: 'Customer', accessor: 'name', align: 'left', cell: (r) => (
      <div style={{ minWidth: 0 }}>
        {r.open ? (
          <button type="button" onClick={() => openProfile(r.open)} title="Open customer profile"
            style={{ all: 'unset', cursor: 'pointer', fontWeight: 600, color: 'var(--ds-color-text)', textDecoration: 'underline', textDecorationColor: 'var(--ds-color-border)', textUnderlineOffset: 3 }}>
            {r.name}
          </button>
        ) : <strong style={{ fontWeight: 600 }}>{r.name}</strong>}
        <span style={{ display: 'block', fontSize: 11.5, color: 'var(--ds-color-text-faint)' }}>{r.phone || 'No phone'}</span>
      </div>
    ) },
    { header: 'City', accessor: 'city', align: 'left', cell: ({ city }) => city || '—' },
    { header: inPeriod ? 'Orders (in dates)' : 'Orders', accessor: 'orders', align: 'right', cell: ({ value }) => num(value) },
    { header: inPeriod ? 'Spent (in dates)' : 'Spent (all time)', accessor: 'spent', align: 'right', cell: ({ spent, ordered }) => (
      <span>
        {inr(spent)}
        {ordered > spent + 0.5 ? <span style={{ display: 'block', fontSize: 11.5, color: 'var(--ds-color-text-faint)' }}>{inr(ordered)} ordered</span> : null}
      </span>
    ) },
    { header: 'Last order', accessor: 'daysSince', align: 'right', cell: ({ daysSince, lastOrderAt }) => (
      <span title={ymd(lastOrderAt)} style={{ color: 'var(--ds-color-text-muted)' }}>{daysAgo(daysSince)}</span>
    ) },
    { header: 'Refused', accessor: 'rto', align: 'right', cell: ({ rto }) => (rto ? `${num(rto)} refused` : '—') },
    { header: 'Status', accessor: 'tags', align: 'right', cell: ({ tags }) => (
      <span style={{ display: 'inline-flex', gap: 4, flexWrap: 'wrap', justifyContent: 'flex-end' }}>
        {(tags || []).map((t) => <StatusPill key={t.text} tone={t.tone} size="sm">{t.text}</StatusPill>)}
      </span>
    ) },
  ];

  const doExport = async () => {
    setExporting(true); setExportError('');
    try {
      const r = await reportPagesService.get('customers', { ...base, part: 'list', segment, limit: 1000 });
      const seg = r.list.segment;
      exportCsv(`customers-${seg}_${from}_to_${to}.csv`, [
        { label: 'Name', value: (p) => p.name },
        { label: 'Phone (masked)', value: (p) => p.phone },
        { label: 'City', value: (p) => p.city },
        { label: seg === 'top' ? 'Orders (in dates)' : 'Orders', value: (p) => p.orders },
        { label: seg === 'top' ? 'Spent in dates (₹, delivered − refunds)' : 'Spent all time (₹, delivered − refunds)', value: (p) => p.spent },
        { label: 'Order value (₹)', value: (p) => p.ordered },
        { label: 'Orders all time', value: (p) => p.lifetimeOrders },
        { label: 'First order date', value: (p) => ymd(p.firstOrderAt) },
        { label: 'Last order date', value: (p) => ymd(p.lastOrderAt) },
        { label: 'Last order number', value: (p) => p.lastOrderNumber },
        { label: 'Days since last order', value: (p) => p.daysSince },
        { label: 'Usual gap (days)', value: (p) => p.usualGapDays ?? '' },
        { label: 'Refused / RTO orders', value: (p) => p.rto },
        { label: 'Status', value: (p) => (p.tags || []).map((t) => t.text).join(' / ') },
      ], r.list.rows);
    } catch (e) {
      setExportError(e?.message || 'Export failed');
    } finally { setExporting(false); }
  };

  const firstMonth = months.find((m) => m.orders);
  const lastMonth = months[months.length - 1];

  return (
    <div className="dashboard-sections" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <PageHeader
        title="Customers"
        subtitle={`New vs returning buyers, whether first-time buyers come back, and who to reward or win back. ${brandName} · ${from} → ${to} (India time)${sumQ.isFetching && data ? ' · updating…' : ''}.`}
        actions={
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <Dropdown
              value={brandId || 'all'}
              onChange={(v) => setBrandId(v === 'all' ? '' : String(v))}
              options={[{ value: 'all', label: 'All brands' }, ...brandList.map((b) => ({ value: String(b.id), label: b.display_name || b.name }))]}
              className="bset-brand-select"
            />
            <DateRangePicker label="" inline startDate={from} endDate={to}
              onStartChange={setFrom} onEndChange={setTo} maxDate={istDate()} />
          </div>
        }
      />

      {sumQ.error ? <Panel><span style={{ color: 'var(--ds-color-danger)' }}>{sumQ.error.message || 'Could not load the report.'}</span></Panel> : null}

      {/* ── KPIs ── */}
      {sumQ.isLoading && !data ? (
        <SkeletonKpis count={4} label="Loading customer figures…" />
      ) : k ? (
        <div style={dimSum} aria-busy={sumQ.isFetching || undefined}>
          <StatGrid>
            <StatTile label="Customers" value={num(k.customers)} sub="ordered in these dates" />
            <StatTile label="New" value={num(k.new)} sub={`${pct1(k.newShare)} of customers · first ever order`} />
            <StatTile label="Returning" value={num(k.returning)}
              sub={`${pct1(k.returningShare)} of customers${firstMonth && lastMonth && firstMonth.ym !== lastMonth.ym ? ` · ${pct1(lastMonth.returningShare)} of ${lastMonth.label} orders vs ${pct1(firstMonth.returningShare)} in ${firstMonth.label}` : ''}`} />
            <StatTile label="Revenue from returning" value={pct1(k.revenue.returningShare)}
              sub={`they spend ${inr(k.aov.returning)} vs ${inr(k.aov.new)} per delivered order`} />
          </StatGrid>
          <p style={{ ...note, marginTop: 8 }}>
            A customer is a phone number. New = their first ever order{brandId ? ' with this store' : ''} is in these dates; returning = they had ordered before.
            Revenue = delivered orders minus refunds (same as Overview), for orders placed in these dates; per-order spend divides it by delivered orders.
          </p>
        </div>
      ) : null}

      {/* ── Charts ── */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'stretch' }}>
        <Panel
          title="Orders from new and returning customers"
          style={{ flex: '1 1 420px', minWidth: 0, ...(dimSum || {}) }}
          actions={
            <span style={{ ...muted, display: 'flex', gap: 12 }}>
              <span><Swatch color={NEW} />New</span>
              <span><Swatch color={RET} />Returning</span>
            </span>
          }
        >
          {sumQ.isLoading && !data ? <Skeleton w="100%" h={220} r={10} /> : <MonthBars months={months} />}
          <p style={{ ...note, marginTop: 10 }}>
            Figure above each bar = share of that month’s orders from customers who had ordered before (matched by phone number). Cancelled orders are left out.
          </p>
        </Panel>

        <Panel title="Do first-time buyers come back?" style={{ flex: '1 1 460px', minWidth: 0, ...(dimSum || {}) }}>
          {sumQ.isLoading && !data ? <Skeleton w="100%" h={220} r={10} /> : <CohortGrid cohorts={cohorts} />}
          <p style={{ ...note, marginTop: 10 }}>
            % of each month’s first-time buyers who ordered again by the end of 1–6 months later (running total, so M3 includes M1 and M2;
            a second order in the same month counts from M1). Blank = not reached yet; italic = month still running.
          </p>
        </Panel>
      </div>

      {/* ── Customer list ── */}
      <Panel
        flush
        title="Customer list"
        subtitle={LIST_NOTES[segment]}
        actions={<Button variant="secondary" onClick={doExport} disabled={exporting || !rows.length}>{exporting ? 'Exporting…' : 'Export CSV'}</Button>}
      >
        <div style={{ padding: '12px 20px 0', display: 'flex', flexDirection: 'column', gap: 8 }}>
          <FilterChips
            ariaLabel="Customer group"
            items={SEGMENTS.map((s) => ({ ...s, count: list ? counts[s.value] : undefined }))}
            value={segment}
            onChange={setSegment}
          />
          {listQ.error ? <span style={{ color: 'var(--ds-color-danger)', fontSize: 13 }}>{listQ.error.message || 'Could not load the list.'}</span> : null}
          {exportError ? <span style={{ color: 'var(--ds-color-danger)', fontSize: 13 }}>{exportError}</span> : null}
        </div>
        <div style={{ padding: '8px 0 0', ...(listQ.isFetching && rows.length ? { opacity: 0.6, transition: 'opacity .15s' } : {}) }}>
          <Table
            columns={columns}
            data={rows}
            loading={listQ.isFetching && !rows.length}
            sortable={false}
            cardOnMobile
            emptyMessage={{
              top: 'Customers who ordered in these dates will appear here.',
              lapsed: 'Regular customers who have stopped ordering will appear here.',
              new: 'Customers who place their first order this week will appear here.',
            }[segment]}
          />
        </div>
        <p style={{ ...note, padding: '10px 20px 16px' }}>
          Showing up to 50 customers (Export CSV gives up to 1,000). Refused = orders the courier brought back (RTO);
          2 or more is tagged “Often refuses COD”. Click a name to open the customer’s profile.
        </p>
      </Panel>
    </div>
  );
}
