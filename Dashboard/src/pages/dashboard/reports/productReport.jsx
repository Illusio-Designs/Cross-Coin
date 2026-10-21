import React, { useEffect, useMemo, useState } from 'react';
import { useQuery, keepPreviousData } from '@tanstack/react-query';
import { reportPagesService, brandService } from '../../../services';
import { DateRangePicker, Skeleton, SkeletonKpis, SkeletonTableRows } from '../../../components/ui';
import Dropdown from '../../../components/ui/Dropdown';
import { PageHeader } from '../../../components/Dashboard/primitives';
import { getImageUrl } from '../../../utils/imageHandler';
import { HugeiconsIcon } from '@hugeicons/react';
import { Download04Icon } from '@hugeicons/core-free-icons';
import { useReportState } from '../../../lib/reportFilters';

/* ──────────────────────────────────────────────────────────────
   Products — what each product sells, how shoppers move from viewing
   to buying, and which sizes and colours come back.

   Everything comes from GET /api/reports/products:
     · units / net sales   order lines on orders placed in the range,
                           cancelled left out; net = after product discounts
     · returned %          units sent back by customers ÷ units delivered
     · RTO %               units the courier brought back ÷ (delivered + RTO)
     · margin              admin only — (net − cost price × units) ÷ net
     · views → bought      sessions per product (tracked from `funnelSince`);
                           bought = orders with the product since tracking began
   Row click → part=detail call for the side panel (funnel, variants, tip).
   Same look as the Reports overview (.obz-rep / .rep-* in reports.css).
   ────────────────────────────────────────────────────────────── */

const num = (v) => (Number.isFinite(Number(v)) ? Number(v).toLocaleString('en-IN') : '—');
const inr = (v) => `₹${num(Math.round(Number(v) || 0))}`;
const pctTxt = (v) => (v == null || !Number.isFinite(Number(v)) ? '—' : `${Number(v).toFixed(1)}%`);
const share = (a, b) => (b > 0 ? (a / b) * 100 : null);

