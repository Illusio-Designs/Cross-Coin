import { useEffect, useMemo, useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { reportPagesService, brandService } from '../../../services';
import { Button, DateRangePicker, Table, SkeletonKpis, Skeleton, StatusPill } from '../../../components/ui';
import { PageHeader, Panel, StatGrid, StatTile } from '../../../components/Dashboard/primitives';
import Dropdown from '../../../components/ui/Dropdown';
import { useReportState } from '../../../lib/reportFilters';

/* ──────────────────────────────────────────────────────────────
   Coupon report — GET /api/reports/coupons (services/reports/couponReport.js)
   One row per code used on orders placed in the range (cancelled left out).
   A code is orders.coupon_id, or the code a partner checkout wrote into the
   order notes. The prepaid instant discount is NOT a code: it sits in its own
   "No code" row. Pack prices and loyalty points never show here (pack prices
   are already in the item price; points are not redeemed at checkout).
   Cost of goods and margin come back for admins only; the columns hide when
   they are missing.
   ────────────────────────────────────────────────────────────── */

const num = (v) => (Number(v) || 0).toLocaleString('en-IN');
const inr = (v) => `₹${(Math.round(Number(v) || 0)).toLocaleString('en-IN')}`;
const pc = (v) => `${(Number(v) || 0).toFixed(1)}%`;

const istDate = (d = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
const shiftDay = (s, n) => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const dayTxt = (d) => (d ? new Date(d).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', timeZone: 'Asia/Kolkata' }) : '—');

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

// Same in-admin navigation the other pages use (history + popstate).
function goToView(view) {
  window.history.pushState({}, '', view === 'main' ? '/dashboard' : `/dashboard/${view}`);
  window.dispatchEvent(new PopStateEvent('popstate'));
}
function openOrder(orderNumber) {
  try { sessionStorage.setItem('obz-orders-search', String(orderNumber)); } catch { /* storage blocked */ }
  goToView('orders');
}

const SPLIT_COLOR = {
  discount: 'var(--ds-color-warn, #f59e0b)',
  cost: 'var(--ds-color-info, #3b82f6)',
  shipping: 'var(--ds-color-danger, #dc2626)',
  left: 'var(--ds-color-success, #12b76a)',
  rest: 'var(--ds-color-border, #d4d4d8)',
};
const STAGE_TXT = {
  delivered: 'Delivered', returned: 'Returned', rto: 'RTO', to_confirm: 'To confirm', to_ship: 'To ship',
  in_transit: 'In transit', problems: 'Delivery problem', cancelled: 'Cancelled', other: '—',
};
const STAGE_TONE = { delivered: 'done', returned: 'needs', rto: 'problem', problems: 'problem', to_confirm: 'needs', to_ship: 'progress', in_transit: 'progress' };

const muted = { color: 'var(--ds-color-text-muted)' };
const faint = { color: 'var(--ds-color-text-faint)' };
const eyebrow = { fontSize: 11, fontWeight: 600, letterSpacing: '.06em', textTransform: 'uppercase', color: 'var(--ds-color-text-muted)' };
const tabular = { fontVariantNumeric: 'tabular-nums' };

/* Where each ₹100 of order value goes: one stacked bar + legend. */
function SplitBar({ split }) {
  const parts = (split || []).map((s) => ({ ...s, v: Math.max(0, Number(s.value) || 0) }));
  const total = parts.reduce((a, s) => a + s.v, 0);
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      <div role="img" aria-label={parts.map((s) => `${s.label} ₹${s.value}`).join(', ')}
        style={{ display: 'flex', height: 22, borderRadius: 6, overflow: 'hidden', background: 'var(--ds-color-surface-soft)' }}>
        {total > 0 && parts.map((s) => (
          s.v > 0 ? <span key={s.key} title={`${s.label}: ₹${s.value}`} style={{ flex: s.v, background: SPLIT_COLOR[s.key] || SPLIT_COLOR.rest }} /> : null
        ))}
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '4px 12px', fontSize: 13 }}>
        {parts.map((s) => (
          <div key={s.key} style={{ display: 'contents' }}>
            <span>
              <span aria-hidden="true" style={{ display: 'inline-block', width: 9, height: 9, borderRadius: 2, marginRight: 6, background: SPLIT_COLOR[s.key] || SPLIT_COLOR.rest }} />
              {s.label}
            </span>
            <b style={{ textAlign: 'right', ...tabular, color: Number(s.value) < 0 ? 'var(--ds-color-danger, #dc2626)' : undefined }}>
              {Number(s.value) < 0 ? '−' : ''}₹{Math.abs(Number(s.value) || 0).toFixed(1)}
            </b>
          </div>
        ))}
      </div>
    </div>
  );
}

