import { useState, useEffect } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Table, Pagination } from "../../../components/ui";
import { PageHeader, Panel, StatTile, StatGrid, FilterBar, EmptyState } from "../../../components/Dashboard/primitives";
import Loader from "../../../components/common/Loader";
import { ConfirmModal } from "../../../components/common/AlertModal";
import { showSuccess, showError } from "../../../utils/toastNotification";
import { userService } from '../../../services';
import { queryKeys } from '../../../lib/queryClient';
import { HugeiconsIcon } from '@hugeicons/react';
import { ViewIcon, UserMultiple02Icon, Delete02Icon } from '@hugeicons/core-free-icons';

const IC = {
  view: <HugeiconsIcon icon={ViewIcon} size={16} strokeWidth={2} />,
  users: <HugeiconsIcon icon={UserMultiple02Icon} size={20} strokeWidth={2} />,
  del: <HugeiconsIcon icon={Delete02Icon} size={16} strokeWidth={2} />,
};

const STAFF_ROLES = ['admin', 'product_manager', 'order_manager', 'whatsapp_manager'];

export default function Consumers() {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [search, setSearch] = useState("");
  const [confirmState, setConfirmState] = useState(null);
  const queryClient = useQueryClient();

  // Registered customers only — guest rows come from a different table whose
  // ids can collide with user ids, so they never get a delete action.
  const confirmDelete = (row) => setConfirmState({
    message: `Delete ${row.username || row.email || 'this customer'}? Their personal data is erased permanently; their orders are kept anonymised for tax records.`,
    onConfirm: async () => {
      try {
        const res = await userService.adminDeleteUser(row.id);
        setConfirmState(null);
        showSuccess('customerDeleted', res?.message || 'Customer deleted');
        queryClient.invalidateQueries({ queryKey: queryKeys.consumersAdmin });
      } catch (err) {
        setConfirmState(null);
        showError('customerDeleteFailed', err?.message || 'Failed to delete customer.');
      }
    },
  });

  // ── React Query: consumers list ──────────────────────────────────
  const { data: consumers = [], isLoading: loading, error } = useQuery({
    queryKey: queryKeys.consumersAdmin,
    queryFn: async () => {
      // Registered customers + guest (unregistered) customers, merged.
      const [usersRes, guestsRes] = await Promise.all([
        userService.getAllUsers(),
        userService.getGuestUsers().catch(() => ({ guests: [] })),
      ]);
      const users = Array.isArray(usersRes) ? usersRes : usersRes?.users || usersRes?.data || [];
      const guests = guestsRes?.guests || [];
      return [...users, ...guests];
    },
    staleTime: 60 * 1000,  // 1 min — consumer list doesn't change frequently
  });

  useEffect(() => { setCurrentPage(1); }, [search]);

  const allConsumers = (Array.isArray(consumers) ? consumers : []).filter(item => !STAFF_ROLES.includes(item.role));
  const filteredData = allConsumers.filter(item => {
    if (!search) return true;
    const s = search.toLowerCase();
    return item.username?.toLowerCase().includes(s) || item.email?.toLowerCase().includes(s);
  });

  // Stats — derived from the unfiltered list so the totals don't jiggle
  // when the operator types into the search box.
  const totalConsumers = allConsumers.length;
  const newThisMonth = (() => {
    const cutoff = new Date(); cutoff.setDate(1); cutoff.setHours(0, 0, 0, 0);
    return allConsumers.filter(c => c.createdAt && new Date(c.createdAt) >= cutoff).length;
  })();
  const withPhone = allConsumers.filter(c => c.phone).length;

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const start = (currentPage - 1) * itemsPerPage;
  const currentItems = filteredData.slice(start, start + itemsPerPage).map((item, i) => ({ ...item, serial_number: start + i + 1 }));

  // Open the customer profile page. Guest rows carry ids like "g12".
  const handleView = (row) => {
    const sel = row.isGuest
      ? { kind: 'guest', id: Number(String(row.id).replace(/\D/g, '')) }
      : { kind: 'user', id: row.id };
    try { sessionStorage.setItem('obz-customer', JSON.stringify(sel)); } catch { /* storage blocked */ }
    window.history.pushState({}, '', '/dashboard/customer');
    window.dispatchEvent(new PopStateEvent('popstate'));
  };

  const columns = [
    { header: "Sr. No", accessor: "serial_number" },
    { header: "Name", accessor: "username", cell: (row) => (
      <button type="button" className="cat-name-cell" title="Open customer profile" onClick={() => handleView(row)}
        style={{ background: 'none', border: 0, padding: 0, font: 'inherit', color: 'inherit', cursor: 'pointer', textAlign: 'left' }}>
        {row.username || row.email || 'Customer'}
      </button>
    ) },
    { header: "Email", accessor: "email" },
    { header: "Phone", accessor: "phone", cell: ({ phone }) => <span>{phone || '—'}</span> },
    { header: "Source", accessor: "SourceBrand", cell: (row) => {
      const brand = row.SourceBrand;
      return brand ? <span className="sl-status-badge sl-status-approved">{brand.display_name || brand.name}</span> : <span style={{ color: '#a3a3a3' }}>—</span>;
    }},
    { header: "Joined", accessor: "createdAt", cell: ({ createdAt }) => <span>{createdAt ? new Date(createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'}</span> },
    {
      header: "Actions", accessor: "actions",
      cell: (row) => (
        <div className="sl-actions">
          <button className="sl-btn-edit" title="Open customer profile" onClick={() => handleView(row)}>{IC.view}</button>
          {!row.isGuest && (
            <button className="sl-btn-delete" title="Delete customer" onClick={() => confirmDelete(row)}>{IC.del}</button>
          )}
        </div>
      ),
    },
  ];

  return (
    <>
      <div className="dashboard-page">
        <PageHeader
          title="Consumers"
          subtitle={`${totalConsumers} consumer${totalConsumers !== 1 ? 's' : ''} total`}
        />

        <StatGrid>
          <StatTile label="Total consumers" value={totalConsumers} tone="info" />
          <StatTile label="New this month" value={newThisMonth} tone="good" sub="signups since 1st" />
          <StatTile label="With phone on file" value={withPhone} tone="default" sub={`${totalConsumers > 0 ? Math.round(withPhone / totalConsumers * 100) : 0}% of total`} />
        </StatGrid>

        <Panel>
          <FilterBar
            search={search}
            onSearchChange={setSearch}
            placeholder="Search by name or email…"
          />
          {loading ? (
            <div style={{ padding: 48, textAlign: 'center' }}><Loader /></div>
          ) : error ? (
            <EmptyState
              title="Couldn't load consumers"
              message={error?.message || String(error)}
            />
          ) : filteredData.length === 0 ? (
            <EmptyState
              icon={IC.users}
              title={search ? "No consumers match your search" : "No consumers yet"}
              message={search ? "Try a different name or email." : "Signups will appear here as customers register."}
            />
          ) : (
            <>
              <Table columns={columns} data={currentItems} striped hoverable cardOnMobile />
              {filteredData.length > itemsPerPage && (
                <div style={{ padding: 16, display: 'flex', justifyContent: 'center' }}>
                  <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                </div>
              )}
            </>
          )}
        </Panel>
      </div>

      {confirmState && (
        <ConfirmModal
          message={confirmState.message}
          onConfirm={confirmState.onConfirm}
          onCancel={() => setConfirmState(null)}
        />
      )}
    </>
  );
}
