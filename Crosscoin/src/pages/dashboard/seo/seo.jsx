import { useState, useEffect, useCallback } from "react";
import { Button, Input, Modal, Table, Pagination } from "../../../components/ui";
import Loader from "../../../components/common/Loader";
import { ConfirmModal } from '../../../components/common/AlertModal';
import { seoService, userService } from "../../../services";
import { debounce } from 'lodash';
import { useRouter } from 'next/router';
import SerpPreview from '../../../components/common/SerpPreview';
import SeoLengthMeter from '../../../components/common/SeoLengthMeter';
import { HugeiconsIcon } from '@hugeicons/react';
import { PencilEdit02Icon, Search01Icon, Add01Icon } from '@hugeicons/core-free-icons';

export default function SEO({ brandSlug = 'crosscoin' } = {}) {
  const router = useRouter();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [confirmState, setConfirmState] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [filterValue, setFilterValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [editLoading, setEditLoading] = useState(false); // opening edit must not reload the table
  const [error, setError] = useState(null);
  const [seoData, setSeoData] = useState([]);
  const [formData, setFormData] = useState({
    original_page_name: "",
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
        router.push('/dashboard');
      }
    };
    checkAdminAccess();
  }, [router]);

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

  // Fetch SEO data
  const fetchSEOData = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await seoService.getAllSEOData(brandSlug);
      // Check if response is an array or has a data property
      const data = Array.isArray(response) ? response : (response.data || []);
      setSeoData(data);
    } catch (err) {
      setError(err.message || "Failed to fetch SEO data");
      setSeoData([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSEOData();
  }, [brandSlug]);

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
    { header: "Sr. No", accessor: "serial_number" },
    { header: "Page Name", accessor: "page_name" },
    { header: "Meta Title", accessor: "meta_title" },
    { header: "Meta Description", accessor: "meta_description" },
    { header: "Meta Keywords", accessor: "meta_keywords" },
    {
      header: "Actions",
      accessor: "actions",
      cell: ({ page_name }) => (
        <div className="sl-actions">
          <button className="sl-btn-edit" title="Edit" onClick={() => handleEdit(page_name)}>
            <HugeiconsIcon icon={PencilEdit02Icon} size={15} strokeWidth={2} />
          </button>
        </div>
      )
    }
  ];

  const handleEdit = async (pageName) => {
    try {
      setEditLoading(true);
      setError(null);
      const response = await seoService.getSEOData(pageName, brandSlug);
      // Handle both direct data and nested data property
      const data = response.data || response;
      setFormData({
        original_page_name: pageName,
        page_name: data.page_name || pageName,
        meta_title: data.meta_title || "",
        meta_description: data.meta_description || "",
        meta_keywords: data.meta_keywords || "",
        meta_image: data.meta_image || null
      });
      setIsModalOpen(true);
    } catch (err) {
      setError(err.message || "Failed to fetch SEO data for editing");
    } finally {
      setEditLoading(false);
    }
  };

  const handleDelete = (pageName) => {
    setConfirmState({ message: "Are you sure you want to delete this SEO entry?", onConfirm: async () => {
      setConfirmState(null);
      try {
        setLoading(true);
        await seoService.deleteSEOData(pageName, brandSlug);
        await fetchSEOData();
      } catch (err) {
        setError(err.message || "Failed to delete SEO data");
      } finally {
        setLoading(false);
      }
    }});
  };

  const handleAddNew = () => {
    setFormData({
      original_page_name: "",
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
      original_page_name: "",
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
      
      // Ensure page_name is included first
      if (!formData.page_name) {
        setError('Page name is required');
        setLoading(false);
        return;
      }
      
      // Append all form fields
      Object.keys(formData).forEach(key => {
        if (formData[key] !== null && key !== 'original_page_name') { // Skip original_page_name
          formDataToSend.append(key, formData[key]);
        }
      });

      // If we're editing an existing entry and the page name has changed
      if (formData.original_page_name && formData.original_page_name !== formData.page_name) {
        // First delete the old entry
        await seoService.deleteSEOData(formData.original_page_name, brandSlug);
        // Then create a new entry with the new page name
        await seoService.createSEOData(formDataToSend, brandSlug);
      } else {
        // Normal update
        await seoService.updateSEOData(formDataToSend, brandSlug);
      }
      
      await fetchSEOData();
      setIsModalOpen(false);
    } catch (err) {
      setError(err.message || "Failed to save SEO data");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <ConfirmModal message={confirmState?.message} onConfirm={confirmState?.onConfirm} onCancel={() => setConfirmState(null)} />
      <div className="dashboard-page">
        <div className="sl-page-header">
          <div className="sl-header-left">
            <div className="sl-header-icon">
              <HugeiconsIcon icon={Search01Icon} size={20} strokeWidth={2} />
            </div>
            <div>
              <h1 className="sl-page-title">SEO Management</h1>
              <p className="sl-page-sub">Manage meta titles, descriptions and structured data</p>
            </div>
          </div>
          <div className="sl-header-right">
            <div className="sl-search-wrap">
              <span className="sl-search-icon">
                <HugeiconsIcon icon={Search01Icon} size={16} strokeWidth={2} />
              </span>
              <input type="text" className="sl-search-input" placeholder="Search SEO entries..."
                onChange={handleSearchChange} defaultValue={filterValue} />
            </div>
            <button className="sl-add-btn" onClick={handleAddNew}>
              <span className="sl-add-btn-icon">
                <HugeiconsIcon icon={Add01Icon} size={16} strokeWidth={2} />
              </span>
              Add SEO Entry
            </button>
          </div>
        </div>
        
        {/* Table Section */}
        <div className="sl-table-wrap">
          {loading ? (
            <div className="sl-loader-wrap"><Loader /></div>
          ) : error ? (
            <div className="sl-error">{error}</div>
          ) : (
            <>
              {filteredData.length === 0 ? (
                <div className="sl-empty">
                  <p>{filterValue ? "No results found for your search" : "No SEO entries found"}</p>
                </div>
              ) : (
                <>
                  <Table columns={columns} data={currentItemsWithSN} className="w-full" striped={true} hoverable={true} />
                  {filteredData.length > itemsPerPage && (
                    <div className="sl-pagination">
                      <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
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
        title={formData.original_page_name ? "Edit SEO Entry" : "Add New SEO Entry"}
        closeOnOverlayClick={false}
      >
        <form onSubmit={handleSubmit} className="seo-form">
          <div className="modal-body">
            <Input
              label="Page Name"
              type="text"
              name="page_name"
              value={formData.page_name}
              onChange={handleInputChange}
              required
            />
            <Input
              label="Meta Title"
              type="text"
              name="meta_title"
              value={formData.meta_title}
              onChange={handleInputChange}
              required
            />
            <SeoLengthMeter value={formData.meta_title || ''} type="title" />
            <Input
              label="Meta Description"
              type="textarea"
              name="meta_description"
              value={formData.meta_description}
              onChange={handleInputChange}
              required
            />
            <SeoLengthMeter value={formData.meta_description || ''} type="description" />
            <Input
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
            <div style={{ marginTop: 24 }}>
              <h4 style={{ marginBottom: 12, color: 'var(--ds-color-text)', fontSize: 14 }}>Live Search Preview</h4>
              <SerpPreview
                title={formData.meta_title}
                description={formData.meta_description}
                url={`https://crosscoin.in/${formData.page_name || ''}`}
                variant="both"
              />
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

