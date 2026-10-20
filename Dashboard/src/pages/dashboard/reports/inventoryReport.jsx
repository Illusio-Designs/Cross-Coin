import { useEffect, useMemo, useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { reportPagesService, brandService } from '../../../services';
import { Button, Input, Table, SkeletonKpis, FilterChips, StatusPill, Pagination, Skeleton } from '../../../components/ui';
import { PageHeader, Panel, StatGrid, StatTile } from '../../../components/Dashboard/primitives';
import Dropdown from '../../../components/ui/Dropdown';
import { showError } from '../../../utils/toastNotification';

/**
 * Inventory — days of stock left for every active variant, what to reorder,
 * and stock that is not selling. Data: GET /api/reports/inventory.
 *
 *   Sold       = units on orders placed in the last 7 / 30 / 90 India days
 *                (cancelled left out), minus units that came back (RTO or a
 *                customer return). Every store's orders count — stock is shared.
 *   Days left  = stock ÷ average units sold per day (∞ when nothing sold)
 *   Status     = Out of stock · Reorder now (< 7 days, < 14 for A items)
 *                · Low (< 21) · Too much stock (> 120) · No sales · Healthy
 *   ABC        = A: top 80% of revenue, B: next 15%, C: the rest
 *
 * Stock value at cost is only sent to admins; everyone else sees units.
 */

const PAGE_SIZE = 50;
const WINDOWS = [
  { value: '7', label: 'Last 7 days' },
  { value: '30', label: 'Last 30 days' },
  { value: '90', label: 'Last 90 days' },
];

const num = (v) => (Number(v) || 0).toLocaleString('en-IN');
const inr = (v) => `₹${(Math.round(Number(v) || 0)).toLocaleString('en-IN')}`;
const pct1 = (v) => `${(Number(v) || 0).toFixed(1)}%`;
const perDayTxt = (v) => { const n = Number(v) || 0; return n > 0 && n < 0.1 ? '<0.1' : n.toFixed(1); };
const daysTxt = (r) => {
  if (r.status === 'out') return '0';
  if (r.daysLeft === null || r.daysLeft === undefined) return '∞';
  if (r.daysLeft < 1) return '<1d';
  return `${num(Math.round(r.daysLeft))}d`;
};

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

// Status → pill tone and days-left bar colour.
const STATUS_TONE = { out: 'problem', reorder: 'problem', low: 'needs', over: 'progress', dead: 'neutral', ok: 'done' };
const BAR = {
  out: 'var(--ds-color-danger, #dc2626)', reorder: 'var(--ds-color-danger, #dc2626)', low: 'var(--ds-color-warn, #f79009)',
  ok: 'var(--ds-color-success, #12b76a)', over: 'var(--ds-color-info, #2e90fa)', dead: 'var(--ds-color-info, #2e90fa)',
};
const GRADE_TONE = { A: 'done', B: 'progress', C: 'neutral' };

const muted = { fontSize: 12.5, color: 'var(--ds-color-text-muted)' };
const mono = { display: 'block', fontFamily: "'JetBrains Mono', ui-monospace, monospace", fontSize: 11, color: 'var(--ds-color-text-faint)', marginTop: 2 };

function DaysBar({ row }) {
  const d = row.daysLeft;
  const w = row.status === 'out' ? 0 : d === null || d === undefined ? 100 : Math.min(100, (d / 120) * 100);
  return (
    <span style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 150 }}>
      <span style={{ flex: 1, height: 8, borderRadius: 4, background: 'var(--ds-color-surface-soft)', overflow: 'hidden' }} aria-hidden="true">
        <span style={{ display: 'block', height: '100%', width: `${w.toFixed(0)}%`, background: BAR[row.status] }} />
      </span>
      <span style={{ width: 48, textAlign: 'right', fontVariantNumeric: 'tabular-nums' }}>{daysTxt(row)}</span>
    </span>
  );
}

