import { useState, useEffect, useMemo, useCallback } from 'react';

/**
 * Ads Reporting — per-day / per-brand ad-spend profitability calculator.
 *
 * NOTE (no backend yet): ad spend, the order figures and the cost defaults are
 * entered/managed here and persisted in the browser (localStorage). Auto-pulling
 * live orders (including cancelled + RTO) per brand for the date range is the
 * "on-demand" step to wire to the backend later.
 *
 * Formulas (derived from the approved sheet):
 *   T.O.  (total orders)   = Prepaid + COD
 *   Delivered              = T.O. − Cancelled − RTO
 *   CPP   (cost/purchase)  = Ad Spend / T.O.
 *   ROAS                   = Revenue / Ad Spend
 *   A.O.V.                 = Revenue / T.O.
 *   P.D.O. / A.D.O.        = T.O. / Days
 *   A.D.R.                 = Revenue / Days
 *   P.O.R. / C.O.R.        = Prepaid|COD / T.O.
 *   Canc (loss)            = Cancelled × CPP           (wasted ad cost)
 *   RTO  (loss)            = RTO × (CPP + Shipping)    (ad cost + round-trip shipping)
 *   G.P. (gross profit)    = Revenue − Ad Spend − (Product cost × T.O.) − (Shipping × Delivered)
 *   N.P. (net profit)      = G.P. − Canc loss − RTO loss
 *   A.D.N.P.               = N.P. / Days
 *   O.P. %                 = N.P. / Revenue
 * Product cost is per-brand; shipping cost is a global default — both admin-managed below.
 */

const STORAGE_KEY = 'obz_ads_report_v1';

const DEFAULT_BRANDS = ['Morbix', 'Soxbae', 'Cross Coin', 'Knitwink', 'Velmique', 'Gripzus', 'Velquira'];

const blankRow = (brand) => ({
  brand,
  from: '',
  to: '',
  adSpend: '',
  revenue: '',
  prepaid: '',
  cod: '',
  cancelled: '',
  rto: '',
  productCost: '', // per-order product cost (COGS) for this brand
});

const defaultState = () => ({
  shippingCost: 90, // global default per-order shipping (round-trip counted on RTO)
  rows: DEFAULT_BRANDS.map(blankRow),
});

/* ── helpers ── */
const n = (v) => {
  const x = parseFloat(v);
  return Number.isFinite(x) ? x : 0;
};
const daysBetween = (from, to) => {
  if (!from || !to) return 0;
  const a = new Date(from + 'T00:00:00');
  const b = new Date(to + 'T00:00:00');
  const d = Math.round((b - a) / 86400000) + 1; // inclusive
  return d > 0 ? d : 0;
};
const fmt = (v, dp = 0) =>
  Number.isFinite(v) ? v.toLocaleString('en-IN', { minimumFractionDigits: dp, maximumFractionDigits: dp }) : '—';
const pct = (v) => (Number.isFinite(v) ? `${(v * 100).toFixed(1)}%` : '—');

function computeRow(r, shippingCost) {
  const prepaid = n(r.prepaid), cod = n(r.cod), cancelled = n(r.cancelled), rto = n(r.rto);
  const adSpend = n(r.adSpend), revenue = n(r.revenue), productCost = n(r.productCost);
  const to = prepaid + cod;                          // T.O.
  const days = daysBetween(r.from, r.to);
  const delivered = Math.max(to - cancelled - rto, 0);
  const cpp = to ? adSpend / to : 0;
  const roas = adSpend ? revenue / adSpend : 0;
  const aov = to ? revenue / to : 0;
  const pdo = days ? to / days : 0;
  const por = to ? prepaid / to : 0;
  const cor = to ? cod / to : 0;
  const cancLoss = cancelled * cpp;
  const rtoLoss = rto * (cpp + shippingCost);
  const gp = revenue - adSpend - productCost * to - shippingCost * delivered;
  const np = gp - cancLoss - rtoLoss;
  const cancPct = to ? cancelled / to : 0;
  const rtoPct = to ? rto / to : 0;
  const ado = days ? to / days : 0;
  const adr = days ? revenue / days : 0;
  const adnp = days ? np / days : 0;
  const opPct = revenue ? np / revenue : 0;
  return { to, days, delivered, adSpend, revenue, prepaid, cod, cancelled, rto, cpp, roas, aov,
    pdo, por, cor, gp, cancLoss, rtoLoss, np, cancPct, rtoPct, ado, adr, adnp, opPct };
}

