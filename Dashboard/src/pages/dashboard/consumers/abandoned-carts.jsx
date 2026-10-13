import { useState, useEffect, useMemo, useCallback } from 'react';
import { abandonedCartService } from '../../../services';
import { Button, Input } from '../../../components/ui';

/**
 * Abandoned carts — checkouts captured at the delivery/payment step that didn't
 * convert. The backend sends a WhatsApp recovery (SAVE10) a few minutes after
 * capture; this view shows what was captured, what got messaged, and how many
 * recovered (completed an order).
 */
const fmtDate = (s) => {
  if (!s) return '—';
  try { return new Date(s).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); }
  catch { return s; }
};
const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;

const S = {
  wrap: { display: 'flex', flexDirection: 'column', gap: 16 },
  head: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' },
  title: { margin: 0, fontSize: 21, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--ds-color-text)' },
  sub: { margin: '3px 0 0', fontSize: 12.5, color: 'var(--ds-color-text-muted)' },
  controls: { display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' },
  stats: { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: 12 },
  card: { border: '1px solid var(--ds-color-border)', borderRadius: 14, padding: '14px 16px', background: 'var(--ds-color-surface, #fff)', display: 'flex', flexDirection: 'column', gap: 4 },
  cardLabel: { fontSize: 10.5, letterSpacing: '0.05em', textTransform: 'uppercase', fontWeight: 700, color: 'var(--ds-color-text-muted)' },
  cardValue: { fontSize: 24, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--ds-color-text)', fontVariantNumeric: 'tabular-nums' },
  count: { fontSize: 12, fontWeight: 700, color: 'var(--ds-color-text-muted)', fontFamily: 'var(--ds-font-mono, monospace)' },
  tableWrap: { overflowX: 'auto', border: '1px solid var(--ds-color-border)', borderRadius: 16 },
  table: { borderCollapse: 'collapse', width: '100%', minWidth: 960, fontSize: 13 },
  th: { background: 'var(--ds-color-surface-soft, #f6f6f7)', color: 'var(--ds-color-text-muted)', fontSize: 10.5, letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 700, textAlign: 'left', padding: '12px 14px', whiteSpace: 'nowrap', borderBottom: '1px solid var(--ds-color-border)' },
  td: { padding: '12px 14px', textAlign: 'left', whiteSpace: 'nowrap', borderBottom: '1px solid var(--ds-color-border-soft, #eee)', color: 'var(--ds-color-text)', verticalAlign: 'top' },
  mono: { fontFamily: 'var(--ds-font-mono, monospace)', fontVariantNumeric: 'tabular-nums' },
  cart: { whiteSpace: 'normal', maxWidth: 260, color: 'var(--ds-color-text-muted)', lineHeight: 1.45 },
  badge: { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 },
  select: { fontSize: 12.5, fontWeight: 700, padding: '8px 10px', borderRadius: 8, border: '1px solid var(--ds-color-border)', background: 'var(--ds-color-surface, #fff)', color: 'var(--ds-color-text)' },
  hint: { fontSize: 12.5, color: 'var(--ds-color-text-muted)' },
};
const statusBadge = (st) => {
  if (st === 'recovered') return { ...S.badge, color: 'var(--ds-color-success,#16a34a)', background: 'var(--ds-color-success-bg,#dcfce7)' };
  if (st === 'messaged') return { ...S.badge, color: 'var(--ds-color-info,#2563eb)', background: 'var(--ds-color-info-bg,#dbeafe)' };
  return { ...S.badge, color: 'var(--ds-color-warning,#d97706)', background: 'var(--ds-color-warning-bg,#fef3c7)' };
};
const statusLabel = (st) => (st === 'recovered' ? 'Recovered' : st === 'messaged' ? 'Messaged' : 'Pending');

export default function AbandonedCarts() {
  const [carts, setCarts] = useState([]);
  const [stats, setStats] = useState({ total: 0, pending: 0, messaged: 0, recovered: 0, recoveredRate: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [status, setStatus] = useState('');

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const d = await abandonedCartService.list(status ? { status } : {});
      if (d?.success) { setCarts(d.carts || []); setStats(d.stats || {}); }
      else setError(d?.message || 'Failed to load abandoned carts');
    } catch (e) { setError(e?.message || 'Failed to load abandoned carts'); }
    finally { setLoading(false); }
  }, [status]);
  useEffect(() => { load(); }, [load]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    if (!s) return carts;
    return carts.filter((c) => `${c.name || ''} ${c.phone || ''} ${c.brand || ''} ${c.cart || ''}`.toLowerCase().includes(s));
  }, [carts, q]);

  const STAT_CARDS = [
    { label: 'Total captured', value: stats.total },
    { label: 'Pending', value: stats.pending },
    { label: 'Messaged', value: stats.messaged },
    { label: 'Recovered', value: stats.recovered },
    { label: 'Recovered rate', value: `${stats.recoveredRate || 0}%` },
  ];

  return (
    <div style={S.wrap}>
      <div style={S.head}>
        <div>
          <h2 style={S.title}>Abandoned carts</h2>
          <p style={S.sub}>Checkouts captured at the delivery/payment step. A WhatsApp recovery (code SAVE10) is sent a few minutes after capture; carts convert to “Recovered” when the shopper completes an order.</p>
        </div>
        <div style={S.controls}>
          <Input placeholder="Search name / phone / brand / item" value={q} onChange={(e) => setQ(e.target.value)} />
          <select style={S.select} value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            <option value="pending">Pending</option>
            <option value="messaged">Messaged</option>
            <option value="recovered">Recovered</option>
          </select>
          <Button variant="secondary" onClick={load} loading={loading}>Refresh</Button>
        </div>
      </div>

      <div style={S.stats}>
        {STAT_CARDS.map((c) => (
          <div style={S.card} key={c.label}>
            <span style={S.cardLabel}>{c.label}</span>
            <span style={S.cardValue}>{c.value}</span>
          </div>
        ))}
      </div>

      {error && <p style={{ ...S.hint, color: 'var(--ds-color-danger,#dc2626)' }}>{error}</p>}
      <div style={S.count}>{filtered.length} {filtered.length === 1 ? 'row' : 'rows'}{q && ` (of ${carts.length})`}</div>

      <div style={S.tableWrap}>
        <table style={S.table}>
          <thead><tr>
            <th style={S.th}>Status</th><th style={S.th}>Brand</th><th style={S.th}>Name</th><th style={S.th}>Phone</th>
            <th style={S.th}>Cart</th><th style={S.th}>Items</th><th style={S.th}>Value</th>
            <th style={S.th}>Captured</th><th style={S.th}>Updated</th>
          </tr></thead>
          <tbody>
            {filtered.map((c) => (
              <tr key={c.id}>
                <td style={S.td}><span style={statusBadge(c.status)}>{statusLabel(c.status)}</span></td>
                <td style={S.td}>{c.brand || '—'}</td>
                <td style={S.td}>{c.name || '—'}</td>
                <td style={{ ...S.td, ...S.mono }}>{c.phone || '—'}</td>
                <td style={{ ...S.td, ...S.cart }}>{c.cart || '—'}</td>
                <td style={{ ...S.td, ...S.mono, textAlign: 'center' }}>{c.itemCount ?? '—'}</td>
                <td style={{ ...S.td, ...S.mono, fontWeight: 700 }}>{inr(c.value)}</td>
                <td style={{ ...S.td, color: 'var(--ds-color-text-muted)' }}>{fmtDate(c.createdAt)}</td>
                <td style={{ ...S.td, color: 'var(--ds-color-text-muted)' }}>{fmtDate(c.updatedAt)}</td>
              </tr>
            ))}
            {!filtered.length && !loading && (
              <tr><td style={{ ...S.td, textAlign: 'center', padding: 28, color: 'var(--ds-color-text-muted)' }} colSpan={9}>No abandoned carts captured yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