export default function InventoryReport() {
  const [brandId, setBrandId] = useState('');
  const [brandList, setBrandList] = useState([]);
  const [windowDays, setWindowDays] = useState('30');
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [term, setTerm] = useState('');
  const [page, setPage] = useState(1);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    let off = false;
    brandService.getAllBrands(true)
      .then((r) => { if (!off && r?.success) setBrandList(r.data || []); })
      .catch(() => {});
    return () => { off = true; };
  }, []);

  // Search waits for a short pause in typing.
  useEffect(() => {
    const t = setTimeout(() => setTerm(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);
  useEffect(() => { setPage(1); }, [brandId, windowDays, filter, term]);

  const params = { brandId: brandId || undefined, window: windowDays, filter, q: term || undefined };
  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ['reports', 'inventory', brandId, windowDays, filter, term],
    queryFn: () => reportPagesService.get('inventory', params),
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
  });

  const admin = !!data?.canSeeCost;
  const k = data?.kpis;
  const abc = data?.abc;
  const counts = data?.counts || {};
  const rows = useMemo(() => data?.rows || [], [data]);
  const w = data?.window || Number(windowDays);
  const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
  const pageRows = useMemo(() => rows.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE), [rows, page]);
  const brandName = brandId ? (brandList.find((b) => String(b.id) === String(brandId))?.display_name || brandList.find((b) => String(b.id) === String(brandId))?.name || 'This brand') : 'All brands';

  const columns = useMemo(() => [
    { header: 'Variant', accessor: 'product', align: 'left', cell: (r) => (
      <span style={{ display: 'block', minWidth: 200 }}>
        <strong>{r.product}</strong>{r.variant && r.variant !== r.sku ? <span style={{ color: 'var(--ds-color-text-muted)' }}> · {r.variant}</span> : null}
        <span style={mono}>{r.sku || '—'} · {r.brand}</span>
      </span>
    ) },
    { header: 'ABC', accessor: 'grade', align: 'center', cell: ({ grade }) => <StatusPill tone={GRADE_TONE[grade]} size="sm">{grade}</StatusPill> },
    { header: 'In stock', accessor: 'stock', align: 'right', cell: ({ value }) => num(value) },
    { header: `Sold (${w}d)`, accessor: 'sold', align: 'right', cell: ({ value, returnedUnits }) => (
      <span title={returnedUnits ? `${num(returnedUnits)} more came back (RTO / return) and are not counted` : undefined}>{num(value)}</span>
    ) },
    { header: 'Sold / day', accessor: 'perDay', align: 'right', cell: ({ value }) => perDayTxt(value) },
    { header: 'Days left', accessor: 'daysLeft', align: 'left', cell: (r) => <DaysBar row={r} /> },
    { header: 'Sell-through', accessor: 'sellThrough', align: 'right', cell: ({ value }) => (value === null || value === undefined ? '—' : pct1(value)) },
    ...(admin ? [{ header: 'Value at cost', accessor: 'value', align: 'right', cell: ({ value, stock }) => (
      stock <= 0 ? '—' : value === null || value === undefined
        ? <span style={{ color: 'var(--ds-color-text-faint)' }} title="No cost price set on this variant">no cost</span>
        : inr(value)
    ) }] : []),
    { header: 'Status', accessor: 'statusLabel', align: 'right', cell: (r) => (
      <span style={{ display: 'inline-flex', flexDirection: 'column', alignItems: 'flex-end', gap: 3 }}>
        <StatusPill tone={STATUS_TONE[r.status]} size="sm">{r.statusLabel}</StatusPill>
        {r.status === 'out' && r.waiting > 0 ? (
          <span style={{ fontSize: 11.5, color: 'var(--ds-color-text-muted)' }} title="Shoppers who saved this product or have it in their cart — they get a WhatsApp when it is back in stock">
            {num(r.waiting)} waiting
          </span>
        ) : null}
      </span>
    ) },
  ], [admin, w]);

  const doExport = async () => {
    setExporting(true);
    try {
      const all = await reportPagesService.get('inventory', { ...params, limit: 20000 });
      const cost = !!all.canSeeCost;
      exportCsv(`inventory_${all.window}d_${all.to}${filter !== 'all' ? `_${filter}` : ''}.csv`, [
        { label: 'Product', value: (r) => r.product },
        { label: 'Variant', value: (r) => r.variant },
        { label: 'SKU', value: (r) => r.sku },
        { label: 'Brand', value: (r) => r.brand },
        { label: 'ABC', value: (r) => r.grade },
        { label: 'In stock', value: (r) => r.stock },
        { label: `Sold (last ${all.window} days, after RTO/returns)`, value: (r) => r.sold },
        { label: 'Came back (RTO/returns)', value: (r) => r.returnedUnits },
        { label: 'Sold per day', value: (r) => r.perDay },
        { label: 'Days left', value: (r) => (r.status === 'out' ? 0 : r.daysLeft === null ? 'no sales' : Math.round(r.daysLeft)) },
        { label: 'Sell-through %', value: (r) => (r.sellThrough === null ? '' : r.sellThrough) },
        { label: 'Revenue', value: (r) => r.revenue },
        ...(cost ? [
          { label: 'Cost price', value: (r) => (r.costPrice === null ? '' : r.costPrice) },
          { label: 'Value at cost', value: (r) => (r.value === null ? '' : r.value) },
        ] : []),
        { label: 'Status', value: (r) => r.statusLabel },
        { label: 'Shoppers waiting', value: (r) => (r.status === 'out' ? r.waiting || 0 : '') },
      ], all.rows || []);
    } catch (e) {
      showError(null, e?.message || 'Could not export the list');
    } finally { setExporting(false); }
  };

  const reorderAt = data?.thresholds || { reorder: 7, reorderA: 14, low: 21, over: 120 };
  const emptyMessage = term
    ? `No variants match “${term}”.`
    : filter === 'action'
      ? `Nothing needs action — every variant in stock has at least ${reorderAt.low} days left.`
      : filter === 'over'
        ? `No slow stock — every variant sold in the last ${w} days and has under ${reorderAt.over} days left.`
        : 'Active product variants will appear here with their stock and sales.';

  const abcCards = abc ? [
    { g: 'A', title: `${num(abc.A.count)} variant${abc.A.count === 1 ? '' : 's'} · ${pct1(abc.A.share)} of revenue`, body: `Never let these run out. Reorder when ${reorderAt.reorderA} days are left.` },
    { g: 'B', title: `${num(abc.B.count)} variant${abc.B.count === 1 ? '' : 's'} · ${pct1(abc.B.share)} of revenue`, body: 'Normal reorder cycle.' },
    { g: 'C', title: `${num(abc.C.count)} variant${abc.C.count === 1 ? '' : 's'} · ${pct1(abc.C.share)} of revenue`, body: 'Order small, bundle, or discount to clear. Includes variants with no sales.' },
  ] : [];

  return (
    <div className="dashboard-sections" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <PageHeader
        title="Inventory"
        subtitle={`Days of stock left for every variant, what to reorder, and stock that is not selling. ${brandName} · sales from the last ${w} days, up to today (India time)${isFetching && data ? ' · updating…' : ''}.`}
        actions={
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
            <div style={{ minWidth: 160 }}>
              <Dropdown
                value={brandId ? String(brandId) : 'all'}
                onChange={(v) => setBrandId(v === 'all' ? '' : String(v))}
                options={[{ value: 'all', label: 'All brands' }, ...brandList.map((b) => ({ value: String(b.id), label: b.display_name || b.name }))]}
              />
            </div>
            <div style={{ minWidth: 150 }}>
              <Dropdown value={windowDays} onChange={(v) => setWindowDays(String(v))} options={WINDOWS} />
            </div>
            <Button variant="secondary" onClick={doExport} disabled={!data || exporting || !data.total}>
              {exporting ? 'Exporting…' : 'Export CSV'}
            </Button>
          </div>
        }
      />

      {error ? <Panel><span style={{ color: 'var(--ds-color-danger, #dc2626)' }}>{error.message || 'Could not load the inventory report.'}</span></Panel> : null}

      {/* ── KPI tiles ── */}
      {isLoading && !data ? (
        <SkeletonKpis count={4} label="Loading stock figures…" />
      ) : k ? (
        <div style={isFetching ? { opacity: 0.6, transition: 'opacity .15s' } : undefined} aria-busy={isFetching || undefined}>
          <StatGrid>
            {admin ? (
              <StatTile label="Stock value" value={inr(k.stockValue)}
                sub={`at cost price · ${num(k.unitsInStock)} units${k.missingCost ? ` · ${num(k.missingCost)} variant${k.missingCost === 1 ? '' : 's'} have no cost price` : ''}`} />
            ) : (
              <StatTile label="Units in stock" value={num(k.unitsInStock)} sub={`across ${num(k.variants)} variant${k.variants === 1 ? '' : 's'}`} />
            )}
            <StatTile label="Reorder now" value={num(k.reorderNow)} tone={k.reorderNow ? 'problem' : undefined}
              sub={`less than ${reorderAt.reorder} days left (${reorderAt.reorderA} for A items)`} />
            <StatTile label="Out of stock" value={num(k.outOfStock)} tone={k.outOfStock ? 'problem' : undefined}
              sub={k.outOfStock ? (k.outWithRequests ? `${num(k.outWithRequests)} ${k.outWithRequests === 1 ? 'has' : 'have'} back-in-stock requests` : 'no one waiting for these') : 'every variant has stock'} />
            <StatTile label="Not selling" value={num(k.notSelling)} tone={k.notSelling ? 'needs' : undefined}
              sub={admin ? `${inr(k.notSellingValue)} tied up at cost` : `${num(k.notSellingUnits)} units with no sales in ${w} days`} />
          </StatGrid>
        </div>
      ) : null}

      {/* ── Stock list ── */}
      <Panel flush title="Stock list" subtitle={`Days left = stock ÷ average units sold per day (last ${w} days). Most urgent first.`}>
        <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px' }}>
          <FilterChips
            ariaLabel="Stock filter"
            value={filter}
            onChange={setFilter}
            items={[
              { value: 'all', label: 'All variants', count: data ? counts.all : undefined },
              { value: 'action', label: 'Needs action', count: data ? counts.action : undefined },
              { value: 'over', label: 'Too much / not selling', count: data ? counts.over : undefined },
            ]}
          />
          <div style={{ flex: '0 1 280px', minWidth: 200 }}>
            <Input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search product, SKU, colour, brand" ariaLabel="Search variants" />
          </div>
        </div>
        <div style={isFetching && data ? { opacity: 0.6, transition: 'opacity .15s' } : undefined}>
          <Table
            columns={columns}
            data={pageRows}
            loading={isLoading && !data}
            sortable={false}
            emptyMessage={emptyMessage}
          />
        </div>
        {data && (pages > 1 || data.limited) ? (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 10, justifyContent: 'space-between', alignItems: 'center', padding: '12px 20px' }}>
            <span style={muted}>
              {data.limited
                ? `Showing the ${num(rows.length)} most urgent of ${num(data.total)} — search or pick a filter to narrow down. Export CSV has them all.`
                : `${num(data.total)} variants`}
            </span>
            {pages > 1 ? <Pagination currentPage={page} totalPages={pages} onPageChange={setPage} size="sm" /> : null}
          </div>
        ) : null}
      </Panel>

      {/* ── ABC explainer ── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(240px, 100%), 1fr))', gap: 12 }}>
        {abc ? abcCards.map((c) => (
          <Panel key={c.g}>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
              <span style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                <StatusPill tone={GRADE_TONE[c.g]} size="sm">{c.g}</StatusPill>
                <b style={{ fontSize: 14 }}>{c.title}</b>
              </span>
              <span style={{ fontSize: 13, color: 'var(--ds-color-text-muted)' }}>{c.body}</span>
            </div>
          </Panel>
        )) : isLoading ? [0, 1, 2].map((i) => (
          <Panel key={i}><Skeleton w="60%" h={14} /><Skeleton w="85%" h={11} style={{ marginTop: 8 }} /></Panel>
        )) : null}
      </div>

      <p style={{ ...muted, margin: 0, lineHeight: 1.6 }}>
        Sold counts units on orders placed in the last {w} days (cancelled orders left out), minus units that came back as RTO or a customer return.
        Orders from every store count, because the stock is shared. Sell-through is the share of stock that sold: sold ÷ (sold + stock now).
        ABC ranks variants by revenue in the same {w} days: A makes the first 80% of revenue, B the next 15%, C the rest.
        Back-in-stock requests are shoppers who saved the product or have it in their cart; they get a WhatsApp when it is back.
        {admin ? ' Value at cost = stock × cost price; variants without a cost price are left out of it.' : ''}
      </p>
    </div>
  );
}