/* ── styles (monochrome, dashboard tokens) ── */
const S = {
  wrap: { display: 'flex', flexDirection: 'column', gap: 18 },
  panel: { background: 'var(--ds-color-surface)', border: '1px solid var(--ds-color-border)', borderRadius: 'var(--ds-radius-lg, 12px)', padding: 18 },
  h3: { margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: 'var(--ds-color-text)' },
  hint: { margin: 0, fontSize: 12.5, color: 'var(--ds-color-text-muted)', lineHeight: 1.5 },
  settingsRow: { display: 'flex', gap: 20, flexWrap: 'wrap', alignItems: 'flex-end', marginTop: 14 },
  field: { display: 'flex', flexDirection: 'column', gap: 5 },
  label: { fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--ds-color-text-muted)' },
  input: { height: 34, padding: '0 10px', border: '1px solid var(--ds-color-border)', borderRadius: 8, background: 'var(--ds-color-bg)', color: 'var(--ds-color-text)', fontSize: 13, width: 110, fontFamily: 'inherit' },
  cellInput: { width: 78, height: 30, padding: '0 6px', border: '1px solid var(--ds-color-border)', borderRadius: 6, background: 'var(--ds-color-bg)', color: 'var(--ds-color-text)', fontSize: 12, fontFamily: 'inherit', textAlign: 'right' },
  dateInput: { width: 118, height: 30, padding: '0 6px', border: '1px solid var(--ds-color-border)', borderRadius: 6, background: 'var(--ds-color-bg)', color: 'var(--ds-color-text)', fontSize: 11.5, fontFamily: 'inherit' },
  tableWrap: { overflowX: 'auto', border: '1px solid var(--ds-color-border)', borderRadius: 'var(--ds-radius-lg, 12px)' },
  table: { borderCollapse: 'collapse', fontSize: 12, minWidth: 1900, width: '100%' },
  th: { position: 'sticky', top: 0, background: 'var(--ds-color-surface-soft, #f6f6f7)', color: 'var(--ds-color-text-muted)', fontSize: 10, fontWeight: 700, letterSpacing: '0.03em', textTransform: 'uppercase', padding: '10px 8px', textAlign: 'right', borderBottom: '1px solid var(--ds-color-border)', whiteSpace: 'nowrap' },
  thL: { textAlign: 'left' },
  td: { padding: '7px 8px', textAlign: 'right', borderBottom: '1px solid var(--ds-color-border-soft, #eee)', color: 'var(--ds-color-text)', whiteSpace: 'nowrap' },
  tdL: { textAlign: 'left', fontWeight: 700 },
  totalTd: { padding: '10px 8px', textAlign: 'right', fontWeight: 800, color: 'var(--ds-color-text)', borderTop: '2px solid var(--ds-color-border)', whiteSpace: 'nowrap' },
  btn: { height: 34, padding: '0 14px', borderRadius: 8, border: '1px solid var(--ds-color-border)', background: 'var(--ds-color-bg)', color: 'var(--ds-color-text)', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  btnDark: { height: 34, padding: '0 16px', borderRadius: 8, border: 'none', background: '#0a0a0a', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
};
const posNeg = (v) => ({ color: v < 0 ? 'var(--ds-color-danger, #ef4444)' : 'var(--ds-color-text)' });

export default function AdsReporting() {
  const [state, setState] = useState(defaultState);
  const [loaded, setLoaded] = useState(false);

  // Load once from localStorage.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed && Array.isArray(parsed.rows)) setState({ shippingCost: parsed.shippingCost ?? 90, rows: parsed.rows });
      }
    } catch { /* ignore */ }
    setLoaded(true);
  }, []);

  // Persist on change (after initial load).
  useEffect(() => {
    if (!loaded) return;
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch { /* ignore */ }
  }, [state, loaded]);

  const setShipping = (v) => setState((s) => ({ ...s, shippingCost: v }));
  const setCell = useCallback((i, key, v) => {
    setState((s) => {
      const rows = s.rows.slice();
      rows[i] = { ...rows[i], [key]: v };
      return { ...s, rows };
    });
  }, []);
  const addRow = () => setState((s) => ({ ...s, rows: [...s.rows, blankRow('')] }));
  const removeRow = (i) => setState((s) => ({ ...s, rows: s.rows.filter((_, idx) => idx !== i) }));
  const resetAll = () => { if (confirm('Reset all ads reporting data?')) setState(defaultState()); };

  const shippingCost = n(state.shippingCost);
  const computed = useMemo(() => state.rows.map((r) => computeRow(r, shippingCost)), [state.rows, shippingCost]);

  // Totals — sums for additive columns, ratios recomputed from the totals.
  const totals = useMemo(() => {
    const t = computed.reduce((a, c) => {
      a.to += c.to; a.revenue += c.revenue; a.adSpend += c.adSpend; a.prepaid += c.prepaid; a.cod += c.cod;
      a.cancelled += c.cancelled; a.rto += c.rto; a.gp += c.gp; a.cancLoss += c.cancLoss; a.rtoLoss += c.rtoLoss;
      a.np += c.np; a.days = Math.max(a.days, c.days);
      return a;
    }, { to: 0, revenue: 0, adSpend: 0, prepaid: 0, cod: 0, cancelled: 0, rto: 0, gp: 0, cancLoss: 0, rtoLoss: 0, np: 0, days: 0 });
    t.cpp = t.to ? t.adSpend / t.to : 0;
    t.roas = t.adSpend ? t.revenue / t.adSpend : 0;
    t.aov = t.to ? t.revenue / t.to : 0;
    t.pdo = t.days ? t.to / t.days : 0;
    t.por = t.to ? t.prepaid / t.to : 0;
    t.cor = t.to ? t.cod / t.to : 0;
    t.cancPct = t.to ? t.cancelled / t.to : 0;
    t.rtoPct = t.to ? t.rto / t.to : 0;
    t.ado = t.days ? t.to / t.days : 0;
    t.adr = t.days ? t.revenue / t.days : 0;
    t.adnp = t.days ? t.np / t.days : 0;
    t.opPct = t.revenue ? t.np / t.revenue : 0;
    return t;
  }, [computed]);

  const COLS = [
    ['T.O.', (c) => fmt(c.to)],
    ['Rev.', (c) => fmt(c.revenue)],
    ['Ad Sp.', (c) => fmt(c.adSpend)],
    ['P.O.', (c) => fmt(c.prepaid)],
    ['C.O.', (c) => fmt(c.cod)],
    ['Canc.O', (c) => fmt(c.cancelled)],
    ['RTO O.', (c) => fmt(c.rto)],
    ['CPP', (c) => fmt(c.cpp)],
    ['ROAS', (c) => (Number.isFinite(c.roas) ? c.roas.toFixed(2) : '—')],
    ['A.O.V.', (c) => fmt(c.aov)],
    ['P.D.O.', (c) => fmt(c.pdo)],
    ['P.O.R.', (c) => pct(c.por)],
    ['C.O.R.', (c) => pct(c.cor)],
    ['G.P.', (c) => fmt(c.gp)],
    ['Canc', (c) => fmt(c.cancLoss)],
    ['RTO', (c) => fmt(c.rtoLoss)],
    ['N.P.', (c) => fmt(c.np)],
    ['Canc %', (c) => pct(c.cancPct)],
    ['RTO %', (c) => pct(c.rtoPct)],
    ['A.D.', (c) => fmt(c.days)],
    ['A.D.O.', (c) => (Number.isFinite(c.ado) ? c.ado.toFixed(2) : '—')],
    ['A.D.R.', (c) => fmt(c.adr, 2)],
    ['A.D.N.P.', (c) => fmt(c.adnp, 2)],
    ['O.P. %', (c) => pct(c.opPct)],
  ];

  const EDIT = [
    ['adSpend', 'Ad Sp.'], ['revenue', 'Rev.'], ['prepaid', 'P.O.'], ['cod', 'C.O.'],
    ['cancelled', 'Canc.O'], ['rto', 'RTO O.'], ['productCost', 'Prod ₹'],
  ];

  return (
    <div style={S.wrap}>
      <div>
        <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--ds-color-text)' }}>Ads Reporting</h2>
        <p style={S.hint}>Per-brand ad-spend profitability. Enter ad spend, the order figures and per-brand product cost; totals and every derived metric update live and save in your browser.</p>
      </div>

      {/* Cost management */}
      <div style={S.panel}>
        <h3 style={S.h3}>Cost settings</h3>
        <p style={S.hint}>Admin-managed defaults used across the calculation. Product cost is set per brand in the table (Prod ₹ column).</p>
        <div style={S.settingsRow}>
          <div style={S.field}>
            <label style={S.label}>Shipping cost / order (₹)</label>
            <input style={S.input} type="number" value={state.shippingCost}
              onChange={(e) => setShipping(e.target.value)} />
          </div>
          <div style={{ ...S.field, flex: 1, minWidth: 240 }}>
            <label style={S.label}>Formula</label>
            <p style={{ ...S.hint, fontSize: 11.5 }}>
              N.P. = G.P. − (Cancelled×CPP) − (RTO×(CPP+Shipping)) · G.P. = Rev − Ad − Prod×T.O. − Shipping×Delivered
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <button style={S.btn} onClick={addRow}>+ Add brand</button>
            <button style={S.btn} onClick={resetAll}>Reset</button>
          </div>
        </div>
      </div>

      {/* Table */}
      <div style={S.tableWrap}>
        <table style={S.table}>
          <thead>
            <tr>
              <th style={{ ...S.th, ...S.thL }}>Brand</th>
              <th style={{ ...S.th, ...S.thL }}>From</th>
              <th style={{ ...S.th, ...S.thL }}>To</th>
              {EDIT.map(([k, label]) => <th key={k} style={S.th}>{label}</th>)}
              {COLS.filter(([h]) => !['Rev.', 'Ad Sp.', 'P.O.', 'C.O.', 'Canc.O', 'RTO O.'].includes(h))
                .map(([h]) => <th key={h} style={S.th}>{h}</th>)}
              <th style={S.th}></th>
            </tr>
          </thead>
          <tbody>
            {state.rows.map((r, i) => {
              const c = computed[i];
              return (
                <tr key={i}>
                  <td style={{ ...S.td, ...S.tdL }}>
                    <input style={{ ...S.cellInput, width: 92, textAlign: 'left' }} value={r.brand}
                      placeholder="Brand" onChange={(e) => setCell(i, 'brand', e.target.value)} />
                  </td>
                  <td style={S.td}><input style={S.dateInput} type="date" value={r.from} onChange={(e) => setCell(i, 'from', e.target.value)} /></td>
                  <td style={S.td}><input style={S.dateInput} type="date" value={r.to} onChange={(e) => setCell(i, 'to', e.target.value)} /></td>
                  {EDIT.map(([k]) => (
                    <td key={k} style={S.td}>
                      <input style={S.cellInput} type="number" value={r[k]} onChange={(e) => setCell(i, k, e.target.value)} />
                    </td>
                  ))}
                  {/* computed (non-input) columns */}
                  <td style={S.td}>{fmt(c.to)}</td>
                  <td style={S.td}>{fmt(c.cpp)}</td>
                  <td style={S.td}>{Number.isFinite(c.roas) ? c.roas.toFixed(2) : '—'}</td>
                  <td style={S.td}>{fmt(c.aov)}</td>
                  <td style={S.td}>{fmt(c.pdo)}</td>
                  <td style={S.td}>{pct(c.por)}</td>
                  <td style={S.td}>{pct(c.cor)}</td>
                  <td style={{ ...S.td, ...posNeg(c.gp) }}>{fmt(c.gp)}</td>
                  <td style={S.td}>{fmt(c.cancLoss)}</td>
                  <td style={S.td}>{fmt(c.rtoLoss)}</td>
                  <td style={{ ...S.td, ...posNeg(c.np), fontWeight: 700 }}>{fmt(c.np)}</td>
                  <td style={S.td}>{pct(c.cancPct)}</td>
                  <td style={S.td}>{pct(c.rtoPct)}</td>
                  <td style={S.td}>{fmt(c.days)}</td>
                  <td style={S.td}>{Number.isFinite(c.ado) ? c.ado.toFixed(2) : '—'}</td>
                  <td style={S.td}>{fmt(c.adr, 2)}</td>
                  <td style={{ ...S.td, ...posNeg(c.adnp) }}>{fmt(c.adnp, 2)}</td>
                  <td style={{ ...S.td, ...posNeg(c.opPct) }}>{pct(c.opPct)}</td>
                  <td style={S.td}>
                    <button style={{ ...S.btn, height: 26, padding: '0 8px', fontSize: 11 }} onClick={() => removeRow(i)} title="Remove">✕</button>
                  </td>
                </tr>
              );
            })}
          </tbody>
          <tfoot>
            <tr>
              <td style={{ ...S.totalTd, textAlign: 'left' }}>Total</td>
              <td style={S.totalTd}></td>
              <td style={S.totalTd}></td>
              <td style={S.totalTd}>{fmt(totals.adSpend)}</td>
              <td style={S.totalTd}>{fmt(totals.revenue)}</td>
              <td style={S.totalTd}>{fmt(totals.prepaid)}</td>
              <td style={S.totalTd}>{fmt(totals.cod)}</td>
              <td style={S.totalTd}>{fmt(totals.cancelled)}</td>
              <td style={S.totalTd}>{fmt(totals.rto)}</td>
              <td style={S.totalTd}></td>
              <td style={S.totalTd}>{fmt(totals.to)}</td>
              <td style={S.totalTd}>{fmt(totals.cpp)}</td>
              <td style={S.totalTd}>{totals.roas.toFixed(2)}</td>
              <td style={S.totalTd}>{fmt(totals.aov)}</td>
              <td style={S.totalTd}>{fmt(totals.pdo)}</td>
              <td style={S.totalTd}>{pct(totals.por)}</td>
              <td style={S.totalTd}>{pct(totals.cor)}</td>
              <td style={{ ...S.totalTd, ...posNeg(totals.gp) }}>{fmt(totals.gp)}</td>
              <td style={S.totalTd}>{fmt(totals.cancLoss)}</td>
              <td style={S.totalTd}>{fmt(totals.rtoLoss)}</td>
              <td style={{ ...S.totalTd, ...posNeg(totals.np) }}>{fmt(totals.np)}</td>
              <td style={S.totalTd}>{pct(totals.cancPct)}</td>
              <td style={S.totalTd}>{pct(totals.rtoPct)}</td>
              <td style={S.totalTd}>{fmt(totals.days)}</td>
              <td style={S.totalTd}>{totals.ado.toFixed(2)}</td>
              <td style={S.totalTd}>{fmt(totals.adr, 2)}</td>
              <td style={{ ...S.totalTd, ...posNeg(totals.adnp) }}>{fmt(totals.adnp, 2)}</td>
              <td style={{ ...S.totalTd, ...posNeg(totals.opPct) }}>{pct(totals.opPct)}</td>
              <td style={S.totalTd}></td>
            </tr>
          </tfoot>
        </table>
      </div>

      <p style={{ ...S.hint, fontSize: 11.5 }}>
        Data is saved in this browser only (no backend yet). Auto-pulling live orders per brand for the date range is the next step.
      </p>
    </div>
  );
}
