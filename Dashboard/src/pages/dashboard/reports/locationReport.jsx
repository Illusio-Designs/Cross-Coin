import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { reportPagesService, brandService } from '../../../services';
import { DateRangePicker, Skeleton, SkeletonKpis, SkeletonTableRows, StatusPill } from '../../../components/ui';
import Dropdown from '../../../components/ui/Dropdown';
import { PageHeader } from '../../../components/Dashboard/primitives';
import { HugeiconsIcon } from '@hugeicons/react';
import { Download04Icon } from '@hugeicons/core-free-icons';
import { useReportState } from '../../../lib/reportFilters';

/* ──────────────────────────────────────────────────────────────
   Orders by location — where orders ship to (the shipping address),
   state → city → pincode. GET /api/reports/location.

     · Orders      placed in the range, cancelled left out
     · Net sales   delivered order value − refunds (same as the Overview)
     · AOV         net sales ÷ delivered orders
     · Delivered % / RTO %   out of orders that reached the customer or
                   came back (orders still on the way don't count)
     · Return %    customer returns ÷ delivered
     · Days        average days from order to delivery
   Place names are cleaned up on the server ("maharashtra " = "Maharashtra",
   "Bangalore" = "Bengaluru"). Same look as the Reports overview (.obz-rep).
   ────────────────────────────────────────────────────────────── */

