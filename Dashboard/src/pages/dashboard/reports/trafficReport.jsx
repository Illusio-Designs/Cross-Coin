import { useState, useEffect, useCallback } from 'react';
import { trafficReportService } from '../../../services';
import { Button, DateRangePicker } from '../../../components/ui';

/**
 * Traffic & Conversion — a per-brand funnel: sessions (first-party visit
 * tracking) → orders → revenue, with conversion rate, AOV and a channel
 * (source/medium) breakdown. Themed via --ds tokens (light/dark).
 */

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
    { label: 'Sessions', value: (r) => r.sessions },
    { label: 'Orders', value: (r) => r.orders },
    { label: 'Conversion %', value: (r) => r.conversion_rate },
    { label: 'Revenue', value: (r) => r.revenue },
    { label: 'AOV', value: (r) => r.aov },
  ], brands);

  return (
    <div style={S.wrap}>
      <div style={S.head}>
        <div>
          <h1 style={S.title}>Traffic &amp; Conversion</h1>
          <p style={S.sub}>Sessions → orders → revenue per brand. Traffic is first-party visit tracking (organic, direct, social &amp; campaign).</p>
        </div>
        <div style={S.controls}>
          <DateRangePicker label="Period" inline startDate={from} endDate={to}
            onStartChange={setFrom} onEndChange={setTo} onApply={load} maxDate={istDate()} />
          <Button variant="secondary" onClick={load} loading={loading}>Run</Button>
          <Button variant="ghost" onClick={doExport} disabled={!brands.length}>Export CSV</Button>
        </div>
      </div>

      {error ? <div style={{ ...S.panel, color: 'var(--ds-color-danger, #dc2626)' }}>{error}</div> : null}

      {/* Totals */}
      <div style={S.kpis}>
        <div style={S.kpi}><div style={S.kLab}>Sessions</div><div style={S.kVal}>{num(t?.sessions)}</div></div>
        <div style={S.kpi}><div style={S.kLab}>Orders</div><div style={S.kVal}>{num(t?.orders)}</div></div>
        <div style={S.kpi}><div style={S.kLab}>Conversion</div><div style={S.kVal}>{t ? pct(t.conversion_rate) : '—'}</div></div>
        <div style={S.kpi}><div style={S.kLab}>Revenue</div><div style={S.kVal}>{t ? inr(t.revenue) : '—'}</div></div>
        <div style={S.kpi}><div style={S.kLab}>AOV</div><div style={S.kVal}>{t ? inr(t.aov) : '—'}</div></div>
      </div>

      {/* Per-brand table */}
      <div style={S.panel}>
        <div style={S.tableWrap}>
          <table style={S.table}>
            <thead>
              <tr>
                <th style={{ ...S.th, ...S.thL }}>Brand</th>
                <th style={S.th}>Sessions</th>
                <th style={S.th}>Orders</th>
                <th style={S.th}>Conversion</th>
                <th style={S.th}>Revenue</th>
                <th style={S.th}>AOV</th>
                <th style={{ ...S.th, ...S.thL }}>Top channels</th>
              </tr>
            </thead>
            <tbody>
              {brands.length === 0 ? (
                <tr><td colSpan={7} style={S.empty}>{loading ? 'Loading…' : 'No data for this period yet.'}</td></tr>
              ) : brands.map((b) => (
                <tr key={b.brand_id}>
                  <td style={{ ...S.td, ...S.tdL }}>{b.brand}</td>
                  <td style={S.td}>{num(b.sessions)}</td>
                  <td style={S.td}>{num(b.orders)}</td>
                  <td style={S.td}>{pct(b.conversion_rate)}</td>
                  <td style={S.td}>{inr(b.revenue)}</td>
                  <td style={S.td}>{inr(b.aov)}</td>
                  <td style={{ ...S.td, textAlign: 'left' }}>
                    <div style={S.chan}>
                      {(b.channels || []).length === 0 ? <span style={S.chip}>—</span>
                        : b.channels.map((c, i) => (
                          <span key={i} style={S.chip}>{c.source}{c.medium && c.medium !== 'none' ? `/${c.medium}` : ''} · {num(c.sessions)}</span>
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
