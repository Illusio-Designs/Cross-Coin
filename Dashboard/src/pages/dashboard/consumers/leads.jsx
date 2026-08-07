import { useState, useEffect, useMemo, useCallback } from 'react';
import { leadService } from '../../../services';
import { Button, Input } from '../../../components/ui';

/**
 * Leads — phone numbers captured by the storefront popup (lead_captures).
 * Read-only list + search + CSV export.
 */
const fmtDate = (s) => {
  if (!s) return '—';
  try { const d = new Date(s); return d.toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return s; }
};

const S = {
  wrap: { display: 'flex', flexDirection: 'column', gap: 16 },
  head: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' },
  title: { margin: 0, fontSize: 21, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--ds-color-text)' },
  sub: { margin: '3px 0 0', fontSize: 12.5, color: 'var(--ds-color-text-muted)' },
  controls: { display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' },
  count: { fontSize: 12, fontWeight: 700, color: 'var(--ds-color-text-muted)', fontFamily: 'var(--ds-font-mono, monospace)' },
  tableWrap: { overflowX: 'auto', border: '1px solid var(--ds-color-border)', borderRadius: 16 },
  table: { borderCollapse: 'collapse', width: '100%', minWidth: 720, fontSize: 13 },
  th: { background: 'var(--ds-color-surface-soft, #f6f6f7)', color: 'var(--ds-color-text-muted)', fontSize: 10.5, letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 700, textAlign: 'left', padding: '12px 14px', whiteSpace: 'nowrap', borderBottom: '1px solid var(--ds-color-border)' },
  td: { padding: '12px 14px', textAlign: 'left', whiteSpace: 'nowrap', borderBottom: '1px solid var(--ds-color-border-soft, #eee)', color: 'var(--ds-color-text)' },
  mono: { fontFamily: 'var(--ds-font-mono, monospace)', fontVariantNumeric: 'tabular-nums' },
  badge: { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, padding: '3px 9px', borderRadius: 20 },
  hint: { fontSize: 12.5, color: 'var(--ds-color-text-muted)' },
};

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const d = await leadService.getLeads();
      if (d?.success) setLeads(d.leads || []); else setError(d?.message || 'Failed to load leads');
    } catch (e) { setError(e?.response?.data?.message || e.message || 'Failed to load leads'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return leads;
    return leads.filter((l) => `${l.phone} ${l.brand} ${l.coupon_code || ''} ${l.source || ''}`.toLowerCase().includes(s));
  }, [leads, q]);

  const exportCsv = () => {
    const rows = [['Phone', 'Brand', 'Coupon', 'Source', 'WhatsApp sent', 'Captured at']];
    filtered.forEach((l) => rows.push([l.phone, l.brand, l.coupon_code || '', l.source || '', l.wa_sent ? 'Yes' : 'No', fmtDate(l.createdAt)]));
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'leads.csv'; a.click();
    URL.revokeObjectURL(a.href);
  };

  return (
    <div style={S.wrap}>
      <div style={S.head}>
        <div>
          <h2 style={S.title}>Leads</h2>
          <p style={S.sub}>Phone numbers captured by the storefront popup, with the coupon sent.</p>
        </div>
        <div style={S.controls}>
          <Input placeholder="Search phone / brand / coupon" value={q} onChange={(e) => setQ(e.target.value)} />
          <Button variant="secondary" onClick={load} loading={loading}>Refresh</Button>
          <Button variant="primary" onClick={exportCsv} disabled={!filtered.length}>Export CSV</Button>
        </div>
      </div>

      {error && <p style={{ ...S.hint, color: 'var(--ds-color-danger,#dc2626)' }}>{error}</p>}
      <div style={S.count}>{filtered.length} {filtered.length === 1 ? 'lead' : 'leads'}{q && ` (of ${leads.length})`}</div>

      <div style={S.tableWrap}>
        <table style={S.table}>
          <thead><tr>
            <th style={S.th}>Phone</th><th style={S.th}>Brand</th><th style={S.th}>Coupon</th>
            <th style={S.th}>Source</th><th style={S.th}>WhatsApp</th><th style={S.th}>Captured</th>
          </tr></thead>
          <tbody>
            {filtered.map((l) => (
              <tr key={l.id}>
                <td style={{ ...S.td, ...S.mono, fontWeight: 700 }}>{l.phone}</td>
                <td style={S.td}>{l.brand}</td>
                <td style={{ ...S.td, ...S.mono }}>{l.coupon_code || '—'}</td>
                <td style={S.td}>{l.source || '—'}</td>
                <td style={S.td}>
                  <span style={{ ...S.badge, color: l.wa_sent ? 'var(--ds-color-success,#16a34a)' : 'var(--ds-color-text-muted)', background: l.wa_sent ? 'var(--ds-color-success-bg, #dcfce7)' : 'var(--ds-color-surface-soft,#f1f1f1)' }}>
                    {l.wa_sent ? 'Sent' : 'Not sent'}
                  </span>
                </td>
                <td style={{ ...S.td, color: 'var(--ds-color-text-muted)' }}>{fmtDate(l.createdAt)}</td>
              </tr>
            ))}
            {!filtered.length && !loading && (
              <tr><td style={{ ...S.td, textAlign: 'center', padding: 28, color: 'var(--ds-color-text-muted)' }} colSpan={6}>No leads yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
