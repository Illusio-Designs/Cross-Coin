import { useState, useEffect, useCallback, useMemo } from 'react';
import { adsReportService } from '../../../services';
import { Modal, Button, Input, Select, DateRangePicker } from '../../../components/ui';

/**
 * Ads Reporting — daily ad spend per brand is the only manual input; orders,
 * revenue, cancels, RTO and profit are computed server-side. Futuristic
 * KPI + chart view over the same data, themed via --ds tokens (light/dark).
 *
 *   G.P. = (AOV − CPP − Product − Shipping) × T.O.
 *   N.P. = G.P. − (Cancelled×CPP) − (RTO×(CPP+Shipping))
 */

const num = (v) => { const x = parseFloat(v); return Number.isFinite(x) ? x : 0; };
const fmt = (v, dp = 0) => (Number.isFinite(v) ? v.toLocaleString('en-IN', { minimumFractionDigits: dp, maximumFractionDigits: dp }) : '—');
const inr = (v) => `₹${fmt(v)}`;
const pct = (v) => (Number.isFinite(v) ? `${(v * 100).toFixed(1)}%` : '—');
// Dates are IST (Asia/Kolkata) so the picker's locks flip at IST midnight,
// aligned with the backend's report cut-off (the day changes at 12 AM IST).
const istDateStr = (d = new Date()) =>
  new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Kolkata', year: 'numeric', month: '2-digit', day: '2-digit' }).format(d);
