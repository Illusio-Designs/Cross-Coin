import "../../../styles/dashboard/seo.css";
import { useState, useEffect, useCallback } from "react";
import Button from "../../../components/common/Button";
import InputField from "../../../components/common/InputField";
import Modal from "../../../components/common/Modal";
import Table from "../../../components/common/Table";
import Pagination from "../../../components/common/Pagination";
import { seoService } from "../../../services";
import debounce from 'lodash/debounce';

export default function SEO() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [filterValue, setFilterValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [seoData, setSeoData] = useState([]);
  const [formData, setFormData] = useState({
    page_name: "",
    slug: "",
    meta_title: "",
    meta_description: "",
    meta_keywords: "",
    canonical_url: "",
    meta_image: ""
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

  // Fetch SEO data
  const fetchSEOData = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await seoService.getAllSEOData();
      setSeoData(data);
    } catch (err) {
      setError(err.message || "Failed to fetch SEO data");
      console.error("Error fetching SEO data:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSEOData();
  }, []);

  const statusBadge = (status) => {
    let badgeClass = "badge ";
    switch (status) {
      case "Pending":
        badgeClass += "badge-pending";
        break;
      case "Processing":
        badgeClass += "badge-processing";
        break;
      case "Active":
        badgeClass += "badge-shipped";
        break;
      default:
        badgeClass += "badge";
    }
    return <span className={badgeClass}>{status}</span>;
  };

  // Enhanced filter function
  const filteredData = seoData.filter(item => {
    if (!filterValue) return true;
    
    const searchTerm = filterValue.toLowerCase();
    return (
      (item.page_name?.toLowerCase().includes(searchTerm)) ||
      (item.meta_title?.toLowerCase().includes(searchTerm)) ||
      (item.meta_description?.toLowerCase().includes(searchTerm)) ||
      (item.meta_keywords?.toLowerCase().includes(searchTerm)) ||
      (item.slug?.toLowerCase().includes(searchTerm))
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
    { header: "Page Name", accessor: "page_name" },
    { header: "Meta Title", accessor: "meta_title" },
    { header: "Meta Description", accessor: "meta_description" },
    { header: "Meta Keywords", accessor: "meta_keywords" },
    {
      header: "Actions",
      accessor: "actions",
      cell: (row) => (
        <div className="flex gap-2">
          <button
            className="action-btn edit"
            title="Edit"
            onClick={() => handleEdit(row.page_name)}
          >
            <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a4 4 0 01-1.414.828l-4.243 1.414 1.414-4.243a4 4 0 01.828-1.414z"/></svg>
            Edit
          </button>
        </div>
      ),
    },
  ];

  const handleEdit = async (pageName) => {
    try {
      setLoading(true);
      const data = await seoService.getSEOData(pageName);
      setFormData({
        page_name: data.page_name || "",
        slug: data.slug || "",
        meta_title: data.meta_title || "",
        meta_description: data.meta_description || "",
        meta_keywords: data.meta_keywords || "",
        canonical_url: data.canonical_url || "",
        meta_image: data.meta_image || ""
      });
      setIsModalOpen(true);
    } catch (err) {
      setError(err.message || "Failed to fetch SEO data");
      console.error("Error fetching SEO data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (pageName) => {
    if (window.confirm("Are you sure you want to delete this SEO entry?")) {
      try {
        setLoading(true);
        await seoService.deleteSEOData(pageName);
        await fetchSEOData();
      } catch (err) {
        setError(err.message || "Failed to delete SEO data");
        console.error("Error deleting SEO data:", err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleAddNew = () => {
    setFormData({
      page_name: "",
      slug: "",
      meta_title: "",
      meta_description: "",
      meta_keywords: "",
      canonical_url: "",
      meta_image: ""
    });
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setFormData({
      page_name: "",
      slug: "",
      meta_title: "",
      meta_description: "",
      meta_keywords: "",
      canonical_url: "",
      meta_image: ""
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
      if (formData.page_name) {
        await seoService.updateSEOData(formData.page_name, formData);
      } else {
        await seoService.createSEOData(formData);
      }
      await fetchSEOData();
      setIsModalOpen(false);
    } catch (err) {
      setError(err.message || "Failed to save SEO data");
      console.error("Error saving SEO data:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="dashboard-content bg-white rounded-lg shadow p-6">
        <div className="flex justify-between items-center mb-6 gap-4">
          <h1 className="dashboard-title text-2xl font-bold">SEO Management</h1>
          <form className="modern-searchbar-form" style={{ minWidth: 0 }} onSubmit={e => e.preventDefault()}>
            <div className="modern-searchbar-group">
              <span className="modern-searchbar-icon">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
                </svg>
              </span>
              <input
                type="text"
                className="modern-searchbar-input"
                placeholder="Search by page name, meta title, description or keywords..."
                onChange={handleSearchChange}
                defaultValue={filterValue}
              />
            </div>
          </form>
        </div>
        

        {/* Table Section */}
        <div className="table-container mt-2">
          {loading ? (
            <div className="text-center py-4">Loading...</div>
          ) : (
            <>
              {filteredData.length === 0 ? (
                <div className="text-center py-8 text-gray-500">
                  {filterValue ? "No results found for your search" : "No SEO entries found"}
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
                    <div className="mt-4">
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

      <Modal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        title={formData.page_name ? "Edit SEO Entry" : "Add New SEO Entry"}
        size="medium"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <InputField
            label="Page Name"
            type="text"
            name="page_name"
            value={formData.page_name}
            onChange={handleInputChange}
            required
          />
          <InputField
            label="Slug"
            type="text"
            name="slug"
            value={formData.slug}
            onChange={handleInputChange}
            required
          />
          <InputField
            label="Meta Title"
            type="text"
            name="meta_title"
            value={formData.meta_title}
            onChange={handleInputChange}
            required
          />
          <InputField
            label="Meta Description"
            type="textarea"
            name="meta_description"
            value={formData.meta_description}
            onChange={handleInputChange}
            required
          />
          <InputField
            label="Meta Keywords"
            type="text"
            name="meta_keywords"
            value={formData.meta_keywords}
            onChange={handleInputChange}
            required
          />
          <InputField
            label="Canonical URL"
            type="text"
            name="canonical_url"
            value={formData.canonical_url}
            onChange={handleInputChange}
          />
          <div className="input-field-container">
            <label className="input-field-label">Meta Image</label>
            <input
              type="file"
              accept="image/*"
              className="input-field"
              onChange={e => {
                const file = e.target.files[0];
                if (file) {
                  const reader = new FileReader();
                  reader.onload = ev => {
                    setFormData(prev => ({ ...prev, meta_image: ev.target.result }));
                  };
                  reader.readAsDataURL(file);
                }
              }}
            />
            {formData.meta_image && (
              <img src={formData.meta_image} alt="Meta Preview" style={{ maxWidth: '100%', marginTop: 8, borderRadius: 8 }} />
            )}
          </div>
          <div className="flex justify-end gap-2 mt-4">
            <Button 
              variant="secondary"
              size="medium"
              onClick={handleModalClose}
              disabled={loading}
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