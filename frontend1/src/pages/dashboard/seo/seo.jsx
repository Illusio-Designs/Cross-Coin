import "../../../styles/dashboard/seo.css";
import { useState, useEffect, useCallback } from "react";
import Button from "../../../components/common/Button";
import InputField from "../../../components/common/InputField";
import Modal from "../../../components/common/Modal";
import Table from "../../../components/common/Table";
import Pagination from "../../../components/common/Pagination";
import { seoService, userService } from "../../../services";
import { debounce } from 'lodash';
import { useRouter } from 'next/router';

export default function SEO() {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [filterValue, setFilterValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [seoData, setSeoData] = useState([]);
  const [formData, setFormData] = useState({
    page_name: "",
    meta_title: "",
    meta_description: "",
    meta_keywords: "",
    meta_image: null
  });

  // Check admin access
  useEffect(() => {
    const checkAdminAccess = async () => {
      try {
        const userData = await userService.getCurrentUser();
        if (!userData || userData.role !== 'admin') {
          router.push('/dashboard');
        }
      } catch (error) {
        console.error('Auth check failed:', error);
        router.push('/dashboard');
      }
    };
    checkAdminAccess();
  }, [router]);

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
      const response = await seoService.getAllSEOData();
      console.log('SEO Data Response:', response);
      
      // Check if response is an array or has a data property
      const data = Array.isArray(response) ? response : (response.data || []);
      setSeoData(data);
    } catch (err) {
      console.error("Error fetching SEO data:", err);
      setError(err.message || "Failed to fetch SEO data");
      setSeoData([]);
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
      (item.meta_keywords?.toLowerCase().includes(searchTerm))
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
      cell: ({ page_name }) => (
        <div className="flex gap-2 justify-center">
          <button
            className="action-btn edit"
            title="Edit"
            onClick={() => handleEdit(page_name)}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a4 4 0 01-1.414.828l-4.243 1.414 1.414-4.243a4 4 0 01.828-1.414z"/>
            </svg>
            Edit
          </button>
        </div>
      )
    }
  ];

  const handleEdit = async (pageName) => {
    try {
      setLoading(true);
      setError(null);
      const response = await seoService.getSEOData(pageName);
      console.log('Edit SEO Data:', response);
      
      setFormData({
        page_name: response.page_name || "",
        meta_title: response.meta_title || "",
        meta_description: response.meta_description || "",
        meta_keywords: response.meta_keywords || "",
        meta_image: response.meta_image || null
      });
      setIsModalOpen(true);
    } catch (err) {
      console.error("Error fetching SEO data for edit:", err);
      setError(err.message || "Failed to fetch SEO data for editing");
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
      meta_title: "",
      meta_description: "",
      meta_keywords: "",
      meta_image: null
    });
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setFormData({
      page_name: "",
      meta_title: "",
      meta_description: "",
      meta_keywords: "",
      meta_image: null
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      setFormData(prev => ({
        ...prev,
        meta_image: file
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);
      
      const formDataToSend = new FormData();
      
      // Append all form fields
      Object.keys(formData).forEach(key => {
        if (formData[key] !== null) {
          formDataToSend.append(key, formData[key]);
        }
      });

      console.log('Submitting form data:', Object.fromEntries(formDataToSend.entries()));

      if (formData.page_name) {
        await seoService.updateSEOData(formData.page_name, formDataToSend);
      } else {
        await seoService.createSEOData(formDataToSend);
      }
      
      await fetchSEOData();
      setIsModalOpen(false);
    } catch (err) {
      console.error("Error saving SEO data:", err);
      setError(err.message || "Failed to save SEO data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="dashboard-page">
        <div className="seo-header-container">
          <h1 className="seo-title">SEO Management</h1>
          <div className="seo-actions">
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
              size="medium"
              onClick={handleAddNew}
              disabled={loading}
            >
              Add New SEO
            </Button>
          </div>
        </div>
        
        {/* Table Section */}
        <div className="seo-table-container">
          {loading ? (
            <div className="seo-loading">Loading...</div>
          ) : error ? (
            <div className="seo-error">{error}</div>
          ) : (
            <>
              {filteredData.length === 0 ? (
                <div className="seo-empty-state">
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
        title={formData.page_name ? "Edit SEO Entry" : "Add New SEO Entry"}
      >
        <form onSubmit={handleSubmit} className="seo-form">
          <div className="modal-body">
            <InputField
              label="Page Name"
              type="text"
              name="page_name"
              value={formData.page_name}
              onChange={handleInputChange}
              required
              disabled={!!formData.page_name}
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
            <div className="input-field">
              <label className="input-field-label">Meta Image</label>
              <input
                type="file"
                accept="image/*"
                className="input-field"
                onChange={handleImageChange}
              />
              {formData.meta_image && (
                <img 
                  src={typeof formData.meta_image === 'string' ? formData.meta_image : URL.createObjectURL(formData.meta_image)} 
                  alt="Meta Preview" 
                  className="seo-image-preview" 
                />
              )}
            </div>
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