/* Right-hand panel for the selected code. */
function CodeDetail({ row, detail, detailLoading, canSeeCost, baseline, hasRows }) {
  if (!row) {
    return (
      <Panel>
        <span style={muted}>
          {hasRows ? 'Pick a code in the table to see where its order value goes.'
            : 'When a code is used in this period, where its order value goes will show here.'}
        </span>
      </Panel>
    );
  }
  const products = detail?.products || [];
  const orders = detail?.recentOrders || [];
  return (
    <Panel style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center', flexWrap: 'wrap' }}>
          <b style={{ fontFamily: 'var(--ds-font-mono, ui-monospace, monospace)', fontSize: 16 }}>{row.code}</b>
          {row.stateLabel && row.state !== 'live' ? <StatusPill tone={row.state === 'ended' ? 'neutral' : 'needs'} size="sm">{row.stateLabel}</StatusPill> : null}
        </div>
        <span style={{ fontSize: 13, ...muted }}>{row.rule}</span>
        {row.source === 'partner' || row.source === 'both' ? (
          <span style={{ fontSize: 12, ...faint }}>
            {row.source === 'partner' ? 'Used at the partner checkout' : 'Used on the store and at the partner checkout'}
          </span>
        ) : null}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span style={eyebrow}>Where each ₹100 of order value goes</span>
        <SplitBar split={row.split} />
        {!canSeeCost ? (
          <span style={{ fontSize: 12, ...faint }}>Product cost and shipping are shown to admins only.</span>
        ) : null}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, padding: 12, borderRadius: 12, background: 'var(--ds-color-surface-soft)', border: '1px solid var(--ds-color-border-soft)', fontSize: 13 }}>
        <span style={eyebrow}>What it tells you</span>
        <span>{row.note}</span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr auto', gap: '4px 12px', fontSize: 13 }}>
        <span style={muted}>Items per order</span>
        <b style={tabular}>{row.unitsPerOrder} <span style={{ fontWeight: 400, ...faint }}>vs {baseline?.unitsPerOrder ?? '—'} without a code</span></b>
        <span style={muted}>Average order</span>
        <b style={tabular}>{inr(row.aov)} <span style={{ fontWeight: 400, ...faint }}>vs {inr(baseline?.aov)}</span></b>
        <span style={muted}>RTO · COD</span>
        <b style={tabular}>{row.closed ? pc(row.rtoPct) : '—'} · {pc(row.codPct)}</b>
        <span style={muted}>First · last use</span>
        <b style={tabular}>{dayTxt(row.firstUsed)} · {dayTxt(row.lastUsed)}</b>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={eyebrow}>Most bought with it</span>
        {detailLoading && !detail ? (
          <div aria-hidden="true" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[0, 1, 2].map((i) => <Skeleton key={i} w={`${80 - i * 12}%`} h={12} />)}
          </div>
        ) : products.length ? products.map((p) => (
          <div key={p.id ?? p.name} style={{ display: 'flex', justifyContent: 'space-between', gap: 12, fontSize: 13 }}>
            <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{p.name}</span>
            <span style={{ ...tabular, ...muted, flexShrink: 0 }}>{num(p.units)} pcs · {inr(p.value)}</span>
          </div>
        )) : <span style={{ fontSize: 13, ...faint }}>Products bought with this code will show here.</span>}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        <span style={eyebrow}>Latest orders with it</span>
        {detailLoading && !detail ? (
          <div aria-hidden="true" style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[0, 1, 2].map((i) => <Skeleton key={i} w="100%" h={14} />)}
          </div>
        ) : orders.length ? orders.map((o) => (
          <button key={o.id} type="button" onClick={() => openOrder(o.orderNumber)} title="Open in Orders"
            style={{ display: 'flex', alignItems: 'center', gap: 8, justifyContent: 'space-between', width: '100%', minHeight: 36, padding: '4px 8px', border: '1px solid var(--ds-color-border-soft)', borderRadius: 8, background: 'transparent', color: 'inherit', cursor: 'pointer', font: 'inherit', fontSize: 13, textAlign: 'left' }}>
            <span style={{ minWidth: 0, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
              <b style={{ fontFamily: 'var(--ds-font-mono, ui-monospace, monospace)', fontSize: 12 }}>{o.orderNumber}</b>
              <span style={faint}> · {dayTxt(o.placedAt)} · {o.payment}</span>
            </span>
            <span style={{ display: 'flex', gap: 8, alignItems: 'center', flexShrink: 0 }}>
              <span style={tabular}>{inr(o.amount)}</span>
              <StatusPill tone={STAGE_TONE[o.stage] || 'neutral'} size="sm">{STAGE_TXT[o.stage] || o.stage}</StatusPill>
            </span>
          </button>
        )) : <span style={{ fontSize: 13, ...faint }}>Orders that used this code will show here.</span>}
      </div>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
        <Button variant="secondary" onClick={() => goToView('coupons')}>Open Coupons</Button>
      </div>
      <span style={{ fontSize: 12, ...faint }}>
        Coupons opens the full list — search for {row.code} there. Click an order above to open it in Orders.
      </span>
    </Panel>
  );
}

