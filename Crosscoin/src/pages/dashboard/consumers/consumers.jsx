import { useState, useEffect } from "react";
import { Button, Table, Pagination, Modal } from "../../../components/ui";
import Loader from "../../../components/common/Loader";
import { userService } from '../../../services';

const IC = {
  search: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>,
  view: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/></svg>,
  users: <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>,
};

export default function Consumers() {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [search, setSearch] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [consumers, setConsumers] = useState([]);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedConsumer, setSelectedConsumer] = useState(null);

  useEffect(() => {
    const fetchConsumers = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await userService.getAllUsers();
        setConsumers(data);
      } catch (err) {
        setError(err.message || "Failed to fetch consumers");
      } finally {
        setLoading(false);
      }
    };
    fetchConsumers();
  }, []);

  useEffect(() => { setCurrentPage(1); }, [search]);

  const filteredData = consumers
    .filter(item => item.role === 'consumer' || item.role === 'customer')
    .filter(item => {
      if (!search) return true;
      const s = search.toLowerCase();
      return item.username?.toLowerCase().includes(s) || item.email?.toLowerCase().includes(s);
    });

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
    { header: "Role", accessor: "role", cell: ({ role }) => <span className="sl-cat-badge">{role}</span> },
    {
      header: "Actions", accessor: "actions",
      cell: (row) => (
        <div className="sl-actions">
          <button className="sl-btn-edit" title="View Details" onClick={() => handleView(row.id)}>{IC.view}</button>
        </div>
      )
    }
  ];

  return (
    <>
      <div className="dashboard-page">
        <div className="sl-page-header">
          <div className="sl-header-left">
            <div className="sl-header-icon">{IC.users}</div>
            <div>
              <h1 className="sl-page-title">Consumers</h1>
              <p className="sl-page-sub">{filteredData.length} consumer{filteredData.length !== 1 ? 's' : ''} total</p>
            </div>
          </div>
          <div className="sl-header-right">
            <div className="sl-search-wrap">
              <span className="sl-search-icon">{IC.search}</span>
              <input type="text" className="sl-search-input" placeholder="Search by name or email..." value={search} onChange={e => setSearch(e.target.value)} />
            </div>
          </div>
        </div>

        {/* Stat Cards */}
        <div className="sl-stat-cards">
          <div className="sl-stat-card">
            <div className="sl-stat-icon sl-stat-icon--blue">
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 00-3-3.87"/><path d="M16 3.13a4 4 0 010 7.75"/></svg>
            </div>
            <div className="sl-stat-body">
              <span className="sl-stat-label">Total Consumers</span>
              <span className="sl-stat-value">{filteredData.length}</span>
            </div>
          </div>
        </div>

        <div className="sl-table-wrap">
          {loading ? (
            <div className="sl-loader-wrap"><Loader /></div>
          ) : error ? (
            <div className="sl-error">{error}</div>
          ) : filteredData.length === 0 ? (
            <div className="sl-empty">
              <div className="sl-empty-icon">{IC.users}</div>
              <p>{search ? "No consumers match your search" : "No consumers found"}</p>
            </div>
          ) : (
            <>
              <Table columns={columns} data={currentItems} striped hoverable />
              {filteredData.length > itemsPerPage && (
                <div className="sl-pagination">
                  <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                </div>
              )}
            </>
          )}
        </div>
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