const istDate = (d = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
const shiftDay = (s, n) => { const d = new Date(s + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const niceDate = (ymd) => (ymd ? new Date(`${ymd}T00:00:00Z`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', timeZone: 'UTC' }) : '');

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

// Coloured status pill (tokens flip for dark mode).
const TONE = {
  good: ['var(--ds-color-success-bg)', 'var(--ds-color-success-text)'],
  warn: ['var(--ds-color-warn-bg)', 'var(--ds-color-warn-text)'],
  bad: ['var(--ds-color-danger-bg)', 'var(--ds-color-danger-text)'],
  info: ['var(--ds-color-info-bg)', 'var(--ds-color-info-text)'],
  mute: ['var(--ds-color-surface-soft)', 'var(--ds-color-text-muted)'],
};
const Pill = ({ tone = 'mute', children, title }) => (
  <span title={title} style={{ display: 'inline-block', fontSize: 11.5, fontWeight: 700, padding: '3px 9px', borderRadius: 999, whiteSpace: 'nowrap', background: TONE[tone][0], color: TONE[tone][1] }}>{children}</span>
);
const retTone = (v) => (v == null ? 'mute' : v >= 10 ? 'bad' : v >= 6 ? 'warn' : 'mute');
const rtoTone = (v) => (v == null ? 'mute' : v >= 15 ? 'bad' : v >= 10 ? 'warn' : 'mute');
const convTone = (v) => (v == null ? 'mute' : v >= 8 ? 'good' : v >= 5 ? 'mute' : 'warn');
const Dash = () => <span style={{ color: 'var(--ds-color-text-faint)' }}>—</span>;
const Sub = ({ children }) => <span style={{ display: 'block', fontSize: 11, color: 'var(--ds-color-text-faint)' }}>{children}</span>;

function Delta({ pct, days }) {
  if (pct === null || pct === undefined || !Number.isFinite(pct)) return <span>no sales in the previous {days} days</span>;
  const up = pct >= 0;
  return <><span className={`delta ${up ? 'up' : 'down'}`}>{up ? '▲' : '▼'} {Math.abs(pct)}%</span> vs previous {days} days</>;
}

// Product photo (or a plain tile when there is none / it fails to load).
function Thumb({ src, size = 34 }) {
  const [broken, setBroken] = useState(false);
  const url = src && !broken ? getImageUrl({ image_url: src, tr: `w-${size * 2},h-${size * 2},c-at_max` }) : null;
  return url
    // eslint-disable-next-line @next/next/no-img-element
    ? <img src={url} alt="" width={size} height={size} loading="lazy" onError={() => setBroken(true)} style={{ width: size, height: size, borderRadius: 8, objectFit: 'cover', flex: 'none', background: 'var(--ds-color-surface-soft)' }} />
    : <span aria-hidden="true" style={{ width: size, height: size, borderRadius: 8, flex: 'none', background: 'var(--ds-color-border-soft)' }} />;
}

const SORT_OPTIONS = [
  { value: 'units', label: 'Most units' },
  { value: 'net', label: 'Highest net sales' },
  { value: 'returns', label: 'Most returned' },
  { value: 'rto', label: 'Highest RTO' },
  { value: 'margin', label: 'Best margin', admin: true },
  { value: 'rating', label: 'Best rating' },
  { value: 'stock', label: 'Lowest stock' },
  { value: 'views', label: 'Most viewed' },
  { value: 'conversion', label: 'Best conversion' },
];

const segBtn = (on) => ({
  border: 0, cursor: 'pointer', minHeight: 32, padding: '0 12px', borderRadius: 8, font: 'inherit', fontSize: 12.5, fontWeight: 600,
  background: on ? 'var(--ds-color-surface)' : 'transparent', color: on ? 'var(--ds-color-text)' : 'var(--ds-color-text-muted)',
  boxShadow: on ? '0 1px 2px rgba(0,0,0,.08)' : 'none',
});
const monoLabel = { fontFamily: 'var(--ds-font-mono)', fontSize: 11, fontWeight: 600, letterSpacing: '0.06em', textTransform: 'uppercase', color: 'var(--ds-color-text-muted)' };

/* ── Side panel for the selected product ── */
function DetailPanel({ detail, loading, error, fallbackName, funnelSince }) {
  if (error) return <div style={{ color: 'var(--ds-color-danger)', fontSize: 13 }}>Couldn't load this product: {error.message || 'try again'}</div>;
  if (!detail) {
    return (
      <div aria-busy={loading || undefined} style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {loading ? (<>
          <Skeleton w="60%" h={16} /><Skeleton w="80%" h={11} />
          {[0, 1, 2, 3].map((i) => <div key={i}><Skeleton w="40%" h={11} /><Skeleton w="100%" h={10} r={4} style={{ marginTop: 6 }} /></div>)}
          <Skeleton w="100%" h={44} r={10} />
          <Skeleton w="100%" h={120} r={10} />
        </>) : <span style={{ fontSize: 13, color: 'var(--ds-color-text-muted)' }}>{fallbackName ? `Loading ${fallbackName}…` : 'Pick a product on the left to see its funnel, sizes and colours here.'}</span>}
      </div>
    );
  }
  const f = detail.funnel;
  const steps = f ? [
    ['Viewed the product', f.views],
    ['Added to cart', f.carts],
    ['Started checkout', f.checkouts],
    ['Bought', f.bought],
  ] : [];
  const maxU = Math.max(1, ...detail.variants.map((v) => v.units));
  const sub = [
    `${num(detail.units)} units`, inr(detail.netSales),
    detail.rating != null ? `★ ${detail.rating} (${num(detail.reviews)})` : null,
    detail.wishlist ? `${num(detail.wishlist)} wishlisted` : null,
  ].filter(Boolean).join(' · ');

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16, opacity: loading ? 0.6 : 1, transition: 'opacity .15s' }} aria-busy={loading || undefined}>
      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <Thumb key={detail.image || detail.id} src={detail.image} size={44} />
        <div style={{ minWidth: 0 }}>
          <b style={{ fontSize: 15, color: 'var(--ds-color-text)' }}>{detail.name}</b>
          <span style={{ display: 'block', fontSize: 12.5, color: 'var(--ds-color-text-muted)' }}>{sub}</span>
          {(detail.brand || detail.category) ? <Sub>{[detail.brand, detail.category].filter(Boolean).join(' · ')}</Sub> : null}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span style={monoLabel}>Views to purchase · sessions</span>
        {!f ? (
          <span style={{ fontSize: 13, color: 'var(--ds-color-text-muted)' }}>
            {funnelSince ? `Product views are tracked from ${niceDate(funnelSince)}. Pick a range after that to see this.` : 'Product views aren’t tracked yet. They will show here once shoppers visit product pages.'}
          </span>
        ) : f.views === 0 && f.bought === 0 ? (
          <span style={{ fontSize: 13, color: 'var(--ds-color-text-muted)' }}>No tracked product views in this period.</span>
        ) : steps.map(([label, n], i) => {
          const prevN = i ? steps[i - 1][1] : null;
          const drop = i && prevN > 0 ? Math.round((1 - n / prevN) * 100) : null;
          return (
            <div key={label} style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
              <span style={{ display: 'flex', justifyContent: 'space-between', fontSize: 13, color: 'var(--ds-color-text)' }}>
                <span>{label}</span>
                <span className="num"><b>{num(n)}</b>{drop != null && drop > 0 ? <span style={{ marginLeft: 6, fontSize: 12, color: drop >= 60 ? 'var(--ds-color-danger)' : 'var(--ds-color-text-faint)' }}>−{drop}%</span> : null}</span>
              </span>
              <div className="rep-track" style={{ height: 10 }}>
                <div className="rep-fill" style={{ width: `${f.views > 0 ? Math.min(100, Math.max(n > 0 ? 1 : 0, (n / f.views) * 100)) : 0}%`, background: 'var(--ds-color-info)' }} />
              </div>
            </div>
          );
        })}
        {(detail.tips || []).map((t, i) => (
          <span key={i} style={{ fontSize: 12.5, lineHeight: 1.45, padding: '8px 10px', borderRadius: 10, background: TONE[t.tone]?.[0] || TONE.mute[0], color: TONE[t.tone]?.[1] || TONE.mute[1] }}>{t.text}</span>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        <span style={monoLabel}>Sizes &amp; colours · units sold</span>
        {detail.variants.length === 0 ? (
          <span style={{ fontSize: 13, color: 'var(--ds-color-text-muted)' }}>This product has no variants.</span>
        ) : (
          <div style={{ border: '1px solid var(--ds-color-border)', borderRadius: 12, overflowX: 'auto' }}>
            <table className="rep-table" style={{ minWidth: 380 }}>
              <thead><tr><th>Variant</th><th className="r">Units</th><th className="r">Share</th><th className="r">Returned</th><th className="r">Stock</th></tr></thead>
              <tbody>
                {detail.variants.map((v) => (
                  <tr key={v.id ?? 'none'}>
                    <td>
                      <span className="strong" style={{ color: v.active ? undefined : 'var(--ds-color-text-muted)' }}>{v.label}</span>
                      {v.sku ? <span style={{ display: 'block', fontFamily: 'var(--ds-font-mono)', fontSize: 11, color: 'var(--ds-color-text-faint)' }}>{v.sku}</span> : null}
                    </td>
                    <td className="r num">
                      <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                        <span className="rep-track" style={{ width: 56, height: 6, display: 'inline-block' }}><span className="rep-fill" style={{ display: 'block', width: `${(v.units / maxU) * 100}%`, background: 'var(--ds-color-success)' }} /></span>
                        {num(v.units)}
                      </span>
                    </td>
                    <td className="r num">{pctTxt(v.share)}</td>
                    <td className="r">{v.returnRate == null ? <Dash /> : <Pill tone={retTone(v.returnRate)}>{pctTxt(v.returnRate)}</Pill>}</td>
                    <td className="r num">{v.stock == null ? <Dash /> : v.stock === 0 ? <Pill tone="bad">Out</Pill> : num(v.stock)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
        {detail.returnReasons?.length ? (
          <span style={{ fontSize: 12, color: 'var(--ds-color-text-muted)' }}>
            Why customers sent it back: {detail.returnReasons.map((r) => `${r.label} (${num(r.count)})`).join(', ')}.
          </span>
        ) : null}
      </div>
    </div>
  );
}

export default function ProductReport() {
  const [from, setFrom] = useReportState('from', shiftDay(istDate(), -29));
  const [to, setTo] = useReportState('to', istDate());
  const [brandId, setBrandId] = useReportState('brandId', '');
  const [brandList, setBrandList] = useState([]);
  const [view, setView] = useState('sales');
  const [sort, setSort] = useState('units');
  const [search, setSearch] = useState('');
  const [picked, setPicked] = useState(null);

  useEffect(() => {
    let off = false;
    brandService.getAllBrands(true)
      .then((r) => { if (!off && r?.success) setBrandList(r.data || []); })
      .catch(() => {});
    return () => { off = true; };
  }, []);

  const base = { startDate: from, endDate: to, brandId: brandId || undefined };
  const { data, isLoading, isFetching, error } = useQuery({
    queryKey: ['reports', 'products', from, to, brandId, sort],
    queryFn: () => reportPagesService.get('products', { ...base, sort }),
    enabled: !!(from && to),
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
  });

  const products = useMemo(() => data?.products || [], [data]);
  const cost = !!data?.canSeeCost;
  const k = data?.kpis || {};
  const days = data?.range?.days || 30;

  const filtered = useMemo(() => {
    const s = search.trim().toLowerCase();
    if (!s) return products;
    return products.filter((p) => [p.name, p.skus, p.brand, p.category].some((x) => String(x || '').toLowerCase().includes(s)));
  }, [products, search]);

  // Selected product: the one clicked, else the first row.
  const selId = picked && products.some((p) => p.id === picked) ? picked : (filtered[0]?.id ?? products[0]?.id ?? null);
  const selRow = products.find((p) => p.id === selId);
  const detailQ = useQuery({
    queryKey: ['reports', 'products', 'detail', from, to, brandId, selId],
    queryFn: () => reportPagesService.get('products', { ...base, productId: selId, part: 'detail' }),
    enabled: !!(from && to && selId),
    placeholderData: keepPreviousData,
    staleTime: 60 * 1000,
  });
  const detail = detailQ.data?.detail && detailQ.data.detail.id === selId ? detailQ.data.detail : (detailQ.isFetching ? detailQ.data?.detail : null);

  const brandName = brandId ? (brandList.find((b) => String(b.id) === String(brandId))?.display_name || brandList.find((b) => String(b.id) === String(brandId))?.name || 'Brand') : 'All brands';
  const funnelSince = data?.funnelSince;

  const doExport = () => exportCsv(`products_${brandName.replace(/\W+/g, '-').toLowerCase()}_${from}_to_${to}.csv`, [
    { label: 'Product', value: (r) => r.name },
    { label: 'Brand', value: (r) => r.brand || '' },
    { label: 'Category', value: (r) => r.category || '' },
    { label: 'SKUs', value: (r) => r.skus || '' },
    { label: 'Units', value: (r) => r.units },
    { label: 'Orders', value: (r) => r.orders },
    { label: 'Gross sales', value: (r) => r.grossSales },
    { label: 'Net sales (after product discounts)', value: (r) => r.netSales },
    { label: 'Delivered units', value: (r) => r.deliveredUnits },
    { label: 'Returned units', value: (r) => r.returnedUnits },
    { label: 'Returned %', value: (r) => r.returnRate ?? '' },
    { label: 'RTO units', value: (r) => r.rtoUnits },
    { label: 'RTO %', value: (r) => r.rtoRate ?? '' },
    ...(cost ? [
      { label: 'Cost (cost price x units)', value: (r) => r.cost },
      { label: 'Margin %', value: (r) => r.margin ?? '' },
      { label: 'Units without cost price', value: (r) => r.uncostedUnits },
    ] : []),
    { label: 'Avg rating', value: (r) => r.rating ?? '' },
    { label: 'Reviews', value: (r) => r.reviews },
    { label: 'Wishlisted', value: (r) => r.wishlist ?? '' },
    { label: 'Stock', value: (r) => r.stock },
    { label: 'Viewing sessions', value: (r) => r.views },
    { label: 'Add-to-cart sessions', value: (r) => r.carts },
    { label: 'Checkout sessions', value: (r) => r.checkouts },
    { label: `Bought (orders since ${funnelSince || 'tracking began'})`, value: (r) => r.bought },
    { label: 'Conversion % (bought / viewing sessions)', value: (r) => r.conversion ?? '' },
  ], filtered);

  const first = isLoading && !data;
  const dim = isFetching && data ? { opacity: 0.6, transition: 'opacity .15s' } : undefined;

  const salesCols = ['Units', 'Net sales', 'Returned', 'RTO', ...(cost ? ['Margin'] : []), 'Stock'];
  const funnelCols = ['Views', 'Add to cart', 'Checkout', 'Bought', 'Conversion', 'Rating', ...(products.some((p) => p.wishlist != null) ? ['Wishlist'] : [])];
  const cols = view === 'sales' ? salesCols : funnelCols;

  const cells = (p) => {
    if (view === 'sales') {
      return [
        num(p.units),
        <span key="n" className="strong">{inr(p.netSales)}</span>,
        p.returnRate == null ? <Dash key="r" /> : <Pill key="r" tone={retTone(p.returnRate)} title={`${num(p.returnedUnits)} of ${num(p.deliveredUnits)} delivered`}>{pctTxt(p.returnRate)}</Pill>,
        p.rtoRate == null ? <Dash key="t" /> : <Pill key="t" tone={rtoTone(p.rtoRate)} title={`${num(p.rtoUnits)} units came back undelivered`}>{pctTxt(p.rtoRate)}</Pill>,
        ...(cost ? [p.margin == null ? <Dash key="m" /> : <span key="m" title={p.uncostedUnits ? `${num(p.uncostedUnits)} units have no cost price and are left out` : undefined}>{pctTxt(p.margin)}{p.uncostedUnits ? '*' : ''}</span>] : []),
        p.stock === 0 ? <Pill key="s" tone="bad">Out</Pill> : p.stock < 20 ? <Pill key="s" tone="warn">{num(p.stock)}</Pill> : num(p.stock),
      ];
    }
    const tracked = data?.funnelTracked;
    return [
      tracked ? num(p.views) : <Dash key="v" />,
      tracked ? <span key="c">{num(p.carts)}{p.views > 0 ? <Sub>{pctTxt(share(p.carts, p.views))}</Sub> : null}</span> : <Dash key="c" />,
      tracked ? <span key="k">{num(p.checkouts)}{p.views > 0 ? <Sub>{pctTxt(share(p.checkouts, p.views))}</Sub> : null}</span> : <Dash key="k" />,
      tracked ? num(p.bought) : <Dash key="b" />,
      p.conversion == null ? <Dash key="cv" /> : <Pill key="cv" tone={convTone(p.conversion)}>{pctTxt(p.conversion)}</Pill>,
      p.rating == null ? <Dash key="rt" /> : <span key="rt" title={`${num(p.reviews)} approved reviews`}>★ {p.rating}</span>,
      ...(funnelCols.includes('Wishlist') ? [num(p.wishlist)] : []),
    ];
  };

  const footnote = view === 'sales'
    ? `Net sales = item value after product discounts, on orders placed in this period (cancelled left out). Returned = share of delivered units the customer sent back. RTO = share of shipped units the courier brought back undelivered.${cost ? ' Margin = (net sales − cost price × units) ÷ net sales; * means some units have no cost price and are left out.' : ''}`
    : `Each number is shopping visits (sessions) that reached that step for this product. Checkout = visits that added it to cart and then started checkout. Bought = orders with this product, counted from ${funnelSince ? niceDate(funnelSince) : 'when tracking began'}. Conversion = bought ÷ visits that viewed it.`;

  const sortOptions = SORT_OPTIONS.filter((o) => !o.admin || cost).map(({ value, label }) => ({ value, label }));

  return (
    <div className="dashboard-sections obz-rep">
      <PageHeader
        title="Products"
        subtitle={`${brandName} · ${from} → ${to} (India time)${isFetching && data ? ' · updating…' : ''}. What each product sells, how shoppers move from viewing to buying, and which sizes and colours come back.`}
        actions={
          <div className="obz-rep-head">
            <Dropdown
              value={brandId || 'all'}
              onChange={(v) => { setBrandId(v === 'all' ? '' : v); setPicked(null); }}
              options={[{ value: 'all', label: 'All brands' }, ...brandList.map((b) => ({ value: b.id, label: b.display_name || b.name }))]}
              className="bset-brand-select"
            />
            <DateRangePicker label="" inline startDate={from} endDate={to}
              onStartChange={setFrom} onEndChange={setTo} maxDate={istDate()} />
            <button type="button" className="order-sync-main-btn" onClick={doExport} disabled={!filtered.length}>
              <DlIcon /> Export CSV
            </button>
          </div>
        }
      />

      {first ? (
        <SkeletonKpis count={4} label="Loading the product report…" />
      ) : error ? (
        <div className="rep-state" style={{ color: 'var(--ds-color-danger)' }}>Couldn't load the report: {error.message || 'try again'}</div>
      ) : data ? (
        <div className="rep-kpis" style={dim} aria-busy={isFetching || undefined}>
          <div className="rep-kpi">
            <div className="rep-kl">Products sold</div>
            <div className="rep-kv num">{num(k.productsSold)}</div>
            <div className="rep-kf">of {num(k.activeProducts)} active products</div>
          </div>
          <div className="rep-kpi">
            <div className="rep-kl">Units</div>
            <div className="rep-kv num">{num(k.units)}</div>
            <div className="rep-kf"><Delta pct={k.unitsDelta} days={days} /></div>
          </div>
          <div className="rep-kpi">
            <div className="rep-kl">Net sales</div>
            <div className="rep-kv num">{inr(k.netSales)}</div>
            <div className="rep-kf">after product discounts · cancelled left out</div>
          </div>
          <div className="rep-kpi">
            <div className="rep-kl">Not sold in 30 days</div>
            <div className="rep-kv num">{num(k.notSold30?.products)}</div>
            <div className="rep-kf" style={k.notSold30?.withStock ? { color: 'var(--ds-color-warn-text)' } : undefined}>
              {k.notSold30?.stockValue != null
                ? `${num(k.notSold30.withStock)} in stock · worth ${inr(k.notSold30.stockValue)} at cost`
                : `${num(k.notSold30?.withStock)} still have stock`}
            </div>
          </div>
        </div>
      ) : null}

      {!first && !error && data && data.funnelTracked === false ? (
        <div className="rep-panel" style={{ fontSize: 13, color: 'var(--ds-color-text-muted)', padding: '12px 16px' }}>
          {funnelSince
            ? `Product views, add to cart and checkout are tracked from ${niceDate(funnelSince)}. This period ends before that, so “Views to purchase” is empty.`
            : 'Product views, add to cart and checkout aren’t tracked yet. “Views to purchase” fills in once shoppers visit product pages.'}
        </div>
      ) : null}

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 16, alignItems: 'flex-start' }}>
        {/* ── Product list ── */}
        <section className="rep-panel rep-panel--flush" aria-label="Products" style={{ flex: '999 1 640px', minWidth: 0, padding: 0, ...(dim || {}) }}>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', justifyContent: 'space-between', alignItems: 'center', padding: '12px 14px', borderBottom: '1px solid var(--ds-color-border)' }}>
            <div role="group" aria-label="View" style={{ display: 'inline-flex', gap: 2, padding: 3, borderRadius: 11, background: 'var(--ds-color-surface-soft)', border: '1px solid var(--ds-color-border)' }}>
              {[['sales', 'Sales'], ['funnel', 'Views to purchase']].map(([v, l]) => (
                <button key={v} type="button" aria-pressed={view === v} onClick={() => setView(v)} style={segBtn(view === v)}>{l}</button>
              ))}
            </div>
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center' }}>
              <div style={{ minWidth: 170 }}>
                <Dropdown value={sort} onChange={(v) => setSort(String(v))} options={sortOptions} />
              </div>
              <input
                type="search" value={search} onChange={(e) => setSearch(e.target.value)}
                placeholder="Search products or SKU" aria-label="Search products or SKU"
                style={{ minHeight: 36, width: 220, maxWidth: '100%', boxSizing: 'border-box', padding: '0 12px', borderRadius: 10, border: '1px solid var(--ds-color-border)', background: 'var(--ds-color-surface)', color: 'var(--ds-color-text)', font: 'inherit', fontSize: 13 }}
              />
            </div>
          </div>
          {view === 'funnel' && data?.funnelTracked ? (
            <div style={{ padding: '8px 14px', fontSize: 12, color: 'var(--ds-color-text-muted)', background: 'var(--ds-color-info-bg)', borderBottom: '1px solid var(--ds-color-border)' }}>
              Views, add to cart and checkout are tracked per product from {niceDate(funnelSince)}. Days before that show no views.
            </div>
          ) : null}
          <div style={{ overflowX: 'auto' }}>
            <table className="rep-table" style={{ minWidth: 700 }}>
              <thead>
                <tr><th style={{ paddingLeft: 14 }}>Product</th>{cols.map((c) => <th key={c} className="r">{c}</th>)}</tr>
              </thead>
              <tbody>
                {first ? <SkeletonTableRows rows={8} cols={cols.length + 1} /> : !filtered.length ? (
                  <tr><td colSpan={cols.length + 1} style={{ textAlign: 'center', color: 'var(--ds-color-text-faint)', padding: '28px 14px' }}>
                    {search ? `No product matches “${search}”.` : 'Products ordered or viewed in this period will appear here.'}
                  </td></tr>
                ) : filtered.map((p) => {
                  const on = p.id === selId;
                  return (
                    <tr key={p.id} onClick={() => setPicked(p.id)} aria-selected={on}
                      tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setPicked(p.id); } }}
                      style={{ cursor: 'pointer', background: on ? 'var(--ds-color-surface-soft)' : undefined, boxShadow: on ? 'inset 3px 0 0 var(--ds-color-text)' : undefined }}>
                      <td style={{ paddingLeft: 14 }}>
                        <span style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                          <Thumb src={p.image} />
                          <span style={{ minWidth: 0 }}>
                            <span className="strong" style={{ display: 'block', whiteSpace: 'normal', overflowWrap: 'anywhere' }}>{p.name}</span>
                            <Sub>{[p.brand, p.category].filter(Boolean).join(' · ') || '—'}</Sub>
                          </span>
                        </span>
                      </td>
                      {cells(p).map((c, i) => <td key={i} className="r num">{c}</td>)}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
          <div style={{ padding: '12px 14px', borderTop: '1px solid var(--ds-color-border)', fontSize: 12.5, color: 'var(--ds-color-text-muted)', lineHeight: 1.5 }}>
            {footnote}
            {data?.limited ? ` Showing the top ${num(products.length)} of ${num(data.totalProducts)} products by units.` : ''}
          </div>
        </section>

        {/* ── Selected product ── */}
        <aside className="rep-panel" aria-label="Selected product" style={{ flex: '1 1 380px', maxWidth: 470, minWidth: 0 }}>
          {first ? <DetailPanel loading /> : (
            <DetailPanel
              detail={detail}
              loading={detailQ.isFetching}
              error={detailQ.error}
              fallbackName={selRow?.name}
              funnelSince={funnelSince}
            />
          )}
        </aside>
      </div>
    </div>
  );
}
