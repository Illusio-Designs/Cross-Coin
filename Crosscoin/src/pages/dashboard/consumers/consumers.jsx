import { useState, useEffect } from "react";
import { Button, Table, Pagination, Modal } from "../../../components/ui";
import { PageHeader, Panel, StatTile, StatGrid, FilterBar, EmptyState } from "../../../components/Dashboard/primitives";
import Loader from "../../../components/common/Loader";
import { userService } from '../../../services';

const IC = {
  view: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  users: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
};

const STAFF_ROLES = ['admin', 'product_manager', 'order_manager', 'whatsapp_manager'];

export default function Consumers() {
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 10;
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [consumers, setConsumers] = useState([]);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedConsumer, setSelectedConsumer] = useState(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError(null);
      try {
        const data = await userService.getAllUsers();
        if (!cancelled) setConsumers(Array.isArray(data) ? data : data?.users || data?.data || []);
      } catch (err) {
        if (!cancelled) setError(err.message || "Failed to fetch consumers");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

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
              message={error}
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
