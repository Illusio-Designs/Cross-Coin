import { useState, useEffect, useCallback } from 'react';
import { loyaltyService } from '../../../services';
import { Button, Modal, Input, Badge } from '../../../components/ui';
import { PageHeader, Panel, ResponsiveTable } from '../../../components/Dashboard/primitives';
import { showSuccess, showError } from '../../../utils/toastNotification';

/** Loyalty — points transactions (earned / redeemed / expired / adjusted / refunded). */
const fmtDate = (s) => {
  if (!s) return '—';
  try { return new Date(s).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return s; }
};
const TYPE_VARIANT = {
  earned: 'success',
  redeemed: 'info',
  refunded: 'warning',
  expired: 'danger',
  adjusted: 'default',
};

const S = {
  wrap: { display: 'flex', flexDirection: 'column', gap: 16 },
  mono: { fontFamily: 'var(--ds-font-mono, monospace)', fontVariantNumeric: 'tabular-nums' },
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

  // ── Adjust points (admin add/deduct) ──
  const [adjustOpen, setAdjustOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ userId: '', points: '', description: '' });

  const openAdjust = (userId = '') => {
    setForm({ userId: String(userId || ''), points: '', description: '' });
    setAdjustOpen(true);
  };

  const submitAdjust = async () => {
    const pts = Number(form.points);
    if (!form.userId || String(form.points).trim() === '') { showError('fieldRequired', 'Enter a customer ID and points.'); return; }
    if (!Number.isFinite(pts) || pts === 0) { showError('fieldRequired', 'Points must be a non-zero number (use a minus sign to deduct).'); return; }
    setSaving(true);
    try {
      const d = await loyaltyService.adjustPoints({ userId: form.userId, points: pts, description: form.description });
      if (d?.success) {
        showSuccess('saved', `Points adjusted: ${pts > 0 ? '+' : ''}${pts} for customer #${form.userId}.`);
        setAdjustOpen(false);
        load(page);
      } else showError('saveFailed', d?.message || 'Failed to adjust points');
    } catch (e) {
      showError('saveFailed', e?.response?.data?.message || e.message || 'Failed to adjust points');
    } finally { setSaving(false); }
  };

  const txns = data.transactions || [];

  const columns = [
    { key: 'customer', label: 'Customer', render: (t) => (
      <button type="button" onClick={() => openAdjust(t.user_id)} title="Adjust this customer's points"
        style={{ background: 'none', border: 'none', padding: 0, cursor: 'pointer', color: 'var(--ds-color-text)', font: 'inherit', textDecoration: 'underline dotted', textUnderlineOffset: 3 }}>
        {t.User?.username || t.User?.email || `User #${t.user_id}`}
      </button>
    ) },
    { key: 'type', label: 'Type', render: (t) => <Badge variant={TYPE_VARIANT[t.type] || 'default'} style={{ textTransform: 'capitalize' }}>{t.type}</Badge> },
    { key: 'points', label: 'Points', headerStyle: { textAlign: 'right' }, cellStyle: { textAlign: 'right' }, render: (t) => {
      const pts = Number(t.points) || 0;
      const positive = ['earned', 'refunded', 'adjusted'].includes(t.type) && pts >= 0;
      return <span style={{ ...S.mono, fontWeight: 700, color: positive ? 'var(--ds-color-success,#16a34a)' : 'var(--ds-color-text)' }}>{positive ? '+' : ''}{fmtNum(pts)}</span>;
    } },
    { key: 'balance', label: 'Balance', headerStyle: { textAlign: 'right' }, cellStyle: { textAlign: 'right', ...S.mono }, render: (t) => fmtNum(t.balance_after) },
    { key: 'description', label: 'Description', cellStyle: { whiteSpace: 'normal', maxWidth: 280, color: 'var(--ds-color-text-muted)' }, render: (t) => t.description || '—' },
    { key: 'order', label: 'Order', cellStyle: S.mono, render: (t) => (t.order_id ? `#${t.order_id}` : '—') },
    { key: 'date', label: 'Date', cellStyle: { color: 'var(--ds-color-text-muted)' }, render: (t) => fmtDate(t.created_at) },
  ];

  return (
    <div style={S.wrap}>
      <PageHeader
        title="Loyalty"
        subtitle="Points earned, redeemed, expired and adjusted across customers."
        actions={
          <>
            <Button variant="secondary" onClick={() => load(page)} loading={loading}>Refresh</Button>
            <Button variant="primary" onClick={() => openAdjust()}>Adjust points</Button>
          </>
        }
      />

      {error && <p style={{ ...S.hint, color: 'var(--ds-color-danger,#dc2626)' }}>{error}</p>}

      <Panel flush>
        <ResponsiveTable
          columns={columns}
          data={txns}
          rowKey="id"
          emptyMessage={loading ? 'Loading…' : 'No loyalty transactions yet.'}
        />
      </Panel>

      <div style={S.pager}>
        <span style={S.hint}>{data.total} total · page {data.page} of {data.totalPages}</span>
        <Button variant="secondary" onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1 || loading}>Prev</Button>
        <Button variant="secondary" onClick={() => setPage((p) => (p < data.totalPages ? p + 1 : p))} disabled={page >= data.totalPages || loading}>Next</Button>
      </div>

      <Modal isOpen={adjustOpen} onClose={() => setAdjustOpen(false)} title="Adjust loyalty points"
        description="Add or deduct a customer's points. Use a minus sign to deduct (e.g. -100). Tip: click a customer in the list to pre-fill their ID."
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setAdjustOpen(false)}>Cancel</Button>
            <Button variant="primary" onClick={submitAdjust} loading={saving}>Save adjustment</Button>
          </>
        }>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <Input label="Customer ID" type="number" value={form.userId}
            onChange={(e) => setForm((f) => ({ ...f, userId: e.target.value }))} placeholder="e.g. 42" />
          <Input label="Points (+ add / − deduct)" type="number" value={form.points}
            onChange={(e) => setForm((f) => ({ ...f, points: e.target.value }))} placeholder="e.g. 100 or -50" />
          <Input label="Reason (shown in history)" value={form.description}
            onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} placeholder="e.g. Goodwill credit" />
        </div>
      </Modal>
    </div>
  );
}

function fmtNum(v) { const n = Number(v); return Number.isFinite(n) ? n.toLocaleString('en-IN') : '—'; }
