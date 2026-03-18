import { useState, useEffect, useCallback } from "react";
import { Button, Table, Pagination, Modal } from "../../../components/ui";
import Loader from "../../../components/common/Loader";
import { debounce } from 'lodash';
import { userService } from '../../../services';

export default function Consumers() {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [filterValue, setFilterValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [consumers, setConsumers] = useState([]);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [selectedConsumer, setSelectedConsumer] = useState(null);

  // Fetch consumers from backend
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

  // Debounced search function
  const debouncedSearch = useCallback((searchTerm) => {
    const timeoutId = setTimeout(() => {
      setFilterValue(searchTerm);
    }, 300);
    return () => clearTimeout(timeoutId);
  }, []);

  // Handle search input change
  const handleSearchChange = (e) => {
    const value = e.target.value;
    debouncedSearch(value);
  };

  // Enhanced filter function
  const filteredData = consumers
    .filter(item => item.role === 'consumer' || item.role === 'customer') // Only show consumers
    .filter(item => {
      if (!filterValue) return true;
      const searchTerm = filterValue.toLowerCase();
      return (
        (item.username?.toLowerCase().includes(searchTerm)) ||
        (item.email?.toLowerCase().includes(searchTerm))
      );
    });

  // Pagination
  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);

  // Add serial number to each row
  const currentItemsWithSN = currentItems.map((item, idx) => ({
    ...item,
    serial_number: indexOfFirstItem + idx + 1
  }));

  // Reset to first page when filter changes
  useEffect(() => {
    setCurrentPage(1);
  }, [filterValue]);

  // Handler functions for actions
  const handleView = async (id) => {
    try {
      setLoading(true);
      const consumer = consumers.find(c => c.id === id);
      if (consumer) {
        setSelectedConsumer(consumer);
        setIsViewModalOpen(true);
      }
    } catch (error) {
      } finally {
      setLoading(false);
    }
  };

  // Columns definition (no join date, no last login)
  const columns = [
    { header: "S/N", accessor: "serial_number" },
    { header: "Name", accessor: "username" },
    { header: "Email", accessor: "email" },
    { header: "Role", accessor: "role" },
    {
      header: "Actions",
      accessor: "actions",
      cell: (row) => (
        <div className="action-buttons">
          <button
            className="action-btn view"
            title="View Details"
            onClick={() => handleView(row.id)}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
            </svg>
          </button>
        </div>
      )
    }
  ];

  return (
    <>
    <div className="dashboard-page">
      <div className="seo-header-container">
        <h1 className="seo-title">Consumers Management</h1>
        <div className="adding-button">
          <form className="modern-searchbar-form" onSubmit={e => e.preventDefault()}>
            <div className="modern-searchbar-group">
              <span className="modern-searchbar-icon">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                </svg>
              </span>
              <input
                type="text"
                className="modern-searchbar-input"
                placeholder="Search"
                onChange={handleSearchChange}
                defaultValue={filterValue}
              />
            </div>
          </form>
        </div>
      </div>

      {/* Table Section */}
      <div className="seo-table-container consumers-table">
        {loading ? (
          <div style={{ position: 'relative', minHeight: '400px' }}>
            <Loader />
          </div>
        ) : error ? (
          <div className="seo-empty-state">{error}</div>
        ) : (
          <>
            {filteredData.length === 0 ? (
              <div className="seo-empty-state">
                {filterValue ? "No results found for your search" : "No consumers found"}
              </div>
            ) : (
              <>
                <Table
                  columns={columns}
                  data={currentItemsWithSN}
                  className="w-full"
                  striped={true}
                  hoverable={true}
                />
                {filteredData.length > itemsPerPage && (
                  <div className="seo-pagination-container">
                    <Pagination
                      currentPage={currentPage}
                      totalPages={totalPages}
                      onPageChange={setCurrentPage}
                    />
                  </div>
                )}
              </>
            )}
          </>
        )}
      </div>
    </div>

    {/* Consumer Details Modal */}
    <Modal
      isOpen={isViewModalOpen}
      onClose={() => setIsViewModalOpen(false)}
      title={`Consumer Details: ${selectedConsumer?.username || 'N/A'}`}
    >
      {selectedConsumer && (
        <div className="consumer-details-modal">
          <div className="consumer-section">
            <h4 style={{ marginBottom: '12px', color: '#180D3E', borderBottom: '2px solid #180D3E', paddingBottom: '8px' }}>
              Personal Information
            </h4>
            <div className="consumer-info-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <div><strong>Username:</strong> {selectedConsumer.username || 'N/A'}</div>
              <div><strong>Email:</strong> {selectedConsumer.email || 'N/A'}</div>
              <div><strong>Role:</strong> {selectedConsumer.role || 'N/A'}</div>
              <div><strong>Status:</strong> 
                <span style={{ 
                  marginLeft: '8px',
                  padding: '4px 8px', 
                  borderRadius: '4px',
                  backgroundColor: selectedConsumer.status === 'active' ? '#d1fae5' : '#fee2e2',
                  color: selectedConsumer.status === 'active' ? '#065f46' : '#dc2626',
                  fontSize: '12px',
                  fontWeight: '600'
                }}>
                  {selectedConsumer.status || 'N/A'}
                </span>
              </div>
              <div><strong>Phone:</strong> {selectedConsumer.phone || 'N/A'}</div>
            </div>
          </div>

          {selectedConsumer.createdAt && (
            <div className="consumer-section" style={{ marginTop: '20px' }}>
              <h4 style={{ marginBottom: '12px', color: '#180D3E', borderBottom: '2px solid #CE1E36', paddingBottom: '8px' }}>
                Account Information
              </h4>
              <div className="consumer-info-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                <div><strong>Joined:</strong> {new Date(selectedConsumer.createdAt).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</div>
                <div><strong>Last Updated:</strong> {selectedConsumer.updatedAt ? new Date(selectedConsumer.updatedAt).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                }) : 'N/A'}</div>
              </div>
            </div>
          )}

          <div className="modal-footer" style={{ marginTop: '24px', textAlign: 'right' }}>
            <Button variant="secondary" onClick={() => setIsViewModalOpen(false)}>Close</Button>
          </div>
        </div>
      )}
    </Modal>
    </>
  );
} 


