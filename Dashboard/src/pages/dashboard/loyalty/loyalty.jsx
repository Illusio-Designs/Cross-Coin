import { useState, useEffect, useCallback } from 'react';
import { loyaltyService } from '../../../services';
import { Button } from '../../../components/ui';

/** Loyalty — points transactions (earned / redeemed / expired / adjusted / refunded). */
const fmtDate = (s) => {
  if (!s) return '—';
  try { return new Date(s).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return s; }
};
const TYPE_COLORS = {
  earned: ['var(--ds-color-success,#16a34a)', 'var(--ds-color-success-bg,#dcfce7)'],
  redeemed: ['var(--ds-color-info,#2563eb)', 'var(--ds-color-info-bg,#dbeafe)'],
  refunded: ['var(--ds-color-warn,#d97706)', 'var(--ds-color-warn-bg,#fef3c7)'],
  expired: ['var(--ds-color-danger,#dc2626)', 'var(--ds-color-danger-bg,#fee2e2)'],
  adjusted: ['var(--ds-color-text-muted)', 'var(--ds-color-surface-soft,#f1f1f1)'],
};

const S = {
  wrap: { display: 'flex', flexDirection: 'column', gap: 16 },
  head: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' },
  title: { margin: 0, fontSize: 21, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--ds-color-text)' },
  sub: { margin: '3px 0 0', fontSize: 12.5, color: 'var(--ds-color-text-muted)' },
  tableWrap: { overflowX: 'auto', border: '1px solid var(--ds-color-border)', borderRadius: 16 },
  table: { borderCollapse: 'collapse', width: '100%', minWidth: 820, fontSize: 13 },
  th: { background: 'var(--ds-color-surface-soft, #f6f6f7)', color: 'var(--ds-color-text-muted)', fontSize: 10.5, letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 700, textAlign: 'left', padding: '12px 14px', whiteSpace: 'nowrap', borderBottom: '1px solid var(--ds-color-border)' },
  td: { padding: '12px 14px', textAlign: 'left', whiteSpace: 'nowrap', borderBottom: '1px solid var(--ds-color-border-soft, #eee)', color: 'var(--ds-color-text)' },
  mono: { fontFamily: 'var(--ds-font-mono, monospace)', fontVariantNumeric: 'tabular-nums' },
  badge: { display: 'inline-flex', alignItems: 'center', fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20, textTransform: 'capitalize' },
  hint: { fontSize: 12.5, color: 'var(--ds-color-text-muted)' },
  pager: { display: 'flex', alignItems: 'center', gap: 12, justifyContent: 'flex-end' },
};

export default function Loyalty() {
  const [data, setData] = useState({ transactions: [], total: 0, page: 1, totalPages: 1 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const load = useCallback(async (p) => {
    setLoading(true); setError('');
    try {
      const d = await loyaltyService.getTransactions(p, 50);
      if (d?.success) setData(d.data); else setError(d?.message || 'Failed to load');
    } catch (e) { setError(e?.response?.data?.message || e.message || 'Failed to load'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(page); }, [page, load]);

  const txns = data.transactions || [];

  return (
    <div style={S.wrap}>
      <div style={S.head}>
        <div>
          <h2 style={S.title}>Loyalty</h2>
          <p style={S.sub}>Points earned, redeemed, expired and adjusted across customers.</p>
        </div>
        <Button variant="secondary" onClick={() => load(page)} loading={loading}>Refresh</Button>
      </div>

      {error && <p style={{ ...S.hint, color: 'var(--ds-color-danger,#dc2626)' }}>{error}</p>}

      <div style={S.tableWrap}>
        <table style={S.table}>
          <thead><tr>
            <th style={S.th}>Customer</th><th style={S.th}>Type</th><th style={{ ...S.th, textAlign: 'right' }}>Points</th>
            <th style={{ ...S.th, textAlign: 'right' }}>Balance</th><th style={S.th}>Description</th><th style={S.th}>Order</th><th style={S.th}>Date</th>
          </tr></thead>
          <tbody>
            {txns.map((t) => {
              const [fg, bg] = TYPE_COLORS[t.type] || TYPE_COLORS.adjusted;
              const pts = Number(t.points) || 0;
              const positive = ['earned', 'refunded', 'adjusted'].includes(t.type) && pts >= 0;
              return (
                <tr key={t.id}>
                  <td style={S.td}>{t.User?.username || t.User?.email || `User #${t.user_id}`}</td>
                  <td style={S.td}><span style={{ ...S.badge, color: fg, background: bg }}>{t.type}</span></td>
                  <td style={{ ...S.td, ...S.mono, textAlign: 'right', fontWeight: 700, color: positive ? 'var(--ds-color-success,#16a34a)' : 'var(--ds-color-text)' }}>{positive ? '+' : ''}{fmtNum(pts)}</td>
                  <td style={{ ...S.td, ...S.mono, textAlign: 'right' }}>{fmtNum(t.balance_after)}</td>
                  <td style={{ ...S.td, whiteSpace: 'normal', maxWidth: 280, color: 'var(--ds-color-text-muted)' }}>{t.description || '—'}</td>
                  <td style={{ ...S.td, ...S.mono }}>{t.order_id ? `#${t.order_id}` : '—'}</td>
                  <td style={{ ...S.td, color: 'var(--ds-color-text-muted)' }}>{fmtDate(t.created_at)}</td>
                </tr>
              );
            })}
            {!txns.length && !loading && (
              <tr><td style={{ ...S.td, textAlign: 'center', padding: 28, color: 'var(--ds-color-text-muted)' }} colSpan={7}>No loyalty transactions yet.</td></tr>
            )}
          </tbody>
        </table>
      </div>

      <div style={S.pager}>
        <span style={S.hint}>{data.total} total · page {data.page} of {data.totalPages}</span>
        <Button variant="secondary" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1 || loading}>Prev</Button>
        <Button variant="secondary" onClick={() => setPage((p) => (p < data.totalPages ? p + 1 : p))} disabled={page >= data.totalPages || loading}>Next</Button>
      </div>
    </div>
  );
}

function fmtNum(v) { const n = Number(v); return Number.isFinite(n) ? n.toLocaleString('en-IN') : '—'; }
