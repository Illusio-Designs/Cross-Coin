import { useState, useEffect } from "react";
import { useQuery } from "@tanstack/react-query";
import { Button, Table, Pagination, Modal } from "../../../components/ui";
import { PageHeader, Panel, StatTile, StatGrid, FilterBar, EmptyState } from "../../../components/Dashboard/primitives";
import Loader from "../../../components/common/Loader";
import { userService } from '../../../services';
import { queryKeys } from '../../../lib/queryClient';
import { HugeiconsIcon } from '@hugeicons/react';
import { ViewIcon, UserMultiple02Icon } from '@hugeicons/core-free-icons';

const IC = {
  view: <HugeiconsIcon icon={ViewIcon} size={16} strokeWidth={2} />,
  users: <HugeiconsIcon icon={UserMultiple02Icon} size={20} strokeWidth={2} />,
};

const STAFF_ROLES = ['admin', 'product_manager', 'order_manager', 'whatsapp_manager'];

export default function Consumers() {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [search, setSearch] = useState("");
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedConsumer, setSelectedConsumer] = useState(null);

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

  const handleView = (id) => {
    const consumer = consumers.find(c => c.id === id);
    if (consumer) { setSelectedConsumer(consumer); setIsViewModalOpen(true); }
  };

  const columns = [
    { header: "Sr. No", accessor: "serial_number" },
    { header: "Name", accessor: "username", cell: ({ username }) => <span className="cat-name-cell">{username}</span> },
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
          <button className="sl-btn-edit" title="View Details" onClick={() => handleView(row.id)}>{IC.view}</button>
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
              <Table columns={columns} data={currentItems} striped hoverable />
              {filteredData.length > itemsPerPage && (
                <div style={{ padding: 16, display: 'flex', justifyContent: 'center' }}>
                  <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                </div>
              )}
            </>
          )}
        </Panel>
      </div>

      <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title={`Consumer: ${selectedConsumer?.username || ''}`}>
        {selectedConsumer && (
          <div className="seo-form">
            <div className="modal-body">
              <div className="con-detail-grid">
                <div className="con-detail-item"><span className="con-detail-label">Username</span><span className="con-detail-value">{selectedConsumer.username || '—'}</span></div>
                <div className="con-detail-item"><span className="con-detail-label">Email</span><span className="con-detail-value">{selectedConsumer.email || '—'}</span></div>
                <div className="con-detail-item"><span className="con-detail-label">Phone</span><span className="con-detail-value">{selectedConsumer.phone || '—'}</span></div>
                <div className="con-detail-item"><span className="con-detail-label">Role</span><span className="con-detail-value"><span className="sl-cat-badge">{selectedConsumer.role || '—'}</span></span></div>
                <div className="con-detail-item"><span className="con-detail-label">Status</span><span className="con-detail-value"><span className={`sl-status-badge sl-status-${selectedConsumer.status}`}>{selectedConsumer.status || '—'}</span></span></div>
                {selectedConsumer.createdAt && <div className="con-detail-item"><span className="con-detail-label">Joined</span><span className="con-detail-value">{new Date(selectedConsumer.createdAt).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</span></div>}
              </div>
            </div>
            <div className="modal-footer">
              <Button variant="secondary" onClick={() => setIsViewModalOpen(false)}>Close</Button>
            </div>
          </div>
        )}
      </Modal>
    </>
  );
}
