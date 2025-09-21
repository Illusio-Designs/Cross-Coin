import { useState, useEffect, useCallback } from "react";
import Button from "@/components/common/Button";
import InputField from "@/components/common/InputField";
import Modal from "@/components/common/Modal";
import Table from "@/components/common/Table";
import Pagination from "@/components/common/Pagination";
import { policyService } from "@/services";
import { debounce } from 'lodash';
import "../../styles/dashboard/seo.css";
import dynamic from "next/dynamic";
import "react-quill/dist/quill.snow.css";
import DOMPurify from 'dompurify';

const ReactQuill = dynamic(() => import("react-quill"), { ssr: false });

// Helper to get first two lines of plain text from HTML
function getFirstTwoLines(html) {
  const tempDiv = document.createElement('div');
  tempDiv.innerHTML = html;
  const text = tempDiv.textContent || tempDiv.innerText || '';
  const lines = text.split(/\r?\n|\r|\n/).filter(Boolean);
  if (lines.length <= 2) return text;
  return lines.slice(0, 2).join(' ') + '...';
}

export default function Policies() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [filterValue, setFilterValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [policies, setPolicies] = useState([]);
  const [formData, setFormData] = useState({
    id: null,
    title: "",
    content: "",
    status: "active"
  });

  // Debounced search function
  const debouncedSearch = useCallback(
    debounce((searchTerm) => {
      setFilterValue(searchTerm);
    }, 300),
    []
  );

  // Handle search input change
  const handleSearchChange = (e) => {
    const value = e.target.value;
    debouncedSearch(value);
  };

  // Fetch policies data
  const fetchPolicies = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await policyService.getAllPolicies();
      setPolicies(data);
    } catch (err) {
      setError(err.message || "Failed to fetch policies");
      console.error("Error fetching policies:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPolicies();
  }, []);

  // Enhanced filter function
  const filteredData = policies.filter(item => {
    if (!filterValue) return true;
    const searchTerm = filterValue.toLowerCase();
    return (
      (item.title?.toLowerCase().includes(searchTerm)) ||
      (item.content?.toLowerCase().includes(searchTerm))
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

  // Columns definition
  const columns = [
    {
      header: "S/N",
      accessor: "serial_number"
    },
    { header: "Title", accessor: "title" },
    { 
      header: "Content", 
      accessor: "content",
      cell: ({ content }) => (
        <div
          className="policy-content-cell"
          title={(() => { const tempDiv = document.createElement('div'); tempDiv.innerHTML = content; return tempDiv.textContent || tempDiv.innerText || ''; })()}
        >
          {getFirstTwoLines(content)}
        </div>
      )
    },
    { header: "Status", accessor: "status" },
    {
      header: "Actions",
      accessor: "actions",
      cell: ({ id }) => (
        <div className="adding-button">
          <button
            className="action-btn edit"
            title="Edit"
            onClick={() => handleEdit(id)}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a4 4 0 01-1.414.828l-4.243 1.414 1.414-4.243a4 4 0 01.828-1.414z"/>
            </svg>
            Edit
          </button>
          <button
            className="action-btn delete"
            title="Delete"
            onClick={() => handleDelete(id)}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
            Delete
          </button>
        </div>
      )
    }
  ];

  const handleEdit = async (id) => {
    try {
      setLoading(true);
      const data = await policyService.getPolicyById(id);
      setFormData({
        id: data.id,
        title: data.title || "",
        content: data.content || "",
        status: data.status || "active"
      });
      setIsModalOpen(true);
    } catch (err) {
      setError(err.message || "Failed to fetch policy data");
      console.error("Error fetching policy data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this policy?")) {
      try {
        setLoading(true);
        await policyService.deletePolicy(id);
        await fetchPolicies();
      } catch (err) {
        setError(err.message || "Failed to delete policy");
        console.error("Error deleting policy:", err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleAddNew = () => {
    setFormData({
      id: null,
      title: "",
      content: "",
      status: "active"
    });
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setFormData({
      id: null,
      title: "",
      content: "",
      status: "active"
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      if (formData.id) {
        await policyService.updatePolicy(formData.id, {
          title: formData.title,
          content: formData.content,
          status: formData.status
        });
      } else {
        await policyService.createPolicy({
          title: formData.title,
          content: formData.content,
          status: formData.status
        });
      }
      await fetchPolicies();
      setIsModalOpen(false);
      setFormData({
        id: null,
        title: "",
        content: "",
        status: "active"
      });
    } catch (err) {
      setError(err.message || "Failed to save policy");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
    <div className="dashboard-page">
        <div className="seo-header-container">
          <h1 className="seo-title">Policies Management</h1>
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
        <Button 
          variant="primary"
              onClick={handleAddNew}
              className="add-new-btn"
        >
          Add New Policy
        </Button>
          </div>
      </div>

        {/* Table Section */}
        <div className="seo-table-container">
          {loading ? (
            <div className="seo-loading">Loading...</div>
          ) : (
            <>
              {filteredData.length === 0 ? (
                <div className="seo-empty-state">
                  {filterValue ? "No results found for your search" : "No policies found"}
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
                        totalItems={filteredData.length}
                        itemsPerPage={itemsPerPage}
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

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        title={formData.id ? "Edit Policy" : "Add New Policy"}
      >
        <form onSubmit={handleSubmit} className="seo-form">
          <div className="modal-body">
            <InputField
              label="Policy Title"
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              required
            />
            <div className="input-field">
              <label className="input-field-label">Content</label>
              <ReactQuill
                value={formData.content}
                onChange={value => setFormData(prev => ({ ...prev, content: value }))}
                theme="snow"
                style={{ minHeight: 200 }}
              />
            </div>
            <InputField
              label="Status"
              type="select"
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              required
              options={[
                { value: "active", label: "Active" },
                { value: "inactive", label: "Inactive" }
              ]}
            />
          </div>
          <div className="modal-footer">
                <Button
                  variant="secondary"
              size="medium"
              onClick={handleModalClose}
              disabled={loading}
              type="button"
                >
                  Cancel
                </Button>
                <Button
              type="submit"
                  variant="primary"
              size="medium"
              disabled={loading}
                >
              {loading ? "Saving..." : "Save"}
                </Button>
            </div>
          </form>
      </Modal>
    </>
  );
} 