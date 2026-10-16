import { useState, useEffect, useMemo, useCallback } from 'react';
import { leadService } from '../../../services';
import { PageHeader, FilterBar, Panel, ResponsiveTable } from '../../../components/Dashboard/primitives';
import { Badge, Button, Select } from '../../../components/ui';

/**
 * Leads & grievances — popup phone leads + contact-form messages
 * (lead_captures + contact_messages), unified. Contact messages flagged as
 * DPDP grievances can be triaged here (open → in progress → resolved).
 * Built on the shared dashboard primitives so it matches the rest of the admin.
 */
const fmtDate = (s) => {
  if (!s) return '—';
  try { return new Date(s).toLocaleString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }); }
  catch { return s; }
};
const daysSince = (s) => {
  try { return Math.floor((Date.now() - new Date(s).getTime()) / 86400000); } catch { return null; }
};

const S = {
  wrap: { display: 'flex', flexDirection: 'column', gap: 16 },
  count: { fontSize: 12, fontWeight: 700, color: 'var(--ds-color-text-muted)', fontFamily: 'var(--ds-font-mono, monospace)' },
  mono: { fontFamily: 'var(--ds-font-mono, monospace)', fontVariantNumeric: 'tabular-nums' },
  msg: { whiteSpace: 'normal', maxWidth: 320, color: 'var(--ds-color-text-muted)', lineHeight: 1.45 },
  select: { fontSize: 12, fontWeight: 700, padding: '5px 8px', borderRadius: 8, border: '1px solid var(--ds-color-border)', background: 'var(--ds-color-surface, #fff)', color: 'var(--ds-color-text)' },
  hint: { fontSize: 12.5, color: 'var(--ds-color-text-muted)' },
};
const typeLabel = (l) => (l.kind === 'grievance' ? 'Grievance' : l.type === 'contact' ? 'Contact' : 'Popup');
const typeVariant = (l) => (l.kind === 'grievance' ? 'danger' : l.type === 'contact' ? 'info' : 'default');
const statusColor = (st) => st === 'resolved'
  ? 'var(--ds-color-success,#16a34a)'
  : st === 'in_progress' ? 'var(--ds-color-warning,#d97706)' : 'var(--ds-color-text-muted)';

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [typeFilter, setTypeFilter] = useState('all');     // all | popup | contact | grievance
  const [statusFilter, setStatusFilter] = useState('all'); // all | open | in_progress | resolved
  const [savingId, setSavingId] = useState(null);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const d = await leadService.getLeads();
      if (d?.success) setLeads(d.leads || []); else setError(d?.message || 'Failed to load leads');
    } catch (e) { setError(e?.response?.data?.message || e.message || 'Failed to load leads'); }
    finally { setLoading(false); }
  }, []);
  useEffect(() => { load(); }, [load]);

  const grievanceCount = useMemo(() => leads.filter((l) => l.kind === 'grievance' && l.status !== 'resolved').length, [leads]);

  const filtered = useMemo(() => {
    const s = q.trim().toLowerCase();
    let rows = leads;
    if (typeFilter !== 'all') {
      rows = rows.filter((l) => {
        const kind = l.kind === 'grievance' ? 'grievance' : l.type === 'contact' ? 'contact' : 'popup';
        return kind === typeFilter;
      });
    }
    if (statusFilter !== 'all') rows = rows.filter((l) => (l.status || 'open') === statusFilter);
    if (s) rows = rows.filter((l) => `${l.name || ''} ${l.phone || ''} ${l.email || ''} ${l.brand || ''} ${l.message || ''} ${l.type}`.toLowerCase().includes(s));
    return rows;
  }, [leads, q, typeFilter, statusFilter]);

  const isFiltered = q || typeFilter !== 'all' || statusFilter !== 'all';

  const setStatus = async (l, status) => {
    if (!l.contactId) return;
    setSavingId(l.id);
    // Optimistic update.
    setLeads((prev) => prev.map((x) => (x.id === l.id ? { ...x, status, resolvedAt: status === 'resolved' ? new Date().toISOString() : null } : x)));
    try {
      await leadService.updateContactStatus(l.contactId, { status });
    } catch (e) {
      setError(e?.response?.data?.message || e.message || 'Failed to update status');
      load();
    } finally { setSavingId(null); }
  };

  const exportCsv = () => {
    const rows = [['Type', 'Status', 'Name', 'Phone', 'Email', 'Brand', 'Message', 'Captured at']];
    filtered.forEach((l) => rows.push([typeLabel(l), l.status || '', l.name || '', l.phone || '', l.email || '', l.brand || '', (l.message || '').replace(/\n/g, ' '), fmtDate(l.createdAt)]));
    const csv = rows.map((r) => r.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob); a.download = 'leads.csv'; a.click();
    URL.revokeObjectURL(a.href);
  };

  const columns = [
    { key: 'type', label: 'Type', render: (l) => <Badge variant={typeVariant(l)}>{typeLabel(l)}</Badge> },
    {
      key: 'status', label: 'Status', render: (l) => {
        const age = daysSince(l.createdAt);
        return l.type === 'contact' ? (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <Select
              options={[
                { value: 'open', label: 'Open' },
                { value: 'in_progress', label: 'In progress' },
                { value: 'resolved', label: 'Resolved' },
              ]}
              value={l.status || 'open'}
              disabled={savingId === l.id}
              onChange={(v) => setStatus(l, v)}
            />
            {l.kind === 'grievance' && l.status !== 'resolved' && age != null && (
              <span style={{ fontSize: 10.5, color: age >= 7 ? 'var(--ds-color-danger,#dc2626)' : 'var(--ds-color-text-muted)' }}>{age}d open</span>
            )}
          </div>
        ) : '—';
      },
    },
    { key: 'name', label: 'Name', render: (l) => l.name || '—' },
    { key: 'phone', label: 'Phone', cellStyle: { ...S.mono, fontWeight: 700 }, render: (l) => l.phone || '—' },
    { key: 'email', label: 'Email', render: (l) => l.email || '—' },
    { key: 'brand', label: 'Brand', render: (l) => l.brand || '—' },
    { key: 'message', label: 'Message', cellStyle: S.msg, render: (l) => l.message || '—' },
    { key: 'createdAt', label: 'Captured', cellStyle: { color: 'var(--ds-color-text-muted)' }, render: (l) => fmtDate(l.createdAt) },
  ];

  return (
    <div style={S.wrap}>
      <PageHeader
        title="Leads & grievances"
        subtitle={`Popup phone leads, contact-form messages, and DPDP grievance requests.${grievanceCount > 0 ? ` ${grievanceCount} open grievance${grievanceCount === 1 ? '' : 's'}.` : ''}`}
        actions={(
          <>
            <Button variant="secondary" onClick={load} loading={loading}>Refresh</Button>
            <Button variant="primary" onClick={exportCsv} disabled={!filtered.length}>Export CSV</Button>
          </>
        )}
      />

      <Panel style={{ marginBottom: 16 }}>
      <FilterBar search={q} onSearchChange={setQ} placeholder="Search name / phone / email / message">
        <Select
          options={[
            { value: 'all', label: 'All types' },
            { value: 'popup', label: 'Popup leads' },
            { value: 'contact', label: 'Contact' },
            { value: 'grievance', label: `Grievances${grievanceCount ? ` (${grievanceCount})` : ''}` },
          ]}
          value={typeFilter}
          onChange={setTypeFilter}
          placeholder="All types"
        />
        <Select
          options={[
            { value: 'all', label: 'All statuses' },
            { value: 'open', label: 'Open' },
            { value: 'in_progress', label: 'In progress' },
            { value: 'resolved', label: 'Resolved' },
          ]}
          value={statusFilter}
          onChange={setStatusFilter}
          placeholder="All statuses"
        />
      </FilterBar>
      </Panel>

      {error && <p style={{ ...S.hint, color: 'var(--ds-color-danger,#dc2626)' }}>{error}</p>}
      <div style={S.count}>{filtered.length} {filtered.length === 1 ? 'row' : 'rows'}{isFiltered && ` (of ${leads.length})`}</div>

      <Panel flush>
        <ResponsiveTable
          columns={columns}
          data={filtered}
          rowKey="id"
          emptyMessage={loading ? 'Loading leads…' : 'No rows.'}
        />
      </Panel>
    </div>
  );
}
