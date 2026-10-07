import { useState, useEffect, useMemo, useCallback } from 'react';
import { leadService } from '../../../services';
import { Button, Input } from '../../../components/ui';

/**
 * Leads & grievances — popup phone leads + contact-form messages
 * (lead_captures + contact_messages), unified. Contact messages flagged as
 * DPDP grievances can be triaged here (open → in progress → resolved).
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
  head: { display: 'flex', alignItems: 'flex-end', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' },
  title: { margin: 0, fontSize: 21, fontWeight: 800, letterSpacing: '-0.02em', color: 'var(--ds-color-text)' },
  sub: { margin: '3px 0 0', fontSize: 12.5, color: 'var(--ds-color-text-muted)' },
  controls: { display: 'flex', gap: 10, alignItems: 'flex-end', flexWrap: 'wrap' },
  count: { fontSize: 12, fontWeight: 700, color: 'var(--ds-color-text-muted)', fontFamily: 'var(--ds-font-mono, monospace)' },
  tableWrap: { overflowX: 'auto', border: '1px solid var(--ds-color-border)', borderRadius: 16 },
  table: { borderCollapse: 'collapse', width: '100%', minWidth: 980, fontSize: 13 },
  th: { background: 'var(--ds-color-surface-soft, #f6f6f7)', color: 'var(--ds-color-text-muted)', fontSize: 10.5, letterSpacing: '0.04em', textTransform: 'uppercase', fontWeight: 700, textAlign: 'left', padding: '12px 14px', whiteSpace: 'nowrap', borderBottom: '1px solid var(--ds-color-border)' },
  td: { padding: '12px 14px', textAlign: 'left', whiteSpace: 'nowrap', borderBottom: '1px solid var(--ds-color-border-soft, #eee)', color: 'var(--ds-color-text)', verticalAlign: 'top' },
  mono: { fontFamily: 'var(--ds-font-mono, monospace)', fontVariantNumeric: 'tabular-nums' },
  msg: { whiteSpace: 'normal', maxWidth: 320, color: 'var(--ds-color-text-muted)', lineHeight: 1.45 },
  badge: { display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: 11, fontWeight: 700, padding: '3px 10px', borderRadius: 20 },
  select: { fontSize: 12, fontWeight: 700, padding: '5px 8px', borderRadius: 8, border: '1px solid var(--ds-color-border)', background: 'var(--ds-color-surface, #fff)', color: 'var(--ds-color-text)' },
  hint: { fontSize: 12.5, color: 'var(--ds-color-text-muted)' },
};
const typeBadge = (l) => {
  if (l.kind === 'grievance') return { ...S.badge, color: 'var(--ds-color-danger,#dc2626)', background: 'var(--ds-color-danger-bg,#fee2e2)' };
  if (l.type === 'contact') return { ...S.badge, color: 'var(--ds-color-info,#2563eb)', background: 'var(--ds-color-info-bg,#dbeafe)' };
  return { ...S.badge, color: 'var(--ds-color-text-muted)', background: 'var(--ds-color-surface-soft,#f1f1f1)' };
};
const typeLabel = (l) => (l.kind === 'grievance' ? 'Grievance' : l.type === 'contact' ? 'Contact' : 'Popup');
const statusColor = (st) => st === 'resolved'
  ? 'var(--ds-color-success,#16a34a)'
  : st === 'in_progress' ? 'var(--ds-color-warning,#d97706)' : 'var(--ds-color-text-muted)';

export default function Leads() {
  const [leads, setLeads] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [q, setQ] = useState('');
  const [grievanceOnly, setGrievanceOnly] = useState(false);
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
    if (grievanceOnly) rows = rows.filter((l) => l.kind === 'grievance');
    if (s) rows = rows.filter((l) => `${l.name || ''} ${l.phone || ''} ${l.email || ''} ${l.brand || ''} ${l.message || ''} ${l.type}`.toLowerCase().includes(s));
    return rows;
  }, [leads, q, grievanceOnly]);

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

  return (
    <div style={S.wrap}>
      <div style={S.head}>
        <div>
          <h2 style={S.title}>Leads &amp; grievances</h2>
          <p style={S.sub}>Popup phone leads, contact-form messages, and DPDP grievance requests.{grievanceCount > 0 && ` ${grievanceCount} open grievance${grievanceCount === 1 ? '' : 's'}.`}</p>
        </div>
        <div style={S.controls}>
          <Input placeholder="Search name / phone / email / message" value={q} onChange={(e) => setQ(e.target.value)} />
          <Button variant={grievanceOnly ? 'primary' : 'secondary'} onClick={() => setGrievanceOnly((v) => !v)}>
            {grievanceOnly ? 'All leads' : `Grievances${grievanceCount ? ` (${grievanceCount})` : ''}`}
          </Button>
          <Button variant="secondary" onClick={load} loading={loading}>Refresh</Button>
          <Button variant="primary" onClick={exportCsv} disabled={!filtered.length}>Export CSV</Button>
        </div>
      </div>

      {error && <p style={{ ...S.hint, color: 'var(--ds-color-danger,#dc2626)' }}>{error}</p>}
      <div style={S.count}>{filtered.length} {filtered.length === 1 ? 'row' : 'rows'}{(q || grievanceOnly) && ` (of ${leads.length})`}</div>

      <div style={S.tableWrap}>
        <table style={S.table}>
          <thead><tr>
            <th style={S.th}>Type</th><th style={S.th}>Status</th><th style={S.th}>Name</th><th style={S.th}>Phone</th>
            <th style={S.th}>Email</th><th style={S.th}>Brand</th><th style={S.th}>Message</th><th style={S.th}>Captured</th>
          </tr></thead>
          <tbody>
            {filtered.map((l) => {
              const age = daysSince(l.createdAt);
              return (
                <tr key={l.id}>
                  <td style={S.td}><span style={typeBadge(l)}>{typeLabel(l)}</span></td>
                  <td style={S.td}>
                    {l.type === 'contact' ? (
                      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                        <select
                          style={{ ...S.select, color: statusColor(l.status) }}
                          value={l.status || 'open'}
                          disabled={savingId === l.id}
                          onChange={(e) => setStatus(l, e.target.value)}
                        >
                          <option value="open">Open</option>
                          <option value="in_progress">In progress</option>
                          <option value="resolved">Resolved</option>
                        </select>
                        {l.kind === 'grievance' && l.status !== 'resolved' && age != null && (
                          <span style={{ fontSize: 10.5, color: age >= 7 ? 'var(--ds-color-danger,#dc2626)' : 'var(--ds-color-text-muted)' }}>{age}d open</span>
                        )}
                      </div>
                    ) : '—'}
                  </td>
                  <td style={S.td}>{l.name || '—'}</td>
                  <td style={{ ...S.td, ...S.mono, fontWeight: 700 }}>{l.phone || '—'}</td>
                  <td style={S.td}>{l.email || '—'}</td>
                  <td style={S.td}>{l.brand || '—'}</td>
                  <td style={{ ...S.td, ...S.msg }}>{l.message || '—'}</td>
                  <td style={{ ...S.td, color: 'var(--ds-color-text-muted)' }}>{fmtDate(l.createdAt)}</td>
                </tr>
              );
            })}
            {!filtered.length && !loading && (
              <tr><td style={{ ...S.td, textAlign: 'center', padding: 28, color: 'var(--ds-color-text-muted)' }} colSpan={8}>No rows.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
