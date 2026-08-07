import { useState, useEffect, useCallback, useMemo } from 'react';
import { adsReportService } from '../../../services';
import Modal from '../../../components/ui/Modal';

/**
 * Ads Reporting — the ONLY manual input is daily ad spend per brand. Orders
 * (revenue, cancelled, RTO, prepaid/COD) are auto-counted from the backend for
 * each brand's date range; product cost (per brand) and shipping (global) are
 * admin-managed defaults. Everything is computed server-side; this page enters
 * spend / costs and displays the result.
 *
 *   CPP = Ad/T.O. · ROAS = Rev/Ad · AOV = Rev/T.O.
 *   G.P. = (AOV − CPP − Product − Shipping) × T.O.
 *   N.P. = G.P. − (Cancelled×CPP) − (RTO×(CPP+Shipping))
 */

const num = (v) => { const x = parseFloat(v); return Number.isFinite(x) ? x : 0; };
const fmt = (v, dp = 0) => (Number.isFinite(v) ? v.toLocaleString('en-IN', { minimumFractionDigits: dp, maximumFractionDigits: dp }) : '—');
const pct = (v) => (Number.isFinite(v) ? `${(v * 100).toFixed(1)}%` : '—');
const iso = (d) => d.toISOString().slice(0, 10);
const today = () => iso(new Date());
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return iso(d); };

