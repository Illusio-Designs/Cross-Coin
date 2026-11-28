import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { EmptyState, ErrorState, PageHeader, Pagination, Select, SkeletonTable, StatusPill } from '../../../components/ui';
import { ROLE_LABELS, STAFF_ROLES, useAuth } from '../../../context/AuthContext';
import { adminAuditService } from '../../../services';
import styles from './auditLog.module.css';

const AREAS = {
  orders: 'Orders', problems: 'Delivery problems', returns: 'Returns', whatsapp: 'WhatsApp',
  settings: 'Settings', jobs: 'System jobs', catalogue: 'Catalogue and website', staff: 'Staff accounts',
};
const ACTIONS = {
  awb_update: 'Updated tracking number', cancel: 'Cancelled order', case_update: 'Updated case',
  confirm: 'Confirmed order', create: 'Created', created: 'Created', delete: 'Deleted',
  manual_job: 'Ran job manually', payment_reconciled: 'Reconciled payment',
  payment_reference_linked: 'Linked payment reference', refund: 'Refunded order',
  return_reviewed: 'Reviewed return', rto_receipt_verified: 'Verified returned parcel',
  submit: 'Submitted change', update: 'Updated', whatsapp_reply: 'Sent WhatsApp reply',
};
const optionsFor = (entries) => entries.map(([value, label]) => ({ value, label }));
const dateFormat = new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata', day: 'numeric', month: 'short', year: 'numeric',
  hour: 'numeric', minute: '2-digit',
});
const initial = { user: '', role: '', area: '', days: '7', page: 1 };

export default function AuditLog() {
  const { isAdmin, loading } = useAuth();
  const [filters, setFilters] = useState(initial);
  const query = useQuery({
    queryKey: ['admin-audit-log', filters],
    queryFn: ({ signal }) => adminAuditService.list(filters, signal),
    enabled: !!isAdmin,
  });
  const change = (field, value) => setFilters((prev) => ({ ...prev, [field]: value, page: 1 }));
  const data = query.data;
  const staff = [{ value: '', label: 'All users' }, ...optionsFor((data?.staff ?? []).map((s) => [String(s.id), s.name]))];

  if (loading) return null;
  if (!isAdmin) return <EmptyState title="Audit Log is restricted to admins" />;

  return (
    <div className="dashboard-sections obz-rep oss">
      <PageHeader title="Audit Log" description="See who changed what and when. All times are IST."
        actions={<button type="button" className="oss-btn" onClick={() => query.refetch()} disabled={query.isFetching}>Refresh</button>} />

      <section className="oss-card" aria-label="Audit log filters">
        <div className={styles.filters}>
          <Select label="User" value={filters.user} options={staff} searchable
            onChange={(value) => change('user', value)} />
          <Select label="Role" value={filters.role} options={optionsFor([['', 'All roles'], ...STAFF_ROLES.map((role) => [role, ROLE_LABELS[role]])])}
            onChange={(value) => change('role', value)} />
          <Select label="Activity" value={filters.area} options={optionsFor([['', 'All activity'], ...Object.entries(AREAS)])}
            onChange={(value) => change('area', value)} />
          <Select label="Period" value={filters.days} options={optionsFor(['7', '30', '90'].map((days) => [days, `Last ${days} days`]))}
            onChange={(value) => change('days', value)} />
        </div>
        <p className={styles.note}>Older records use the staff member’s current roles when the original roles were unavailable.</p>
      </section>

      <section className={styles.results} aria-label="Audit log results" aria-busy={query.isFetching}>
        {query.isPending ? <SkeletonTable rows={6} cols={4} label="Loading audit activity…" />
          : query.isError ? <ErrorState message={query.error?.response?.data?.message || 'Could not load the audit log'} onRetry={() => query.refetch()} />
          : !data?.events?.length ? <EmptyState title="No matching activity" description="Try a different user, role, activity or period." />
          : <>
            <div className={styles.count} aria-live="polite">{data.total.toLocaleString('en-IN')} {data.total === 1 ? 'entry' : 'entries'}</div>
            <div className={styles.table} role="table" aria-label="Staff activity">
              <div className={styles.heading} role="row">
                <span role="columnheader">Activity</span>
                <span role="columnheader">User</span>
                <span role="columnheader">Role</span>
                <span role="columnheader">Time (IST)</span>
              </div>
              {data.events.map((entry) => (
                <div key={entry.id} className={styles.row} role="row">
                  <div className={styles.activity} role="cell">
                    <strong>{ACTIONS[entry.action] || entry.action.replaceAll('_', ' ')}</strong>
                    <span>{AREAS[entry.area]}{entry.resource ? ` · ${entry.resource}` : ''}</span>
                  </div>
                  <div className={styles.user} role="cell">
                    <span className={styles.mobileLabel}>User</span> {entry.userName}
                  </div>
                  <div className={styles.roles} role="cell">
                    <span className={styles.mobileLabel}>Role</span>
                    {entry.roles.map((role) => <StatusPill key={role} tone="neutral">{ROLE_LABELS[role]}</StatusPill>)}
                    {!entry.roles.length && <span>Unknown</span>}
                  </div>
                  <time dateTime={entry.at} className={styles.time} role="cell">{dateFormat.format(new Date(entry.at))}</time>
                </div>
              ))}
            </div>
            <div className={styles.pagination}>
              <Pagination currentPage={data.page} totalPages={data.pages}
                onPageChange={(page) => setFilters((prev) => ({ ...prev, page }))} disabled={query.isFetching} />
            </div>
          </>}
      </section>
    </div>
  );
}
