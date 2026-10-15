import { useState, useEffect, useMemo, useCallback } from 'react';
import { abandonedCartService } from '../../../services';
import { PageHeader, StatGrid, StatTile, FilterBar, Panel, ResponsiveTable } from '../../../components/Dashboard/primitives';
import { Badge, Select } from '../../../components/ui';

/**
 * Abandoned carts — checkouts captured at the delivery/payment step that didn't
 * convert. The backend sends a WhatsApp recovery (CART10) a few minutes after
 * capture; this view shows what was captured, what got messaged, and how many
 * recovered (completed an order). Built on the shared dashboard primitives so it
 * matches the rest of the admin (same PageHeader / StatGrid / FilterBar / table).
 */
const fmtDate = (s) => {
  if (!s) return '—';
  try { return new Date(s).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' }); }
  catch { return s; }
};
const inr = (n) => `₹${Number(n || 0).toLocaleString('en-IN')}`;
const mono = { fontVariantNumeric: 'tabular-nums', fontFamily: 'var(--ds-font-mono, ui-monospace, monospace)' };

const STATUS = {
  recovered: { label: 'Recovered', variant: 'success' },
  messaged:  { label: 'Messaged',  variant: 'info' },
  pending:   { label: 'Pending',   variant: 'warning' },
};
const statusMeta = (st) => STATUS[st] || STATUS.pending;

const STATUS_OPTIONS = [
  { value: '', label: 'All statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'messaged', label: 'Messaged' },
  { value: 'recovered', label: 'Recovered' },
];

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

  const columns = [
    { key: 'status', label: 'Status', render: (r) => <Badge variant={statusMeta(r.status).variant}>{statusMeta(r.status).label}</Badge> },
    { key: 'brand', label: 'Brand', render: (r) => r.brand || '—' },
    { key: 'name', label: 'Customer', render: (r) => r.name || '—' },
    { key: 'phone', label: 'Phone', render: (r) => <span style={mono}>{r.phone || '—'}</span> },
    { key: 'cart', label: 'Cart', render: (r) => <span style={{ color: 'var(--ds-color-text-muted)' }}>{r.cart || '—'}</span> },
    { key: 'itemCount', label: 'Items', render: (r) => <span style={mono}>{r.itemCount ?? '—'}</span> },
    { key: 'value', label: 'Value', render: (r) => <strong style={mono}>{inr(r.value)}</strong> },
    { key: 'createdAt', label: 'Captured', render: (r) => <span style={{ color: 'var(--ds-color-text-muted)' }}>{fmtDate(r.createdAt)}</span> },
    { key: 'updatedAt', label: 'Updated', render: (r) => <span style={{ color: 'var(--ds-color-text-muted)' }}>{fmtDate(r.updatedAt)}</span> },
  ];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <PageHeader
        title="Abandoned carts"
        subtitle="Checkouts captured at the delivery/payment step. A WhatsApp recovery (code CART10) is sent immediately on capture (with a 5-min backstop); carts convert to “Recovered” when the shopper completes an order."
        actions={<button className="ds-btn" onClick={load} disabled={loading}>{loading ? 'Refreshing…' : 'Refresh'}</button>}
      />

      <StatGrid>
        <StatTile label="Total captured" value={stats.total ?? 0} />
        <StatTile label="Pending" value={stats.pending ?? 0} tone="warn" />
        <StatTile label="Messaged" value={stats.messaged ?? 0} tone="info" />
        <StatTile label="Recovered" value={stats.recovered ?? 0} tone="good" />
        <StatTile label="Recovered rate" value={`${stats.recoveredRate || 0}%`} tone="good" />
      </StatGrid>

      <FilterBar search={q} onSearchChange={setQ} placeholder="Search name / phone / brand / item">
        <Select value={status} onChange={(v) => setStatus(v || '')} options={STATUS_OPTIONS} placeholder="All statuses" />
      </FilterBar>

      {error && <p style={{ margin: 0, fontSize: 13, color: 'var(--ds-color-danger, #dc2626)' }}>{error}</p>}

      <Panel flush>
        <ResponsiveTable
          columns={columns}
          data={filtered}
          rowKey="id"
          emptyMessage={loading ? 'Loading abandoned carts…' : 'No abandoned carts captured yet.'}
        />
      </Panel>
    </div>
  );
}