const S = {
  wrap: { display: 'flex', flexDirection: 'column', gap: 18 },
  panel: { background: 'var(--ds-color-surface)', border: '1px solid var(--ds-color-border)', borderRadius: 'var(--ds-radius-lg, 12px)', padding: 18 },
  h3: { margin: '0 0 4px', fontSize: 15, fontWeight: 700, color: 'var(--ds-color-text)' },
  hint: { margin: 0, fontSize: 12.5, color: 'var(--ds-color-text-muted)', lineHeight: 1.5 },
  row: { display: 'flex', gap: 14, flexWrap: 'wrap', alignItems: 'flex-end', marginTop: 14 },
  field: { display: 'flex', flexDirection: 'column', gap: 5 },
  label: { fontSize: 11, fontWeight: 700, letterSpacing: '0.04em', textTransform: 'uppercase', color: 'var(--ds-color-text-muted)' },
  input: { height: 34, padding: '0 10px', border: '1px solid var(--ds-color-border)', borderRadius: 8, background: 'var(--ds-color-bg)', color: 'var(--ds-color-text)', fontSize: 13, fontFamily: 'inherit' },
  btn: { height: 34, padding: '0 14px', borderRadius: 8, border: '1px solid var(--ds-color-border)', background: 'var(--ds-color-bg)', color: 'var(--ds-color-text)', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  btnDark: { height: 34, padding: '0 16px', borderRadius: 8, border: 'none', background: '#0a0a0a', color: '#fff', fontSize: 13, fontWeight: 600, cursor: 'pointer' },
  tableWrap: { overflowX: 'auto', border: '1px solid var(--ds-color-border)', borderRadius: 'var(--ds-radius-lg, 12px)' },
  table: { borderCollapse: 'collapse', fontSize: 12, minWidth: 1700, width: '100%' },
  th: { background: 'var(--ds-color-surface-soft, #f6f6f7)', color: 'var(--ds-color-text-muted)', fontSize: 10, fontWeight: 700, letterSpacing: '0.03em', textTransform: 'uppercase', padding: '10px 8px', textAlign: 'right', borderBottom: '1px solid var(--ds-color-border)', whiteSpace: 'nowrap' },
  thL: { textAlign: 'left' },
  td: { padding: '8px', textAlign: 'right', borderBottom: '1px solid var(--ds-color-border-soft, #eee)', color: 'var(--ds-color-text)', whiteSpace: 'nowrap' },
  tdL: { textAlign: 'left', fontWeight: 700 },
  totalTd: { padding: '10px 8px', textAlign: 'right', fontWeight: 800, borderTop: '2px solid var(--ds-color-border)', whiteSpace: 'nowrap' },
};
const pn = (v) => ({ color: v < 0 ? 'var(--ds-color-danger, #ef4444)' : 'var(--ds-color-text)' });

export default function AdsReporting() {
  const [from, setFrom] = useState(daysAgo(30));
  const [to, setTo] = useState(today());
  const [report, setReport] = useState({ rows: [], shipping: 90 });
  const [settings, setSettings] = useState({ shipping: 90, productCost: {} });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [spendForm, setSpendForm] = useState({ brand_id: '', date: today(), amount: '' });
  const [spendList, setSpendList] = useState([]);
  const [msg, setMsg] = useState('');
  const [spendOpen, setSpendOpen] = useState(false);

  const brands = useMemo(
    () => report.rows.map((r) => ({ id: r.brand_id, name: r.brand })),
    [report.rows]
  );

  const loadReport = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const data = await adsReportService.getReport(from, to);
      if (data?.success) setReport(data);
      else setError(data?.message || 'Failed to load report');
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'Failed to load report');
    } finally { setLoading(false); }
  }, [from, to]);

  const loadSettings = useCallback(async () => {
    try {
      const data = await adsReportService.getSettings();
      if (data?.success) setSettings({ shipping: data.shipping, productCost: data.productCost || {} });
    } catch { /* ignore */ }
  }, []);

  useEffect(() => { loadSettings(); }, [loadSettings]);
  useEffect(() => { loadReport(); }, []); // initial

  const saveSettings = async () => {
    setMsg('');
    try {
      const data = await adsReportService.saveSettings({ shipping: num(settings.shipping), productCost: settings.productCost });
      if (data?.success) { setSettings({ shipping: data.shipping, productCost: data.productCost || {} }); setMsg('Cost settings saved.'); loadReport(); }
    } catch (e) { setMsg(e?.response?.data?.message || 'Save failed'); }
  };

  const loadSpend = useCallback(async (brandId) => {
    if (!brandId) { setSpendList([]); return; }
    try {
      const data = await adsReportService.getSpend(brandId);
      if (data?.success) setSpendList(data.spend || []);
    } catch { setSpendList([]); }
  }, []);

  const onPickBrand = (brand_id) => { setSpendForm((f) => ({ ...f, brand_id })); loadSpend(brand_id); };

  const addSpend = async () => {
    if (!spendForm.brand_id || !spendForm.date) { setMsg('Pick a brand and date.'); return; }
    setMsg('');
    try {
      await adsReportService.saveSpend([{ brand_id: Number(spendForm.brand_id), date: spendForm.date, amount: num(spendForm.amount) }]);
      setSpendForm((f) => ({ ...f, amount: '' }));
      await loadSpend(spendForm.brand_id);
      await loadReport();
      setMsg('Spend saved.');
    } catch (e) { setMsg(e?.response?.data?.message || 'Save failed'); }
  };

  const removeSpend = async (id) => {
    try { await adsReportService.deleteSpend(id); await loadSpend(spendForm.brand_id); await loadReport(); } catch { /* ignore */ }
  };

  const setProductCost = (brandId, v) =>
    setSettings((s) => ({ ...s, productCost: { ...s.productCost, [brandId]: v } }));

  // Totals from returned rows.
  const totals = useMemo(() => {
    const t = report.rows.reduce((a, r) => {
      a.adSpend += num(r.adSpend); a.revenue += num(r.revenue); a.totalOrders += num(r.totalOrders);
      a.prepaid += num(r.prepaid); a.cod += num(r.cod); a.cancelled += num(r.cancelled); a.rto += num(r.rto);
      a.gp += num(r.gp); a.cancLoss += num(r.cancLoss); a.rtoLoss += num(r.rtoLoss); a.np += num(r.np);
      a.days = Math.max(a.days, num(r.days));
      return a;
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

  const HEAD = ['Brand', 'From', 'To', 'T.O.', 'Rev.', 'Ad Sp.', 'P.O.', 'C.O.', 'Canc.O', 'RTO O.', 'CPP', 'ROAS', 'A.O.V.', 'P.D.O.', 'P.O.R.', 'C.O.R.', 'G.P.', 'Canc', 'RTO', 'N.P.', 'Canc %', 'RTO %', 'A.D.', 'A.D.O.', 'A.D.R.', 'A.D.N.P.', 'O.P. %'];

  return (
    <div style={S.wrap}>
      <div>
        <h2 style={{ margin: '0 0 4px', fontSize: 20, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--ds-color-text)' }}>Ads Reporting</h2>
        <p style={S.hint}>Add daily ad spend per brand — orders, cancels, RTO and profit are calculated automatically.</p>
      </div>

      {/* Report window */}
      <div style={S.panel}>
        <h3 style={S.h3}>Report period</h3>
        <div style={S.row}>
          <div style={S.field}><label style={S.label}>From</label><input style={S.input} type="date" value={from} onChange={(e) => setFrom(e.target.value)} /></div>
          <div style={S.field}><label style={S.label}>To</label><input style={S.input} type="date" value={to} onChange={(e) => setTo(e.target.value)} /></div>
          <button style={S.btnDark} onClick={loadReport} disabled={loading}>{loading ? 'Loading…' : 'Run report'}</button>
          {error && <span style={{ ...S.hint, color: 'var(--ds-color-danger,#ef4444)' }}>{error}</span>}
        </div>
        <p style={{ ...S.hint, marginTop: 10, fontSize: 11.5 }}>Each brand&apos;s window starts on its first ad-spend day within this period.</p>
      </div>

      {/* Add daily spend — opens a modal */}
      <div style={{ ...S.panel, display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 14, flexWrap: 'wrap' }}>
        <div>
          <h3 style={S.h3}>Daily ad spend</h3>
          <p style={S.hint}>The only manual input — everything else is calculated from orders.</p>
        </div>
        <button style={S.btnDark} onClick={() => setSpendOpen(true)}>+ Add ad spend</button>
      </div>

      <Modal
        isOpen={spendOpen}
        onClose={() => { setSpendOpen(false); setMsg(''); }}
        title="Add daily ad spend"
        description="Pick a brand and enter that day's spend. Add as many days as you need."
        size="md"
      >
        <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', alignItems: 'flex-end' }}>
          <div style={S.field}>
            <label style={S.label}>Brand</label>
            <select style={{ ...S.input, minWidth: 160 }} value={spendForm.brand_id} onChange={(e) => onPickBrand(e.target.value)}>
              <option value="">Select brand</option>
              {brands.map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>
          <div style={S.field}><label style={S.label}>Date</label><input style={S.input} type="date" value={spendForm.date} onChange={(e) => setSpendForm((f) => ({ ...f, date: e.target.value }))} /></div>
          <div style={S.field}><label style={S.label}>Spend (₹)</label><input style={{ ...S.input, width: 120 }} type="number" value={spendForm.amount} onChange={(e) => setSpendForm((f) => ({ ...f, amount: e.target.value }))} /></div>
          <button style={S.btnDark} onClick={addSpend}>Save</button>
        </div>
        {msg && <p style={{ ...S.hint, marginTop: 10, color: 'var(--ds-color-success,#10b981)' }}>{msg}</p>}
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

      {/* Cost settings */}
      <div style={S.panel}>
        <h3 style={S.h3}>Cost settings</h3>
        <p style={S.hint}>Defaults: product ₹140/order (per brand), shipping ₹90/order (global). Used for G.P. / N.P.</p>
        <div style={S.row}>
          <div style={S.field}><label style={S.label}>Shipping / order (₹)</label><input style={{ ...S.input, width: 110 }} type="number" value={settings.shipping} onChange={(e) => setSettings((s) => ({ ...s, shipping: e.target.value }))} /></div>
        </div>
        <div style={{ ...S.row, marginTop: 12 }}>
          {brands.map((b) => (
            <div style={S.field} key={b.id}>
              <label style={S.label}>{b.name} — product ₹</label>
              <input style={{ ...S.input, width: 110 }} type="number"
                value={settings.productCost[b.id] ?? 140}
                onChange={(e) => setProductCost(b.id, e.target.value)} />
            </div>
          ))}
        </div>
        <div style={{ marginTop: 14 }}><button style={S.btnDark} onClick={saveSettings}>Save cost settings</button></div>
      </div>

      {/* Report table */}
      <div style={S.tableWrap}>
        <table style={S.table}>
          <thead><tr>{HEAD.map((h, i) => <th key={h} style={{ ...S.th, ...(i === 0 || i === 1 || i === 2 ? S.thL : {}) }}>{h}</th>)}</tr></thead>
          <tbody>
            {report.rows.map((r) => (
              <tr key={r.brand_id} style={{ opacity: r.hasSpend ? 1 : 0.5 }}>
                <td style={{ ...S.td, ...S.tdL }}>{r.brand}</td>
                <td style={{ ...S.td, textAlign: 'left' }}>{r.from || '—'}</td>
                <td style={{ ...S.td, textAlign: 'left' }}>{r.hasSpend ? r.to : '—'}</td>
                <td style={S.td}>{fmt(r.totalOrders)}</td>
                <td style={S.td}>{fmt(r.revenue)}</td>
                <td style={S.td}>{fmt(r.adSpend)}</td>
                <td style={S.td}>{fmt(r.prepaid)}</td>
                <td style={S.td}>{fmt(r.cod)}</td>
                <td style={S.td}>{fmt(r.cancelled)}</td>
                <td style={S.td}>{fmt(r.rto)}</td>
                <td style={S.td}>{fmt(r.cpp)}</td>
                <td style={S.td}>{Number.isFinite(r.roas) ? r.roas.toFixed(2) : '—'}</td>
                <td style={S.td}>{fmt(r.aov)}</td>
                <td style={S.td}>{fmt(r.pdo)}</td>
                <td style={S.td}>{pct(r.por)}</td>
                <td style={S.td}>{pct(r.cor)}</td>
                <td style={{ ...S.td, ...pn(r.gp) }}>{fmt(r.gp)}</td>
                <td style={S.td}>{fmt(r.cancLoss)}</td>
                <td style={S.td}>{fmt(r.rtoLoss)}</td>
                <td style={{ ...S.td, ...pn(r.np), fontWeight: 700 }}>{fmt(r.np)}</td>
                <td style={S.td}>{pct(r.cancPct)}</td>
                <td style={S.td}>{pct(r.rtoPct)}</td>
                <td style={S.td}>{fmt(r.days)}</td>
                <td style={S.td}>{Number.isFinite(r.ado) ? r.ado.toFixed(2) : '—'}</td>
                <td style={S.td}>{fmt(r.adr, 2)}</td>
                <td style={{ ...S.td, ...pn(r.adnp) }}>{fmt(r.adnp, 2)}</td>
                <td style={{ ...S.td, ...pn(r.opPct) }}>{pct(r.opPct)}</td>
              </tr>
            ))}
            {report.rows.length === 0 && !loading && (
              <tr><td style={{ ...S.td, textAlign: 'center', padding: 24 }} colSpan={HEAD.length}>No brands / data. Add ad spend above, then Run report.</td></tr>
            )}
          </tbody>
          {report.rows.length > 0 && (
            <tfoot>
              <tr>
                <td style={{ ...S.totalTd, textAlign: 'left' }}>Total</td>
                <td style={S.totalTd}></td><td style={S.totalTd}></td>
                <td style={S.totalTd}>{fmt(totals.totalOrders)}</td>
                <td style={S.totalTd}>{fmt(totals.revenue)}</td>
                <td style={S.totalTd}>{fmt(totals.adSpend)}</td>
                <td style={S.totalTd}>{fmt(totals.prepaid)}</td>
                <td style={S.totalTd}>{fmt(totals.cod)}</td>
                <td style={S.totalTd}>{fmt(totals.cancelled)}</td>
                <td style={S.totalTd}>{fmt(totals.rto)}</td>
                <td style={S.totalTd}>{fmt(totals.cpp)}</td>
                <td style={S.totalTd}>{totals.roas.toFixed(2)}</td>
                <td style={S.totalTd}>{fmt(totals.aov)}</td>
                <td style={S.totalTd}>{fmt(totals.pdo)}</td>
                <td style={S.totalTd}>{pct(totals.por)}</td>
                <td style={S.totalTd}>{pct(totals.cor)}</td>
                <td style={{ ...S.totalTd, ...pn(totals.gp) }}>{fmt(totals.gp)}</td>
                <td style={S.totalTd}>{fmt(totals.cancLoss)}</td>
                <td style={S.totalTd}>{fmt(totals.rtoLoss)}</td>
                <td style={{ ...S.totalTd, ...pn(totals.np) }}>{fmt(totals.np)}</td>
                <td style={S.totalTd}>{pct(totals.cancPct)}</td>
                <td style={S.totalTd}>{pct(totals.rtoPct)}</td>
                <td style={S.totalTd}>{fmt(totals.days)}</td>
                <td style={S.totalTd}>{totals.ado.toFixed(2)}</td>
                <td style={S.totalTd}>{fmt(totals.adr, 2)}</td>
                <td style={{ ...S.totalTd, ...pn(totals.adnp) }}>{fmt(totals.adnp, 2)}</td>
                <td style={{ ...S.totalTd, ...pn(totals.opPct) }}>{pct(totals.opPct)}</td>
              </tr>
            </tfoot>
          )}
        </table>
      </div>
    </div>
  );
}