const money = (n) => `₹${(Number(n) || 0).toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
const num = (n) => (Number(n) || 0).toLocaleString('en-IN');
const pct1 = (n) => `${(Number(n) || 0).toFixed(1)}%`;
const days = (n) => (n == null ? '—' : Number(n).toFixed(1));

const istDate = (d = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
const shiftDay = (s, n) => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };

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

const TIER_LABEL = { metro: 'Metro', tier2: 'Tier 2', tier3: 'Tier 3' };
const TIER_HINT = {
  metro: 'Mumbai, Delhi, Bengaluru, Hyderabad, Chennai, Kolkata, Pune, Ahmedabad',
  tier2: 'About 100 large cities, e.g. Jaipur, Lucknow, Surat, Indore, Noida, Thane',
  tier3: 'Every other town, and orders with no city',
};

// RTO colour: 20%+ red, 12%+ amber, else green. No closed orders → dash.
const rtoTone = (r) => (r >= 20 ? 'problem' : r >= 12 ? 'needs' : 'done');
const rtoColor = (r) => (r >= 20 ? 'var(--ds-color-danger)' : r >= 12 ? 'var(--ds-color-warn)' : 'var(--ds-color-success)');
const RtoCell = ({ row }) => (row.closed > 0
  ? <StatusPill tone={rtoTone(row.rtoRate)} size="sm">{pct1(row.rtoRate)}</StatusPill>
  : <span title="None delivered or returned yet">—</span>);

/* Two- or three-way switch (Orders / Net sales, All / COD / Prepaid). */
function Seg({ label, value, options, onChange }) {
  return (
    <div role="group" aria-label={label} style={{ display: 'inline-flex', gap: 2, padding: 3, borderRadius: 10, background: 'var(--ds-color-surface-soft)', border: '1px solid var(--ds-color-border)' }}>
      {options.map(([v, text]) => {
        const on = v === value;
        return (
          <button key={v} type="button" aria-pressed={on} onClick={() => onChange(v)}
            style={{
              border: 0, cursor: 'pointer', minHeight: 30, padding: '0 12px', borderRadius: 8, font: 'inherit', fontSize: 12.5, fontWeight: 600,
              background: on ? 'var(--ds-color-surface)' : 'transparent',
              color: on ? 'var(--ds-color-text)' : 'var(--ds-color-text-muted)',
              boxShadow: on ? '0 0 0 1px var(--ds-color-border)' : 'none',
            }}>
            {text}
          </button>
        );
      })}
    </div>
  );
}

const linkBtn = { all: 'unset', cursor: 'pointer', fontWeight: 600, color: 'var(--ds-color-link, var(--ds-color-info))' };
const kpiBtn = { font: 'inherit', textAlign: 'left', cursor: 'pointer', width: '100%' };

const COLS = ['', 'Orders', 'Share', 'Units', 'Net sales', 'AOV', 'COD', 'Delivered', 'RTO', 'Returns', 'Days'];

export default function LocationReport() {
  const [from, setFrom] = useReportState('from', shiftDay(istDate(), -29));
  const [to, setTo] = useReportState('to', istDate());
  const [brandId, setBrandId] = useReportState('brandId', '');
  const [brandList, setBrandList] = useState([]);
  const [pay, setPay] = useState('all');
  const [measure, setMeasure] = useState('orders');
  // Drill-down: null → states; state → its cities; state + city → pincodes.
  const [drill, setDrill] = useState({ state: null, city: null });

  useEffect(() => {
    let off = false;
    brandService.getAllBrands(true)
      .then((r) => { if (!off && r?.success) setBrandList(r.data || []); })
      .catch(() => {});
    return () => { off = true; };
  }, []);

  const level = drill.city ? 'pincode' : drill.state ? 'city' : 'state';
  const params = {
    startDate: from, endDate: to, brandId: brandId || undefined, pay, level,
    state: drill.state?.key, city: drill.city?.key,
  };
  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ['reports', 'location', from, to, brandId, pay, level, drill.state?.key || '', drill.city?.key || ''],
    queryFn: () => reportPagesService.get('location', params),
    enabled: !!(from && to),
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
  });

  const brandName = brandId
    ? (brandList.find((b) => String(b.id) === String(brandId))?.display_name || brandList.find((b) => String(b.id) === String(brandId))?.name || 'This brand')
    : 'All brands';
  const payName = { all: '', cod: ' · COD only', prepaid: ' · prepaid only' }[pay];

  const goState = (key, name) => setDrill({ state: { key, name }, city: null });
  const goCity = (stateKey, stateName, key, name) => setDrill({ state: { key: stateKey, name: stateName }, city: { key, name } });

  const kpis = data?.kpis || {};
  const totals = data?.totals || {};
  const table = data?.table || null;
  const shownLevel = data?.level || level;
  const rules = data?.rules || { riskRtoPct: 30, riskMinOrders: 3, rtoCityMinOrders: 10 };

  // Share bars: top 9 states by the chosen measure + one grey "Other" bar.
  const bars = useMemo(() => {
    const key = measure === 'sales' ? 'netSales' : 'orders';
    const list = [...(data?.states || [])].sort((a, b) => (b[key] || 0) - (a[key] || 0));
    const sum = list.reduce((s, r) => s + Math.max(0, r[key] || 0), 0);
    const top = list.slice(0, 9);
    const rest = list.slice(9);
    const max = Math.max(1, ...top.map((r) => r[key] || 0));
    const out = top.map((r) => ({ key: r.key, name: r.name, v: r[key] || 0, share: sum ? (Math.max(0, r[key] || 0) / sum) * 100 : 0, w: Math.max(0, ((r[key] || 0) / max) * 100) }));
    if (rest.length) {
      const v = rest.reduce((s, r) => s + Math.max(0, r[key] || 0), 0);
      out.push({ key: '__other__', name: `Other ${rest.length} state${rest.length === 1 ? '' : 's'}`, v, share: sum ? (v / sum) * 100 : 0, w: Math.min(100, (v / max) * 100), other: true });
    }
    return out;
  }, [data, measure]);

  const rows = useMemo(() => {
    if (!table) return [];
    const out = [...(table.rows || [])];
    if (table.other) out.push(table.other);
    return out;
  }, [table]);

  const placeWord = { state: 'State', city: 'City', pincode: 'Pincode' }[shownLevel];
  const parentName = shownLevel === 'state' ? 'India' : (table?.parent?.name || '');
  const riskyCount = table?.riskyPincodes || 0;

  const rowClick = (r) => {
    if (r.isOther) return null;
    if (shownLevel === 'state') return () => goState(r.key, r.name);
    if (shownLevel === 'city' && drill.state) return () => goCity(drill.state.key, drill.state.name, r.key, r.name);
    return null;
  };
  const rowSub = (r) => {
    if (r.isOther) return 'Smaller places, added together';
    if (shownLevel === 'state') return 'Open cities';
    if (shownLevel === 'city') return `${TIER_LABEL[r.tier] || ''} · open pincodes`;
    if (r.risky) return 'High RTO';
    return '';
  };

  const doExport = () => {
    const where = [drill.state?.name, drill.city?.name].filter(Boolean).join('_').replace(/[^\w-]+/g, '-');
    const totalRow = table?.parent ? [{ ...table.parent, name: `Total · ${parentName}`, share: 100 }] : [];
    exportCsv(`orders-by-location_${shownLevel}${where ? '_' + where : ''}_${from}_to_${to}.csv`, [
      { label: placeWord, value: (r) => r.name },
      ...(shownLevel === 'city' ? [{ label: 'City tier', value: (r) => TIER_LABEL[r.tier] || '' }] : []),
      { label: 'Orders', value: (r) => r.orders },
      { label: `Share of ${parentName} orders %`, value: (r) => r.share },
      { label: 'Units', value: (r) => r.units },
      { label: 'Net sales', value: (r) => r.netSales },
      { label: 'AOV (net sales / delivered)', value: (r) => r.aov },
      { label: 'COD orders', value: (r) => r.cod },
      { label: 'COD %', value: (r) => r.codRate },
      { label: 'Delivered orders', value: (r) => r.delivered },
      { label: 'Delivered %', value: (r) => r.deliveredRate },
      { label: 'RTO orders', value: (r) => r.rto },
      { label: 'RTO %', value: (r) => r.rtoRate },
      { label: 'Customer returns', value: (r) => r.returned },
      { label: 'Return %', value: (r) => r.returnRate },
      { label: 'Avg days to deliver', value: (r) => (r.avgDeliveryDays ?? '') },
      ...(shownLevel === 'pincode' ? [{ label: `High RTO (${rules.riskRtoPct}%+ and ${rules.riskMinOrders}+ orders)`, value: (r) => (r.risky ? 'Yes' : '') }] : []),
    ], [...rows, ...totalRow]);
  };

  const first = isLoading && !data;
  const refreshing = isFetching && !!data;
  const dim = refreshing ? { opacity: 0.6, transition: 'opacity .15s' } : undefined;
  const crumbs = [
    { label: 'India', on: level === 'state', go: () => setDrill({ state: null, city: null }) },
    ...(drill.state ? [{ label: drill.state.name, on: level === 'city', go: () => setDrill({ state: drill.state, city: null }) }] : []),
    ...(drill.city ? [{ label: drill.city.name, on: true, go: () => {} }] : []),
  ];

  const hiRto = kpis.highestRtoCity;
  const noOrders = data && !(Number(totals.orders) > 0);

  return (
    <div className="dashboard-sections obz-rep">
      <PageHeader
        title="Orders by location"
        subtitle={`Where orders ship to: share by state, city and pincode, with COD, delivery and RTO for each place. ${brandName} · ${from} → ${to} (India time)${isFetching && data ? ' · updating…' : ''}`}
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
            <button type="button" className="order-sync-main-btn" onClick={doExport} disabled={!rows.length}
              title="Download the table below as a spreadsheet (CSV)">
              <DlIcon /> Export CSV
            </button>
          </div>
        }
      />

      {first ? (
        <>
          <SkeletonKpis count={4} label="Loading orders by location…" />
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }} aria-hidden="true">
            <div className="rep-panel" style={{ flex: '1 1 340px', maxWidth: 470 }}>
              <div className="rep-ph"><h3>Share by state</h3></div>
              <div className="rep-bars">
                {Array.from({ length: 8 }, (_, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <Skeleton w={100} h={12} /><Skeleton w={`${90 - i * 9}%`} h={8} r={5} />
                  </div>
                ))}
              </div>
            </div>
            <div className="rep-panel rep-panel--flush" style={{ flex: '999 1 560px' }}>
              <div className="rep-ph"><h3>Places</h3></div>
              <div className="rep-tbl-wrap">
                <table className="rep-table">
                  <thead><tr>{COLS.map((c, i) => <th key={i} className={i ? 'r' : undefined}>{i ? c : 'State'}</th>)}</tr></thead>
                  <tbody><SkeletonTableRows rows={8} cols={COLS.length} /></tbody>
                </table>
              </div>
            </div>
          </div>
        </>
      ) : error ? (
        <div className="rep-state" style={{ color: 'var(--ds-color-danger)' }}>Couldn't load the report: {error.message || 'try again'}</div>
      ) : !data ? null : (
        <>
          {/* ── KPI strip ── */}
          <div className="rep-kpis" style={dim} aria-busy={refreshing || undefined}>
            <div className="rep-kpi">
              <div className="rep-kl">Orders</div>
              <div className="rep-kv num">{num(totals.orders)}</div>
              <div className="rep-kf">{brandName}{payName}, cancelled left out</div>
            </div>
            {kpis.topState ? (
              <button type="button" className="rep-kpi" style={kpiBtn} onClick={() => goState(kpis.topState.key, kpis.topState.name)} title="Open its cities">
                <div className="rep-kl">Top state</div>
                <div className="rep-kv">{kpis.topState.name}</div>
                <div className="rep-kf">{pct1(kpis.topState.share)} of orders · {num(kpis.topState.orders)}</div>
              </button>
            ) : (
              <div className="rep-kpi"><div className="rep-kl">Top state</div><div className="rep-kv">—</div><div className="rep-kf">No orders with a state yet</div></div>
            )}
            {kpis.topCity ? (
              <button type="button" className="rep-kpi" style={kpiBtn} onClick={() => goCity(kpis.topCity.state, kpis.topCity.stateName, kpis.topCity.key, kpis.topCity.name)} title="Open its pincodes">
                <div className="rep-kl">Top city</div>
                <div className="rep-kv">{kpis.topCity.name}</div>
                <div className="rep-kf">{num(kpis.topCity.orders)} orders · {pct1(kpis.topCity.share)} · {kpis.topCity.stateName}</div>
              </button>
            ) : (
              <div className="rep-kpi"><div className="rep-kl">Top city</div><div className="rep-kv">—</div><div className="rep-kf">No orders with a city yet</div></div>
            )}
            {hiRto ? (
              <button type="button" className="rep-kpi" style={kpiBtn} onClick={() => goCity(hiRto.state, hiRto.stateName, hiRto.key, hiRto.name)} title="Open its pincodes">
                <div className="rep-kl">Highest RTO</div>
                <div className="rep-kv">{hiRto.name}</div>
                <div className="rep-kf" style={{ color: 'var(--ds-color-danger)' }}>{pct1(hiRto.rtoRate)} came back · {num(hiRto.rto)} of {num(hiRto.closed)}</div>
              </button>
            ) : (
              <div className="rep-kpi"><div className="rep-kl">Highest RTO</div><div className="rep-kv">—</div><div className="rep-kf">No city with {rules.rtoCityMinOrders}+ orders had an RTO</div></div>
            )}
          </div>

          {noOrders ? (
            <div className="rep-panel"><span className="mut">No orders in this period. States, cities and pincodes will show here once orders are placed.</span></div>
          ) : (
            <>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start', ...dim }} aria-busy={refreshing || undefined}>
                {/* ── Share by state ── */}
                <section className="rep-panel" aria-label="Share by state" style={{ flex: '1 1 340px', maxWidth: 470 }}>
                  <div className="rep-ph">
                    <h3>Share by state</h3>
                    <Seg label="Measure" value={measure} onChange={setMeasure} options={[['orders', 'Orders'], ['sales', 'Net sales']]} />
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                    {bars.map((b) => {
                      const on = drill.state?.key === b.key;
                      return (
                        <button key={b.key} type="button" disabled={b.other} onClick={() => goState(b.key, b.name)}
                          title={b.other ? undefined : `${b.name}: ${measure === 'sales' ? money(b.v) : `${num(b.v)} orders`} · open cities`}
                          style={{
                            all: 'unset', boxSizing: 'border-box', width: '100%', display: 'flex', alignItems: 'center', gap: 10,
                            padding: '5px 6px', borderRadius: 8, cursor: b.other ? 'default' : 'pointer',
                            background: on ? 'var(--ds-color-surface-soft)' : 'transparent',
                          }}>
                          <span style={{ width: 116, flex: 'none', fontSize: 13, fontWeight: on ? 700 : 500, color: 'var(--ds-color-text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{b.name}</span>
                          <span className="rep-track" style={{ flex: 1, display: 'block' }}>
                            <span className="rep-fill" style={{ display: 'block', width: `${Math.max(b.v > 0 ? 1 : 0, b.w)}%`, background: b.other ? 'var(--rr4)' : (on ? 'var(--ds-color-brand, var(--rr1))' : 'var(--rr2)') }} />
                          </span>
                          <span className="num" style={{ width: 52, flex: 'none', textAlign: 'right', fontSize: 12, color: 'var(--ds-color-text-muted)', fontFamily: 'var(--ds-font-mono)' }}>{pct1(b.share)}</span>
                        </button>
                      );
                    })}
                  </div>
                  <p className="mut" style={{ fontSize: 12, margin: '12px 0 0' }}>
                    Click a state to see its cities. Orders placed in this period, cancelled left out; the place is the shipping address.
                    {measure === 'sales' ? ' Net sales = delivered orders minus refunds.' : ''}
                  </p>
                </section>

                {/* ── Places table (state → city → pincode) ── */}
                <section className="rep-panel rep-panel--flush" aria-label="Places" style={{ flex: '999 1 560px' }}>
                  <div className="rep-ph">
                    <nav aria-label="Location" style={{ display: 'flex', gap: 6, alignItems: 'center', flexWrap: 'wrap', fontSize: 13.5 }}>
                      {crumbs.map((c, i) => (
                        <React.Fragment key={i}>
                          {i > 0 && <span className="mut" aria-hidden="true">›</span>}
                          {c.on
                            ? <span style={{ fontWeight: 650, color: 'var(--ds-color-text)' }} aria-current="page">{c.label}</span>
                            : <button type="button" style={linkBtn} onClick={c.go}>{c.label}</button>}
                        </React.Fragment>
                      ))}
                    </nav>
                    <Seg label="Payment" value={pay} onChange={setPay} options={[['all', 'All'], ['cod', 'COD'], ['prepaid', 'Prepaid']]} />
                  </div>
                  <div className="rep-tbl-wrap">
                    <table className="rep-table" style={{ minWidth: 820 }}>
                      <thead>
                        <tr>
                          <th>{placeWord}</th>
                          {COLS.slice(1).map((c) => <th key={c} className="r">{c}</th>)}
                        </tr>
                      </thead>
                      <tbody>
                        {rows.length === 0 ? (
                          <tr><td colSpan={COLS.length} style={{ textAlign: 'center', color: 'var(--ds-color-text-faint)' }}>
                            No orders shipped to {parentName || 'this place'} in this period{payName ? ` (${pay === 'cod' ? 'COD' : 'prepaid'})` : ''}.
                          </td></tr>
                        ) : rows.map((r) => {
                          const go = rowClick(r);
                          return (
                            <tr key={r.key} onClick={go || undefined} style={{ cursor: go ? 'pointer' : 'default' }}>
                              <td>
                                {go
                                  ? <button type="button" onClick={(e) => { e.stopPropagation(); go(); }} style={{ all: 'unset', cursor: 'pointer', fontWeight: 600, color: 'var(--ds-color-text)' }}>{r.name}</button>
                                  : <span style={{ fontWeight: r.isOther ? 500 : 600, color: 'var(--ds-color-text)' }}>{r.name}</span>}
                                <span style={{ display: 'block', fontSize: 11.5, color: r.risky ? 'var(--ds-color-danger)' : 'var(--ds-color-text-faint)', fontWeight: r.risky ? 600 : 400 }}>{rowSub(r)}</span>
                              </td>
                              <td className="r num strong">{num(r.orders)}</td>
                              <td className="r num">{pct1(r.share)}</td>
                              <td className="r num">{num(r.units)}</td>
                              <td className="r num strong">{money(r.netSales)}</td>
                              <td className="r num">{r.delivered ? money(r.aov) : '—'}</td>
                              <td className="r num">{pct1(r.codRate)}</td>
                              <td className="r num">{r.closed ? pct1(r.deliveredRate) : '—'}</td>
                              <td className="r"><RtoCell row={r} /></td>
                              <td className="r num">{r.delivered ? pct1(r.returnRate) : '—'}</td>
                              <td className="r num">{days(r.avgDeliveryDays)}</td>
                            </tr>
                          );
                        })}
                        {rows.length > 0 && table?.parent ? (
                          <tr style={{ background: 'var(--ds-color-surface-soft)' }}>
                            <td className="strong">Total · {parentName}</td>
                            <td className="r num strong">{num(table.parent.orders)}</td>
                            <td className="r num">{shownLevel === 'state' ? '100.0%' : `${pct1(table.parent.share)} of India`}</td>
                            <td className="r num">{num(table.parent.units)}</td>
                            <td className="r num strong">{money(table.parent.netSales)}</td>
                            <td className="r num">{table.parent.delivered ? money(table.parent.aov) : '—'}</td>
                            <td className="r num">{pct1(table.parent.codRate)}</td>
                            <td className="r num">{table.parent.closed ? pct1(table.parent.deliveredRate) : '—'}</td>
                            <td className="r"><RtoCell row={table.parent} /></td>
                            <td className="r num">{table.parent.delivered ? pct1(table.parent.returnRate) : '—'}</td>
                            <td className="r num">{days(table.parent.avgDeliveryDays)}</td>
                          </tr>
                        ) : null}
                      </tbody>
                    </table>
                  </div>
                  <div style={{ padding: '12px 18px 16px', borderTop: '1px solid var(--ds-color-border-soft)', margin: '0 -18px', display: 'flex', flexDirection: 'column', gap: 6 }}>
                    {shownLevel === 'pincode' ? (
                      <span style={{ fontSize: 12.5, fontWeight: 600, color: riskyCount ? 'var(--ds-color-danger)' : 'var(--ds-color-text-muted)' }}>
                        {riskyCount
                          ? `${num(riskyCount)} pincode${riskyCount === 1 ? '' : 's'} in ${parentName} marked “High RTO”: ${rules.riskRtoPct}% or more of their orders came back (with at least ${rules.riskMinOrders} orders). Consider asking for prepaid there.`
                          : `No pincode in ${parentName} has ${rules.riskRtoPct}%+ RTO with ${rules.riskMinOrders} or more orders.`}
                      </span>
                    ) : null}
                    <span className="mut" style={{ fontSize: 12 }}>
                      {table?.count > (table?.rows?.length || 0) ? `Top ${num(table.rows.length)} of ${num(table.count)} ${shownLevel === 'city' ? 'cities' : `${shownLevel}s`} shown; the rest are added together. ` : ''}
                      Share = part of {parentName}’s orders. Delivered and RTO count only orders that reached the customer or came back, not ones still on the way.
                      Returns = customer returns out of delivered. AOV = net sales ÷ delivered orders. Days = average days from order to delivery.
                      {pay !== 'all' ? ` The ${pay === 'cod' ? 'COD' : 'prepaid'} filter applies to the whole page.` : ''}
                    </span>
                  </div>
                </section>
              </div>

              {/* ── City tiers ── */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14, ...dim }} aria-busy={refreshing || undefined}>
                {(data.tiers || []).map((t) => (
                  <div key={t.key} className="rep-panel" title={TIER_HINT[t.key]} style={{ display: 'flex', flexDirection: 'column', gap: 9 }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                      <b style={{ fontSize: 14, color: 'var(--ds-color-text)' }}>{t.name}</b>
                      <span className="num mut" style={{ fontSize: 12, fontFamily: 'var(--ds-font-mono)' }}>{pct1(t.share)} of orders</span>
                    </div>
                    <div className="rep-track"><div className="rep-fill" style={{ width: `${Math.min(100, t.share)}%`, background: 'var(--rr2)' }} /></div>
                    <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', fontSize: 12.5, color: 'var(--ds-color-text-muted)' }}>
                      <span>{num(t.orders)} orders</span>
                      <span>AOV <b className="num" style={{ color: 'var(--ds-color-text)' }}>{t.delivered ? money(t.aov) : '—'}</b></span>
                      <span>COD <b className="num" style={{ color: 'var(--ds-color-text)' }}>{pct1(t.codRate)}</b></span>
                      <span>RTO <b className="num" style={{ color: t.closed ? rtoColor(t.rtoRate) : 'var(--ds-color-text)' }}>{t.closed ? pct1(t.rtoRate) : '—'}</b></span>
                    </div>
                    <span style={{ fontSize: 11.5, color: 'var(--ds-color-text-faint)' }}>{num(t.cities)} {t.cities === 1 ? 'city' : 'cities'} with orders · {TIER_HINT[t.key]}</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </>
      )}
    </div>
  );
}
