import { useState, useEffect, useCallback } from 'react';
import { trafficReportService } from '../../../services';
import { Button, DateRangePicker } from '../../../components/ui';

/**
 * Traffic & Conversion — a per-brand funnel: sessions (first-party visit
 * tracking) → orders → revenue, with conversion rate, AOV and a channel
 * (source/medium) breakdown. Themed via --ds tokens (light/dark).
 */

// Brand colours for the 5 headline channels — categorical identity that reads
// at a glance against the otherwise-monochrome Obzus chrome.
const CHANNEL_COLORS = { Facebook: '#1877f2', Instagram: '#e1306c', Google: '#ea4335', 'AI chatbot': '#8b5cf6', Other: '#94a3b8' };
const chColor = (name) => CHANNEL_COLORS[name] || 'var(--ds-color-accent, #2563eb)';

const num = (v) => (Number.isFinite(Number(v)) ? Number(v).toLocaleString('en-IN') : '—');
const inr = (v) => `₹${num(Math.round(Number(v) || 0))}`;
const pct = (v) => `${(Number(v) || 0).toFixed(2)}%`;

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

const S = {
  wrap: { display: 'flex', flexDirection: 'column', gap: 16 },
  head: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' },
  title: { margin: 0, fontSize: 21, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--ds-color-text)' },
  sub: { margin: '3px 0 0', fontSize: 12.5, color: 'var(--ds-color-text-muted)' },
  controls: { display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' },
  panel: { background: 'var(--ds-color-surface)', border: '1px solid var(--ds-color-border)', borderRadius: 16, padding: 18 },
  kpis: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 14 },
  kpi: { minWidth: 0, background: 'var(--ds-color-surface)', border: '1px solid var(--ds-color-border)', borderRadius: 16, padding: '16px 18px 14px' },
  kLab: { fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ds-color-text-muted)' },
  kVal: { fontFamily: 'var(--ds-font-mono, ui-monospace, monospace)', fontSize: 'clamp(18px, 5vw, 26px)', fontWeight: 700, letterSpacing: '-0.02em', margin: '10px 0 0', color: 'var(--ds-color-text)', fontVariantNumeric: 'tabular-nums' },
  tableWrap: { overflowX: 'auto' },
  table: { width: '100%', borderCollapse: 'collapse', fontSize: 13 },
  th: { textAlign: 'right', padding: '10px 12px', fontSize: 11, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--ds-color-text-muted)', borderBottom: '1px solid var(--ds-color-border)', whiteSpace: 'nowrap' },
  thL: { textAlign: 'left' },
  td: { textAlign: 'right', padding: '11px 12px', color: 'var(--ds-color-text)', borderBottom: '1px solid var(--ds-color-border)', fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' },
  tdL: { textAlign: 'left', fontWeight: 700 },
  chan: { display: 'flex', flexWrap: 'wrap', gap: 6, justifyContent: 'flex-end' },
  chip: { fontSize: 10.5, fontFamily: 'var(--ds-font-mono, ui-monospace, monospace)', color: 'var(--ds-color-text-muted)', border: '1px solid var(--ds-color-border)', borderRadius: 20, padding: '2px 8px' },
  empty: { padding: 40, textAlign: 'center', color: 'var(--ds-color-text-muted)', fontSize: 13 },
};

export default function TrafficReport() {
  const [from, setFrom] = useState(shiftDay(istDate(), -29));
  const [to, setTo] = useState(istDate());
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState(null);
  const [error, setError] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const res = await trafficReportService.getBrandTraffic(from, to);
      if (res?.success) setData(res); else setError(res?.message || 'Failed to load report');
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'Failed to load report');
    } finally { setLoading(false); }
  }, [from, to]);

  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const t = data?.totals;
  const brands = data?.brands || [];

  const doExport = () => exportCsv(`traffic-conversion_${from}_${to}.csv`, [
    { label: 'Brand', value: (r) => r.brand },
    { label: 'Visits', value: (r) => r.sessions },
    { label: 'Product views', value: (r) => r.views },
    { label: 'Add to cart', value: (r) => r.carts },
    { label: 'Checkout', value: (r) => r.checkouts },
    { label: 'Orders', value: (r) => r.orders },
    { label: 'Delivered', value: (r) => r.delivered },
    { label: 'Conversion %', value: (r) => r.conversion_rate },
    { label: 'Revenue', value: (r) => r.revenue },
    { label: 'AOV', value: (r) => r.aov },
  ], brands);

  return (
    <div style={S.wrap}>
      <div style={S.head}>
        <div>
          <h1 style={S.title}>Traffic &amp; Conversion</h1>
          <p style={S.sub}>Visits → views → cart → checkout → orders per brand. Orders, revenue &amp; conversion count only visits we tracked (first-party); total store sales are on the Overview report.</p>
        </div>
        <div style={S.controls}>
          <DateRangePicker label="Period" inline startDate={from} endDate={to}
            onStartChange={setFrom} onEndChange={setTo} onApply={load} maxDate={istDate()} />
          <Button variant="ghost" onClick={doExport} disabled={!brands.length || loading}>Export CSV</Button>
        </div>
      </div>

      {error ? <div style={{ ...S.panel, color: 'var(--ds-color-danger, #dc2626)' }}>{error}</div> : null}

      {/* Totals */}
      <div style={S.kpis}>
        <div style={S.kpi}><div style={S.kLab}>Visits</div><div style={S.kVal}>{num(t?.sessions)}</div></div>
        <div style={S.kpi}><div style={S.kLab}>Orders</div><div style={S.kVal}>{num(t?.orders)}</div></div>
        <div style={S.kpi}><div style={S.kLab}>Conversion</div><div style={S.kVal}>{t ? pct(t.conversion_rate) : '—'}</div></div>
        <div style={S.kpi}><div style={S.kLab}>Revenue</div><div style={S.kVal}>{t ? inr(t.revenue) : '—'}</div></div>
        <div style={S.kpi}><div style={S.kLab}>AOV</div><div style={S.kVal}>{t ? inr(t.aov) : '—'}</div></div>
      </div>

      {/* Funnel (all brands combined) */}
      {t?.stages?.length ? (
        <div style={S.panel}>
          <div style={{ ...S.kLab, marginBottom: 12 }}>Funnel — all brands</div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {t.stages.map((st) => (
              <div key={st.key} style={{ display: 'grid', gridTemplateColumns: '130px 1fr 190px', alignItems: 'center', gap: 12 }}>
                <span style={{ fontSize: 12.5, color: 'var(--ds-color-text)', fontWeight: 600 }}>{st.label}</span>
                <div style={{ background: 'var(--ds-color-border)', borderRadius: 8, height: 26, overflow: 'hidden', position: 'relative' }}>
                  <div style={{ width: `${Math.min(100, Math.max(2, st.overall_rate ?? 0))}%`, height: '100%', background: 'var(--ds-color-accent, #2563eb)', borderRadius: 8, transition: 'width .3s' }} />
                  <span style={{ position: 'absolute', left: 8, top: 0, height: '100%', display: 'flex', alignItems: 'center', fontSize: 11.5, fontWeight: 700, color: 'var(--ds-color-text)' }}>{pct(st.overall_rate ?? 0)}</span>
                </div>
                <span style={{ fontSize: 12.5, textAlign: 'right', color: 'var(--ds-color-text-muted)', fontVariantNumeric: 'tabular-nums' }}>
                  <b style={{ color: 'var(--ds-color-text)' }}>{num(st.count)}</b>
                  {st.step_rate != null ? <span> · {pct(st.step_rate)} from prev</span> : null}
                </span>
              </div>
            ))}
          </div>
          <p style={{ ...S.sub, marginTop: 12 }}>Bar % = share of Visits (top = 100%); the right shows the count and the step conversion from the previous stage. Bot/crawler traffic is excluded. Visits/views/cart/checkout are first-party events; orders/delivered come from the order records.</p>
        </div>
      ) : null}

      {/* Traffic sources — grouped into the 5 headline channels */}
      {data?.channels?.length ? (
        <div style={S.panel}>
          <div style={{ ...S.kLab, marginBottom: 12 }}>Traffic sources — where visitors come from</div>
          <div style={S.tableWrap}>
            <table style={S.table}>
              <thead>
                <tr>
                  <th style={{ ...S.th, ...S.thL }}>Channel</th>
                  <th style={S.th}>Visitors</th>
                  <th style={S.th}>Share</th>
                  <th style={S.th}>Orders</th>
                  <th style={S.th}>Conversion</th>
                  <th style={{ ...S.th, ...S.thL, width: '30%' }}>Share of visits</th>
                </tr>
              </thead>
              <tbody>
                {data.channels.map((s, i) => (
                  <tr key={i}>
                    <td style={{ ...S.td, ...S.tdL }}>
                      <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: chColor(s.channel), marginRight: 8, verticalAlign: 'middle' }} />
                      {s.channel}
                    </td>
                    <td style={S.td}>{num(s.sessions)}</td>
                    <td style={S.td}>{pct(s.share)}</td>
                    <td style={S.td}>{num(s.orders)}</td>
                    <td style={S.td}>{pct(s.conversion_rate)}</td>
                    <td style={{ ...S.td, textAlign: 'left' }}>
                      <div style={{ background: 'var(--ds-color-border)', borderRadius: 6, height: 14, overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(100, Math.max(2, s.share))}%`, height: '100%', background: chColor(s.channel), borderRadius: 6 }} />
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ) : null}

      {/* Per-brand table */}
      <div style={S.panel}>
        <div style={S.tableWrap}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={{ ...S.th, ...S.thL }}>Brand</th>
                <th style={S.th}>Visits</th>
                <th style={S.th}>Views</th>
                <th style={S.th}>Cart</th>
                <th style={S.th}>Checkout</th>
                <th style={S.th}>Orders</th>
                <th style={S.th}>Delivered</th>
                <th style={S.th}>Conv.</th>
                <th style={S.th}>Revenue</th>
                <th style={S.th}>AOV</th>
                <th style={{ ...S.th, ...S.thL }}>Top channels</th>
              </tr>
            </thead>
            <tbody>
              {brands.length === 0 ? (
                <tr><td colSpan={11} style={S.empty}>{loading ? 'Loading…' : 'No data for this period yet.'}</td></tr>
              ) : brands.map((b) => (
                <tr key={b.brand_id}>
                  <td style={{ ...S.td, ...S.tdL }}>{b.brand}</td>
                  <td style={S.td}>{num(b.sessions)}</td>
                  <td style={S.td}>{num(b.views)}</td>
                  <td style={S.td}>{num(b.carts)}</td>
                  <td style={S.td}>{num(b.checkouts)}</td>
                  <td style={S.td}>{num(b.orders)}</td>
                  <td style={S.td}>{num(b.delivered)}</td>
                  <td style={S.td}>{pct(b.conversion_rate)}</td>
                  <td style={S.td}>{inr(b.revenue)}</td>
                  <td style={S.td}>{inr(b.aov)}</td>
                  <td style={{ ...S.td, textAlign: 'left' }}>
                    <div style={S.chan}>
                      {(b.channels || []).length === 0 ? <span style={S.chip}>—</span>
                        : b.channels.map((c, i) => (
                          <span key={i} style={S.chip}>
                            <span style={{ display: 'inline-block', width: 7, height: 7, borderRadius: '50%', background: chColor(c.channel), marginRight: 6, verticalAlign: 'middle' }} />
                            {c.channel} · {num(c.sessions)}
                          </span>
                        ))}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