const shiftDay = (dateStr, n) => { const d = new Date(dateStr + 'T00:00:00Z'); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
const today = () => istDateStr();
const daysAgo = (n) => shiftDay(istDateStr(), -n);

// Ads reporting officially begins on this date — the report counts from here.
const REPORT_START = '2026-08-04';
const REPORT_START_LABEL = '4 Aug 2026';

const POS = 'var(--ds-color-success, #16a34a)';
const NEG = 'var(--ds-color-danger, #dc2626)';
const WARN = 'var(--ds-color-warn, #d97706)';

// Break-even ROAS for the current cost structure — at/above this a brand's ad
// spend is profitable; below it, the campaign loses money. Marks the ROAS strip.
const BREAKEVEN_ROAS = 1.85;

const S = {
  wrap: { display: 'flex', flexDirection: 'column', gap: 16 },
  head: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' },
  title: { margin: 0, fontSize: 21, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--ds-color-text)' },
  sub: { margin: '3px 0 0', fontSize: 12.5, color: 'var(--ds-color-text-muted)' },
  controls: { display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' },
  panel: { background: 'var(--ds-color-surface)', border: '1px solid var(--ds-color-border)', borderRadius: 16, padding: 18 },
  hint: { margin: 0, fontSize: 12, color: 'var(--ds-color-text-muted)', lineHeight: 1.5 },
  label: { fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--ds-color-text-muted)' },
  // KPI
  kpis: { display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 14 },
  kpi: { position: 'relative', overflow: 'hidden', background: 'var(--ds-color-surface)', border: '1px solid var(--ds-color-border)', borderRadius: 16, padding: '16px 18px 14px' },
  kLab: { display: 'flex', alignItems: 'center', gap: 7, fontSize: 11, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'var(--ds-color-text-muted)' },
  kDot: { width: 6, height: 6, borderRadius: '50%' },
  kVal: { fontFamily: 'var(--ds-font-mono, ui-monospace, monospace)', fontSize: 27, fontWeight: 700, letterSpacing: '-0.02em', margin: '11px 0 3px', color: 'var(--ds-color-text)', fontVariantNumeric: 'tabular-nums' },
  kFoot: { fontSize: 12, fontWeight: 600, fontFamily: 'var(--ds-font-mono, ui-monospace, monospace)' },
  // charts
  grid2: { display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 14 },
  panelH: { display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 4 },
  h3: { margin: 0, fontSize: 13.5, fontWeight: 700, color: 'var(--ds-color-text)' },
  chip: { fontSize: 10.5, fontFamily: 'var(--ds-font-mono, ui-monospace, monospace)', color: 'var(--ds-color-text-muted)', border: '1px solid var(--ds-color-border)', borderRadius: 20, padding: '3px 9px' },
  bars: { display: 'flex', flexDirection: 'column', gap: 12, marginTop: 12 },
  bar: { display: 'grid', gridTemplateColumns: '86px 1fr 96px', alignItems: 'center', gap: 12 },
  bnm: { fontSize: 12.5, color: 'var(--ds-color-text-muted)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' },
  track: { height: 24, borderRadius: 7, background: 'var(--ds-color-bg)', position: 'relative', overflow: 'hidden' },
  bamt: { textAlign: 'right', fontFamily: 'var(--ds-font-mono, ui-monospace, monospace)', fontSize: 12.5, fontVariantNumeric: 'tabular-nums' },
  donutWrap: { display: 'flex', alignItems: 'center', gap: 18, marginTop: 12 },
  legend: { display: 'flex', flexDirection: 'column', gap: 10, fontSize: 12.5, color: 'var(--ds-color-text)' },
  li: { display: 'flex', alignItems: 'center', gap: 9 },
  sw: { width: 10, height: 10, borderRadius: 3, flexShrink: 0 },
  roasGrid: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 12, marginTop: 12 },
  roasCard: { background: 'var(--ds-color-bg)', border: '1px solid var(--ds-color-border)', borderRadius: 12, padding: '12px 14px' },
  // table
  tableWrap: { overflowX: 'auto', border: '1px solid var(--ds-color-border)', borderRadius: 16 },
  table: { borderCollapse: 'collapse', fontSize: 12, minWidth: 1180, width: '100%' },
  th: { background: 'var(--ds-color-surface-soft, #f6f6f7)', color: 'var(--ds-color-text-muted)', fontSize: 10, letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 700, textAlign: 'right', padding: '11px 9px', whiteSpace: 'nowrap', borderBottom: '1px solid var(--ds-color-border)' },
  td: { padding: '10px 9px', textAlign: 'right', whiteSpace: 'nowrap', borderBottom: '1px solid var(--ds-color-border-soft, #eee)', color: 'var(--ds-color-text)', fontFamily: 'var(--ds-font-mono, ui-monospace, monospace)', fontVariantNumeric: 'tabular-nums' },
  totalTd: { padding: '12px 9px', textAlign: 'right', fontWeight: 800, color: 'var(--ds-color-text)', borderTop: '2px solid var(--ds-color-border)', whiteSpace: 'nowrap', fontFamily: 'var(--ds-font-mono, ui-monospace, monospace)' },
  field: { display: 'flex', flexDirection: 'column', gap: 5 },
};
const pn = (v) => ({ color: v < 0 ? NEG : 'var(--ds-color-text)' });

export default function AdsReporting() {
  const [from, setFrom] = useState(REPORT_START);
  const [to, setTo] = useState(daysAgo(1)); // up to yesterday — a day only counts once it has ended
  const [report, setReport] = useState({ rows: [], shipping: 90 });
  const [settings, setSettings] = useState({ shipping: 90, productCost: {} });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [spendForm, setSpendForm] = useState({ brand_id: '', date: today(), amount: '' });
  const [spendList, setSpendList] = useState([]);
  const [msg, setMsg] = useState('');
  const [spendOpen, setSpendOpen] = useState(false);
  const [costOpen, setCostOpen] = useState(false);

  const brands = useMemo(() => report.rows.map((r) => ({ id: r.brand_id, name: r.brand })), [report.rows]);

  const loadReport = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const data = await adsReportService.getReport(from, to);
      if (data?.success) setReport(data); else setError(data?.message || 'Failed to load report');
    } catch (e) { setError(e?.response?.data?.message || e.message || 'Failed to load report'); }
    finally { setLoading(false); }
  }, [from, to]);

  const loadSettings = useCallback(async () => {
    try { const d = await adsReportService.getSettings(); if (d?.success) setSettings({ shipping: d.shipping, productCost: d.productCost || {} }); } catch { /* */ }
  }, []);

  useEffect(() => { loadSettings(); }, [loadSettings]);
  useEffect(() => { loadReport(); }, []); // initial

  const saveSettings = async () => {
    setMsg('');
    try {
      const d = await adsReportService.saveSettings({ shipping: num(settings.shipping), productCost: settings.productCost });
      if (d?.success) { setSettings({ shipping: d.shipping, productCost: d.productCost || {} }); setMsg('Saved.'); loadReport(); }
    } catch (e) { setMsg(e?.response?.data?.message || 'Save failed'); }
  };

  const loadSpend = useCallback(async (brandId) => {
    if (!brandId) { setSpendList([]); return; }
    try { const d = await adsReportService.getSpend(brandId); if (d?.success) setSpendList(d.spend || []); } catch { setSpendList([]); }
  }, []);
  const onPickBrand = (id) => { setSpendForm((f) => ({ ...f, brand_id: id })); loadSpend(id); };

  const addSpend = async () => {
    if (!spendForm.brand_id || !spendForm.date) { setMsg('Pick a brand and date.'); return; }
    setMsg('');
    try {
      await adsReportService.saveSpend([{ brand_id: Number(spendForm.brand_id), date: spendForm.date, amount: num(spendForm.amount) }]);
      setSpendForm((f) => ({ ...f, amount: '' })); await loadSpend(spendForm.brand_id); await loadReport(); setMsg('Spend saved.');
    } catch (e) { setMsg(e?.response?.data?.message || 'Save failed'); }
  };
  const removeSpend = async (id) => { try { await adsReportService.deleteSpend(id); await loadSpend(spendForm.brand_id); await loadReport(); } catch { /* */ } };
  const setProductCost = (id, v) => setSettings((s) => ({ ...s, productCost: { ...s.productCost, [id]: v } }));

  const totals = useMemo(() => {
    const t = report.rows.reduce((a, r) => {
      a.adSpend += num(r.adSpend); a.revenue += num(r.revenue); a.totalOrders += num(r.totalOrders);
      a.prepaid += num(r.prepaid); a.cod += num(r.cod); a.cancelled += num(r.cancelled); a.rto += num(r.rto);
      a.gp += num(r.gp); a.cancLoss += num(r.cancLoss); a.rtoLoss += num(r.rtoLoss); a.np += num(r.np);
      a.days = Math.max(a.days, num(r.days)); return a;
    }, { adSpend: 0, revenue: 0, totalOrders: 0, prepaid: 0, cod: 0, cancelled: 0, rto: 0, gp: 0, cancLoss: 0, rtoLoss: 0, np: 0, days: 0 });
    t.cpp = t.totalOrders ? t.adSpend / t.totalOrders : 0;
    t.roas = t.adSpend ? t.revenue / t.adSpend : 0;
    t.aov = t.totalOrders ? t.revenue / t.totalOrders : 0;
    t.por = t.totalOrders ? t.prepaid / t.totalOrders : 0;
    t.cor = t.totalOrders ? t.cod / t.totalOrders : 0;
    t.cancPct = t.totalOrders ? t.cancelled / t.totalOrders : 0;
    t.rtoPct = t.totalOrders ? t.rto / t.totalOrders : 0;
    t.pdo = t.days ? t.totalOrders / t.days : 0;
    t.ado = t.days ? t.totalOrders / t.days : 0;
    t.adr = t.days ? t.revenue / t.days : 0;
    t.adnp = t.days ? t.np / t.days : 0;
    t.opPct = t.revenue ? t.np / t.revenue : 0;
    return t;
  }, [report.rows]);

  // derived visuals
  const maxAbsNP = Math.max(1, ...report.rows.map((r) => Math.abs(num(r.np))));
  const delivered = Math.max(totals.totalOrders - totals.cancelled - totals.rto, 0);
  const dPct = totals.totalOrders ? (delivered / totals.totalOrders) * 100 : 0;
  const rPct = totals.totalOrders ? (totals.rto / totals.totalOrders) * 100 : 0;
  const cPct = totals.totalOrders ? (totals.cancelled / totals.totalOrders) * 100 : 0;
  const roasRows = report.rows.filter((r) => r.hasSpend).sort((a, b) => num(b.adSpend) - num(a.adSpend)).slice(0, 6);

  const HEAD = ['Brand', 'From', 'T.O.', 'Rev.', 'Ad Sp.', 'CPP', 'ROAS', 'A.O.V.', 'Canc.', 'RTO', 'G.P.', 'N.P.', 'RTO %', 'O.P. %'];

  return (
    <div style={S.wrap}>
      {/* Header + controls */}
      <div style={S.head}>
        <div>
          <h2 style={S.title}>Ads Reporting</h2>
          <p style={S.sub}>Per-brand ad-spend profitability. Add daily spend — everything else is calculated from orders.</p>
        </div>
        <div style={S.controls}>
          <DateRangePicker label="Period" inline startDate={from} endDate={to}
            onStartChange={setFrom} onEndChange={setTo} onApply={loadReport}
            minDate={REPORT_START} maxDate={daysAgo(1)} />
          <Button variant="secondary" onClick={loadReport} loading={loading}>Run</Button>
          <Button variant="secondary" onClick={() => setCostOpen(true)}>Manage costs</Button>
          <Button variant="primary" onClick={() => setSpendOpen(true)}>+ Add spend</Button>
        </div>
      </div>
      {error && <p style={{ ...S.hint, color: NEG }}>{error}</p>}

      {/* Reporting-start note */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, padding: '9px 13px', borderRadius: 10, background: 'var(--ds-color-surface-soft, #f6f6f7)', border: '1px solid var(--ds-color-border)', fontSize: 12.5, color: 'var(--ds-color-text-muted)' }}>
        <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ flexShrink: 0 }}><circle cx="12" cy="12" r="9" /><path d="M12 8h.01M11 12h1v4h1" /></svg>
        Ads reporting starts from <b style={{ color: 'var(--ds-color-text)', fontWeight: 700, margin: '0 2px' }}>{REPORT_START_LABEL}</b> and counts completed days only — up to yesterday (today&apos;s orders are counted after the day ends).
      </div>

      {/* KPI hero */}
      <div style={S.kpis}>
        <div style={{ ...S.kpi, boxShadow: totals.np >= 0 ? `0 0 0 1px color-mix(in srgb, ${POS} 25%, transparent)` : 'none' }}>
          <div style={S.kLab}><span style={{ ...S.kDot, background: totals.np >= 0 ? POS : NEG }} />Net profit</div>
          <div style={{ ...S.kVal, color: totals.np >= 0 ? POS : NEG }}>{inr(totals.np)}</div>
          <div style={{ ...S.kFoot, color: 'var(--ds-color-text-muted)' }}>{pct(totals.opPct)} margin</div>
        </div>
        <div style={S.kpi}>
          <div style={S.kLab}><span style={{ ...S.kDot, background: 'var(--ds-color-text)' }} />ROAS</div>
          <div style={S.kVal}>{Number.isFinite(totals.roas) ? totals.roas.toFixed(2) : '0.00'}×</div>
          <div style={{ ...S.kFoot, color: 'var(--ds-color-text-muted)' }}>blended</div>
        </div>
        <div style={S.kpi}>
          <div style={S.kLab}><span style={{ ...S.kDot, background: 'var(--ds-color-text-muted)' }} />Ad spend</div>
          <div style={S.kVal}>{inr(totals.adSpend)}</div>
          <div style={{ ...S.kFoot, color: 'var(--ds-color-text-muted)' }}>{fmt(totals.totalOrders)} orders</div>
        </div>
        <div style={S.kpi}>
          <div style={S.kLab}><span style={{ ...S.kDot, background: 'var(--ds-color-text)' }} />Revenue</div>
          <div style={S.kVal}>{inr(totals.revenue)}</div>
          <div style={{ ...S.kFoot, color: 'var(--ds-color-text-muted)' }}>AOV {inr(totals.aov)}</div>
        </div>
      </div>

      {/* Charts */}
      <div style={S.grid2}>
        <div style={S.panel}>
          <div style={S.panelH}><h3 style={S.h3}>Net profit by brand</h3><span style={S.chip}>₹ this period</span></div>
          <p style={S.hint}>Green = profit · red = loss after ad spend, cancels &amp; RTO</p>
          <div style={S.bars}>
            {report.rows.map((r) => {
              const np = num(r.np); const w = r.hasSpend ? Math.max(2, (Math.abs(np) / maxAbsNP) * 100) : 0;
              return (
                <div style={S.bar} key={r.brand_id}>
                  <span style={{ ...S.bnm, color: r.hasSpend ? 'var(--ds-color-text-muted)' : 'var(--ds-color-text-faint,#aaa)' }}>{r.brand}</span>
                  <div style={S.track}>{r.hasSpend && <div style={{ position: 'absolute', top: 0, bottom: 0, left: 0, width: `${w}%`, borderRadius: 7, background: np < 0 ? NEG : POS, opacity: np < 0 ? 0.85 : 1 }} />}</div>
                  <span style={{ ...S.bamt, color: !r.hasSpend ? 'var(--ds-color-text-faint,#aaa)' : (np < 0 ? NEG : POS) }}>{r.hasSpend ? `${np < 0 ? '−' : '+'}${fmt(Math.abs(np))}` : '—'}</span>
                </div>
              );
            })}
            {report.rows.length === 0 && <p style={S.hint}>No data yet.</p>}
          </div>
        </div>

        <div style={S.panel}>
          <div style={S.panelH}><h3 style={S.h3}>Order outcomes</h3><span style={S.chip}>{fmt(totals.totalOrders)} total</span></div>
          <p style={S.hint}>Where orders landed across all brands</p>
          <div style={S.donutWrap}>
            <svg width="140" height="140" viewBox="0 0 42 42" style={{ flexShrink: 0 }}>
              <circle cx="21" cy="21" r="15.9" fill="none" stroke="var(--ds-color-bg)" strokeWidth="5" />
              <circle cx="21" cy="21" r="15.9" fill="none" stroke={POS} strokeWidth="5" strokeDasharray={`${dPct} ${100 - dPct}`} strokeDashoffset="25" />
              <circle cx="21" cy="21" r="15.9" fill="none" stroke={WARN} strokeWidth="5" strokeDasharray={`${rPct} ${100 - rPct}`} strokeDashoffset={`${25 - dPct}`} />
              <circle cx="21" cy="21" r="15.9" fill="none" stroke={NEG} strokeWidth="5" strokeDasharray={`${cPct} ${100 - cPct}`} strokeDashoffset={`${25 - dPct - rPct}`} />
              <text x="21" y="20.5" textAnchor="middle" fill="var(--ds-color-text)" fontSize="7" fontWeight="700">{dPct.toFixed(0)}%</text>
              <text x="21" y="26" textAnchor="middle" fill="var(--ds-color-text-muted)" fontSize="3.2">delivered</text>
            </svg>
            <div style={S.legend}>
              <div style={S.li}><span style={{ ...S.sw, background: POS }} /><span><b>{fmt(delivered)}</b> Delivered · {dPct.toFixed(1)}%</span></div>
              <div style={S.li}><span style={{ ...S.sw, background: WARN }} /><span><b>{fmt(totals.rto)}</b> RTO · {rPct.toFixed(1)}%</span></div>
              <div style={S.li}><span style={{ ...S.sw, background: NEG }} /><span><b>{fmt(totals.cancelled)}</b> Cancelled · {cPct.toFixed(1)}%</span></div>
            </div>
          </div>
        </div>
      </div>

      {/* ROAS strip */}
      {roasRows.length > 0 && (
        <div style={S.panel}>
          <div style={S.panelH}><h3 style={S.h3}>Return on ad spend</h3><span style={S.chip}>{BREAKEVEN_ROAS.toFixed(2)}× = break-even</span></div>
          <div style={S.roasGrid}>
            {roasRows.map((r) => {
              const roas = num(r.roas); const w = Math.min(100, (roas / 5) * 100); const good = roas >= BREAKEVEN_ROAS;
              return (
                <div style={S.roasCard} key={r.brand_id}>
                  <div style={{ fontSize: 12, color: 'var(--ds-color-text-muted)' }}>{r.brand}</div>
                  <div style={{ fontFamily: 'var(--ds-font-mono, monospace)', fontSize: 21, fontWeight: 700, marginTop: 5, color: good ? 'var(--ds-color-text)' : WARN }}>{roas.toFixed(2)}×</div>
                  <div style={{ height: 5, borderRadius: 3, background: 'var(--ds-color-border)', marginTop: 8, position: 'relative', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${w}%`, borderRadius: 3, background: good ? POS : WARN }} />
                    <span style={{ position: 'absolute', top: -3, bottom: -3, left: `${(BREAKEVEN_ROAS / 5) * 100}%`, width: 1, background: 'var(--ds-color-text-faint,#aaa)' }} />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Table */}
      <div style={S.tableWrap}>
        <table style={S.table}>
          <thead><tr>{HEAD.map((h, i) => <th key={h} style={{ ...S.th, textAlign: i < 2 ? 'left' : 'right', paddingLeft: i === 0 ? 16 : 9 }}>{h}</th>)}</tr></thead>
          <tbody>
            {report.rows.map((r) => (
              <tr key={r.brand_id} style={{ opacity: r.hasSpend ? 1 : 0.5 }}>
                <td style={{ ...S.td, textAlign: 'left', paddingLeft: 16, fontFamily: 'inherit', fontWeight: 700 }}>{r.brand}</td>
                <td style={{ ...S.td, textAlign: 'left' }}>{r.from || '—'}</td>
                <td style={S.td}>{fmt(r.totalOrders)}</td>
                <td style={S.td}>{fmt(r.revenue)}</td>
                <td style={S.td}>{fmt(r.adSpend)}</td>
                <td style={S.td}>{fmt(r.cpp)}</td>
                <td style={S.td}>{Number.isFinite(r.roas) ? r.roas.toFixed(2) : '—'}</td>
                <td style={S.td}>{fmt(r.aov)}</td>
                <td style={S.td}>{fmt(r.cancelled)}</td>
                <td style={S.td}>{fmt(r.rto)}</td>
                <td style={{ ...S.td, ...pn(r.gp) }}>{fmt(r.gp)}</td>
                <td style={{ ...S.td, color: num(r.np) < 0 ? NEG : POS, fontWeight: 700 }}>{fmt(r.np)}</td>
                <td style={S.td}>{pct(r.rtoPct)}</td>
                <td style={{ ...S.td, ...pn(r.opPct) }}>{pct(r.opPct)}</td>
              </tr>
            ))}
            {report.rows.length === 0 && !loading && (
              <tr><td style={{ ...S.td, textAlign: 'center', padding: 24 }} colSpan={HEAD.length}>No data. Add ad spend, then Run.</td></tr>
            )}
          </tbody>
          {report.rows.length > 0 && (
            <tfoot><tr>
              <td style={{ ...S.totalTd, textAlign: 'left', paddingLeft: 16, fontFamily: 'inherit' }}>Total</td>
              <td style={S.totalTd}></td>
              <td style={S.totalTd}>{fmt(totals.totalOrders)}</td>
              <td style={S.totalTd}>{fmt(totals.revenue)}</td>
              <td style={S.totalTd}>{fmt(totals.adSpend)}</td>
              <td style={S.totalTd}>{fmt(totals.cpp)}</td>
              <td style={S.totalTd}>{totals.roas.toFixed(2)}</td>
              <td style={S.totalTd}>{fmt(totals.aov)}</td>
              <td style={S.totalTd}>{fmt(totals.cancelled)}</td>
              <td style={S.totalTd}>{fmt(totals.rto)}</td>
              <td style={{ ...S.totalTd, ...pn(totals.gp) }}>{fmt(totals.gp)}</td>
              <td style={{ ...S.totalTd, color: totals.np < 0 ? NEG : POS }}>{fmt(totals.np)}</td>
              <td style={S.totalTd}>{pct(totals.rtoPct)}</td>
              <td style={{ ...S.totalTd, ...pn(totals.opPct) }}>{pct(totals.opPct)}</td>
            </tr></tfoot>
          )}
        </table>
      </div>

      {/* Add spend modal */}
      <Modal isOpen={spendOpen} onClose={() => { setSpendOpen(false); setMsg(''); }} title="Add daily ad spend"
        description="Pick a brand and enter that day's spend. Add as many days as you need." size="md">
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={{ minWidth: 170 }}>
            <Select label="Brand" placeholder="Select brand" value={spendForm.brand_id} onChange={(v) => onPickBrand(v)}
              options={brands.map((b) => ({ label: b.name, value: String(b.id) }))} />
          </div>
          <div style={{ minWidth: 170 }}>
            <DateRangePicker single inline label="Date" startDate={spendForm.date}
              onStartChange={(d) => setSpendForm((f) => ({ ...f, date: d }))}
              minDate={REPORT_START} maxDate={today()} />
          </div>
          <Input label="Spend (₹)" type="number" value={spendForm.amount} onChange={(e) => setSpendForm((f) => ({ ...f, amount: e.target.value }))} />
          <Button variant="primary" onClick={addSpend}>Save</Button>
        </div>
        {msg && <p style={{ ...S.hint, marginTop: 10, color: POS }}>{msg}</p>}
        {spendForm.brand_id && (
          <div style={{ marginTop: 16 }}>
            <div style={{ ...S.label, marginBottom: 8 }}>Recorded days</div>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, maxHeight: 200, overflowY: 'auto' }}>
              {spendList.length === 0 && <span style={S.hint}>No spend records yet for this brand.</span>}
              {spendList.map((s) => (
                <span key={s.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontSize: 12, background: 'var(--ds-color-bg)', border: '1px solid var(--ds-color-border)', borderRadius: 8, padding: '5px 10px' }}>
                  {s.date} · ₹{fmt(num(s.amount))}
                  <button onClick={() => removeSpend(s.id)} title="Delete" style={{ border: 'none', background: 'none', color: 'var(--ds-color-text-muted)', cursor: 'pointer', fontSize: 13 }}>✕</button>
                </span>
              ))}
            </div>
          </div>
        )}
      </Modal>

      {/* Manage costs modal */}
      <Modal isOpen={costOpen} onClose={() => { setCostOpen(false); setMsg(''); }} title="Manage costs"
        description="Defaults: product ₹140/order (per brand), shipping ₹90/order (global). Used for G.P. / N.P." size="md"
        footer={(
          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 10 }}>
            <Button variant="ghost" onClick={() => setCostOpen(false)}>Close</Button>
            <Button variant="primary" onClick={saveSettings}>Save costs</Button>
          </div>
        )}>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
          <Input label="Shipping / order (₹)" type="number" value={settings.shipping} onChange={(e) => setSettings((s) => ({ ...s, shipping: e.target.value }))} />
        </div>
        <div style={{ ...S.label, margin: '16px 0 8px' }}>Product cost / order — per brand</div>
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14 }}>
          {brands.map((b) => (
            <Input key={b.id} label={`${b.name} (₹)`} type="number" value={settings.productCost[b.id] ?? 140} onChange={(e) => setProductCost(b.id, e.target.value)} />
          ))}
        </div>
        {msg && <p style={{ ...S.hint, marginTop: 10, color: POS }}>{msg}</p>}
      </Modal>
    </div>
  );
}