export default function CouponReport() {
  const [from, setFrom] = useReportState('from', shiftDay(istDate(), -29));
  const [to, setTo] = useReportState('to', istDate());
  const [brandId, setBrandId] = useReportState('brandId', '');
  const [brandList, setBrandList] = useState([]);
  const [selected, setSelected] = useState('');

  useEffect(() => {
    let off = false;
    brandService.getAllBrands(true)
      .then((r) => { if (!off && r?.success) setBrandList(r.data || []); })
      .catch(() => {});
    return () => { off = true; };
  }, []);

  const params = { startDate: from, endDate: to, brandId: brandId ? String(brandId) : undefined };
  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ['reports', 'coupons', from, to, brandId],
    queryFn: () => reportPagesService.get('coupons', params),
    enabled: !!(from && to),
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
  });

  const rows = useMemo(() => data?.rows || [], [data]);
  const canSeeCost = !!data?.canSeeCost;
  const k = data?.kpis || {};
  const other = data?.otherDiscounts || null;
  const baseline = data?.baseline || null;

  // Keep the picked code while it is still in the list; otherwise the first.
  useEffect(() => {
    if (!rows.length) { if (selected) setSelected(''); return; }
    if (!rows.some((r) => r.key === selected)) setSelected(rows[0].key);
  }, [rows]); // eslint-disable-line react-hooks/exhaustive-deps

  const selRow = rows.find((r) => r.key === selected) || null;
  const detailQ = useQuery({
    queryKey: ['reports', 'coupons', 'detail', from, to, brandId, selected],
    queryFn: () => reportPagesService.get('coupons', { ...params, code: selected }),
    enabled: !!(from && to && selected),
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
  });
  const detail = detailQ.data?.detail && detailQ.data.detail.code === selected ? detailQ.data.detail : null;

  const brandName = brandId
    ? (brandList.find((b) => String(b.id) === String(brandId))?.display_name || brandList.find((b) => String(b.id) === String(brandId))?.name || 'Store')
    : 'All brands';

  const first = isLoading && !data;
  const dim = isFetching && data ? { opacity: 0.6, transition: 'opacity .15s' } : undefined;

  // Table rows: every code, then the "No code" discount row (not clickable).
  const tableData = useMemo(() => {
    const list = rows.map((r) => ({ ...r, id: `c:${r.key}` }));
    if (other) list.push({ ...other, id: '__other__', code: 'No code', _other: true });
    return list;
  }, [rows, other]);

  const columns = [
    {
      header: 'Code', accessor: 'code', align: 'left',
      cell: (r) => (
        <div style={{ minWidth: 150 }}>
          <b style={{ fontFamily: r._other ? undefined : 'var(--ds-font-mono, ui-monospace, monospace)', fontSize: 13 }}>{r.code}</b>
          <span style={{ display: 'block', fontSize: 11.5, ...faint }}>{r.rule}</span>
        </div>
      ),
    },
    { header: 'Orders', accessor: 'orders', align: 'right', cell: (r) => <span style={tabular}>{num(r.orders)}</span> },
    { header: 'Discount given', accessor: 'discount', align: 'right', cell: (r) => <span style={tabular}>{inr(r.discount)}</span> },
    { header: 'Net sales', accessor: 'netSales', align: 'right', cell: (r) => <span style={tabular}>{inr(r.netSales)}</span> },
    { header: 'AOV', accessor: 'aov', align: 'right', cell: (r) => <span style={tabular}>{inr(r.aov)}</span> },
    { header: 'New buyers', accessor: 'newPct', align: 'right', cell: (r) => <span style={tabular}>{pc(r.newPct)}</span> },
    { header: 'RTO', accessor: 'rtoPct', align: 'right', cell: (r) => <span style={tabular}>{r.closed ? pc(r.rtoPct) : '—'}</span> },
    { header: 'COD', accessor: 'codPct', align: 'right', cell: (r) => <span style={tabular}>{pc(r.codPct)}</span> },
    ...(canSeeCost ? [{
      header: 'Margin left', accessor: 'marginPct', align: 'right',
      cell: (r) => (
        <span style={{ ...tabular, color: (Number(r.marginPct) || 0) < 0 ? 'var(--ds-color-danger, #dc2626)' : undefined }}>
          {r.marginPct == null ? '—' : pc(r.marginPct)}
        </span>
      ),
    }] : []),
    {
      header: 'Verdict', accessor: 'verdict', align: 'right',
      cell: (r) => (r._other ? <span style={faint}>Not a code</span>
        : <StatusPill tone={r.verdict?.tone || 'neutral'} size="sm" style={{ whiteSpace: 'nowrap' }}>{r.verdict?.text}</StatusPill>),
    },
  ];

  const doExport = () => exportCsv(`coupon-report_${from}_to_${to}.csv`, [
    { label: 'Code', value: (r) => r.code },
    { label: 'Rule', value: (r) => r.rule },
    { label: 'Status', value: (r) => (r._other ? '' : r.stateLabel) },
    { label: 'Orders', value: (r) => r.orders },
    { label: 'Items per order', value: (r) => r.unitsPerOrder },
    { label: 'Order value (₹)', value: (r) => r.gross },
    { label: 'Discount given (₹)', value: (r) => r.discount },
    { label: 'Discount % of order value', value: (r) => r.discountPct },
    { label: 'Net sales (₹)', value: (r) => r.netSales },
    { label: 'AOV (₹)', value: (r) => r.aov },
    { label: 'New buyers', value: (r) => r.newBuyers },
    { label: 'New buyers %', value: (r) => r.newPct },
    { label: 'Delivered', value: (r) => r.delivered },
    { label: 'RTO', value: (r) => r.rto },
    { label: 'RTO %', value: (r) => r.rtoPct },
    { label: 'COD %', value: (r) => r.codPct },
    ...(canSeeCost ? [
      { label: 'Cost of goods (₹)', value: (r) => r.cogs },
      { label: `Shipping at ₹${data?.assumptions?.shippingPerOrder ?? 90}/order (₹)`, value: (r) => r.shippingCost },
      { label: 'Value lost to RTO (₹)', value: (r) => r.rtoLost },
      { label: 'Left over (₹)', value: (r) => r.leftOver },
      { label: 'Margin left %', value: (r) => r.marginPct },
      { label: 'Units with no cost price', value: (r) => r.unitsWithoutCost },
    ] : []),
    { label: 'Verdict', value: (r) => (r._other ? 'Not a code' : r.verdict?.text) },
    { label: 'Note', value: (r) => r.note || '' },
    { label: 'Store', value: () => brandName },
    { label: 'From', value: () => from },
    { label: 'To', value: () => to },
  ], tableData);

  const badCount = canSeeCost ? k.losingMoney?.count : k.highRto?.count;
  const badCodes = (canSeeCost ? k.losingMoney?.codes : k.highRto?.codes) || [];
  const th = data?.thresholds || {};

  return (
    <div className="dashboard-sections" style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <PageHeader
        title="Coupon performance"
        subtitle={`Whether each code brings new buyers or just gives away margin. ${brandName} · ${from} → ${to} (India time)${isFetching && data ? ' · updating…' : ''}`}
        actions={
          <>
            <Dropdown
              value={brandId || 'all'}
              onChange={(v) => setBrandId(v === 'all' ? '' : v)}
              options={[{ value: 'all', label: 'All brands' }, ...brandList.map((b) => ({ value: b.id, label: b.display_name || b.name }))]}
              className="bset-brand-select"
            />
            <DateRangePicker label="" inline startDate={from} endDate={to}
              onStartChange={setFrom} onEndChange={setTo} maxDate={istDate()} />
            <Button variant="secondary" onClick={doExport} disabled={!tableData.length || first}>Export CSV</Button>
          </>
        }
      />

      {error ? (
        <Panel><span style={{ color: 'var(--ds-color-danger, #dc2626)' }}>{error.message || 'Failed to load the report'}</span></Panel>
      ) : null}

      {first ? (
        <SkeletonKpis count={4} label="Loading coupon figures…" />
      ) : data ? (
        <div style={dim} aria-busy={isFetching || undefined}>
          <StatGrid>
            <StatTile label="Orders with a code" value={num(k.codeOrders)} sub={`${pc(k.codeOrdersPct)} of ${num(k.orders)} orders`} />
            <StatTile label="Discount given" value={inr(k.discount)} sub={`${pc(k.discountPctOfGross)} of ${inr(k.grossSales)} order value`} />
            <StatTile label="New buyers from codes" value={num(k.newBuyers)} sub={`${pc(k.newBuyersPct)} of code orders`} />
            <StatTile
              label={canSeeCost ? 'Codes losing money' : 'Codes with high RTO'}
              value={num(badCount)}
              tone={badCount > 0 ? 'problem' : undefined}
              sub={badCount > 0 ? badCodes.join(', ') : (canSeeCost ? 'none in this period' : `none at ${th.highRtoPct ?? 25}% RTO or more`)}
            />
          </StatGrid>
        </div>
      ) : null}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
        <div style={{ flex: '999 1 620px', minWidth: 0, ...(dim || {}) }}>
          <Panel flush title="Codes" subtitle="Click a code to see where its order value goes.">
            <div style={{ overflowX: 'auto' }}>
              <Table
                columns={columns}
                data={tableData}
                loading={first}
                sortable={false}
                onRowClick={(r) => { if (!r._other) setSelected(r.key); }}
                getRowStyle={(r) => (r._other
                  ? { cursor: 'default', background: 'var(--ds-color-surface-soft)' }
                  : r.key === selected
                    ? { background: 'var(--ds-color-surface-soft)', boxShadow: 'inset 3px 0 0 var(--ds-color-text)' }
                    : {})}
                emptyMessage="Codes used on orders in this period will show here, with what each one gave away and brought in."
              />
            </div>
          </Panel>
        </div>
        <aside style={{ flex: '1 1 320px', maxWidth: 440, minWidth: 0 }}>
          {first ? (
            <Panel aria-hidden="true" style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
              <Skeleton w="40%" h={16} />
              <Skeleton w="70%" h={12} />
              <Skeleton w="100%" h={22} r={6} />
              <Skeleton w="90%" h={12} />
              <Skeleton w="80%" h={12} />
            </Panel>
          ) : (
            <CodeDetail row={selRow} detail={detail} detailLoading={detailQ.isFetching} canSeeCost={canSeeCost} baseline={baseline} hasRows={rows.length > 0} />
          )}
        </aside>
      </div>

      <Panel title="How to read this">
        <ul style={{ margin: 0, paddingLeft: 18, display: 'flex', flexDirection: 'column', gap: 6, fontSize: 13, ...muted }}>
          <li>Counts every order placed in this period with a code, except cancelled ones. A partner-checkout order counts when it names the code.</li>
          <li><b>Net sales</b> = the items’ price minus the code’s discount (shipping charges not included). <b>AOV</b> = net sales ÷ orders.</li>
          <li><b>New buyers</b> = orders that were the customer’s first order{brandId ? ' at this store' : ''} (same phone number, else the same account).</li>
          <li><b>RTO</b> = orders the courier brought back ÷ orders that reached the customer or came back (same rule as the Overview). <b>COD</b> = share of orders paid on delivery.</li>
          {canSeeCost ? (
            <li>
              <b>Margin left</b> = (net sales − value of orders lost to RTO − cost price of the goods kept − shipping at {inr(data?.assumptions?.shippingPerOrder ?? 90)} per order) ÷ order value before discount.
              It is what is left of each ₹100 after the discount, the goods, shipping and RTO — before ads, payment fees and packing. Products with no cost price count as ₹0, so the margin is then too high.
            </li>
          ) : null}
          <li>
            <b>Verdict</b>: “Brings new buyers” at {th.newBuyersPct ?? 60}%+ first orders; “Raises basket size” when the average order or items per order is {th.basketLiftPct ?? 20}%+ above orders without a code;
            “Recovers carts” is the abandoned-cart WhatsApp code ({data?.cartCode || 'CART10'}); “High RTO” at {th.highRtoPct ?? 25}%+ RTO
            {canSeeCost ? `; “Losing money” under ${th.losingMarginPct ?? 5}% margin left; “Thin margin” under ${th.thinMarginPct ?? 15}%` : ''}; codes with fewer than {th.minOrders ?? 5} orders are not judged.
          </li>
          <li>The <b>No code</b> row is the prepaid instant discount (and partner-checkout offers without a code) — not a coupon. Pack prices are already in the item price, and loyalty points are not used at checkout, so neither shows here.</li>
        </ul>
      </Panel>
    </div>
  );
}
