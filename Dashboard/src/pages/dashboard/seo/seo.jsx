import { useState, useEffect } from "react";
import { Button, Input, Modal, Pagination, Select } from "../../../components/ui";
import { PageHeader, Panel, FilterBar, ResponsiveTable, EmptyState } from "../../../components/Dashboard/primitives";
import Loader from "../../../components/common/Loader";
import SafeImage from '../../../components/common/SafeImage';
import { ConfirmModal } from '../../../components/common/AlertModal';
import { seoService, userService } from "../../../services";
import { debounce } from 'lodash';
import { useRouter } from 'next/router';
import SerpPreview, { brandSiteName, brandUrl } from '../../../components/common/SerpPreview';
import SeoLengthMeter from '../../../components/common/SeoLengthMeter';
import { HugeiconsIcon } from '@hugeicons/react';
import { PencilEdit02Icon, Add01Icon } from '@hugeicons/core-free-icons';

// True when the string is empty (allowed) or parses as JSON. Used to gate the
// JSON-LD field so we never POST a broken structured_data blob (the backend
// rejects invalid JSON with a 400).
const isValidJson = (s) => {
  if (!s || !String(s).trim()) return true;
  try { JSON.parse(s); return true; } catch { return false; }
};

const ROBOTS_OPTIONS = [
  { value: '', label: 'Default (index, follow)' },
  { value: 'index, follow', label: 'index, follow' },
  { value: 'index, follow, max-image-preview:large', label: 'index, follow, max-image-preview:large' },
  { value: 'noindex, follow', label: 'noindex, follow' },
  { value: 'noindex, nofollow', label: 'noindex, nofollow' },
];

export default function SEO({ brandSlug = 'crosscoin', brand = null } = {}) {
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
    canonical_url: "",
    robots: "",
    structured_data: "",
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
    { key: "serial_number", label: "Sr. No" },
    { key: "page_name", label: "Page Name" },
    { key: "meta_title", label: "Meta Title" },
    { key: "meta_description", label: "Meta Description" },
    { key: "meta_keywords", label: "Meta Keywords" },
    {
      key: "actions",
      label: "Actions",
      render: ({ page_name }) => (
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
        canonical_url: data.canonical_url || "",
        robots: data.robots || "",
        // structured_data is a JSON column — show it pretty-printed for editing.
        structured_data: data.structured_data
          ? (typeof data.structured_data === 'string' ? data.structured_data : JSON.stringify(data.structured_data, null, 2))
          : "",
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
      canonical_url: "",
      robots: "",
      structured_data: "",
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
      canonical_url: "",
      robots: "",
      structured_data: "",
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

      // Block submit if the JSON-LD doesn't parse (backend would 400 anyway).
      if (!isValidJson(formData.structured_data)) {
        setError('Structured data (JSON-LD) is not valid JSON. Fix it or clear the field.');
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
        <PageHeader
          title="SEO Management"
          subtitle="Manage meta titles, descriptions and structured data"
          actions={
            <button className="ds-btn ds-btn--primary" onClick={handleAddNew}>
              <span className="sl-add-btn-icon">
                <HugeiconsIcon icon={Add01Icon} size={16} strokeWidth={2} />
              </span>
              Add SEO Entry
            </button>
          }
        />

        <Panel style={{ marginBottom: 16 }}>
        <FilterBar
          search={filterValue}
          onSearchChange={setFilterValue}
          placeholder="Search SEO entries..."
        />
        </Panel>

        {/* Table Section */}
        <Panel flush>
          {loading ? (
            <div className="sl-loader-wrap"><Loader /></div>
          ) : error ? (
            <div className="sl-error">{error}</div>
          ) : filteredData.length === 0 ? (
            <EmptyState
              title={filterValue ? "No results found for your search" : "No SEO entries found"}
            />
          ) : (
            <>
              <ResponsiveTable columns={columns} data={currentItemsWithSN} rowKey="page_name" />
              {filteredData.length > itemsPerPage && (
                <div className="sl-pagination">
                  <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
                </div>
              )}
            </>
          )}
        </Panel>
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
            <Input
              label="Canonical URL"
              type="text"
              name="canonical_url"
              value={formData.canonical_url}
              onChange={handleInputChange}
              placeholder="Leave blank to auto-generate from the page name"
            />
            <Select
              label="Robots directive"
              options={ROBOTS_OPTIONS}
              value={formData.robots}
              onChange={(v) => setFormData(prev => ({ ...prev, robots: v }))}
              placeholder="Default (index, follow)"
            />
            <Input
              label="Structured data (JSON-LD)"
              multiline
              rows={8}
              name="structured_data"
              value={formData.structured_data}
              onChange={handleInputChange}
              placeholder='Optional. Paste a schema.org JSON-LD object, e.g. {"@context":"https://schema.org","@type":"Organization", ...}'
              style={{ fontFamily: 'var(--ds-font-mono, ui-monospace, monospace)', fontSize: 12 }}
            />
            {formData.structured_data && !isValidJson(formData.structured_data) && (
              <span style={{ fontSize: 12, color: 'var(--ds-color-danger, #dc2626)' }}>⚠️ Not valid JSON — this won't be saved until the JSON is fixed.</span>
            )}
            <div className="input-container">
              <label className="input-label">Meta Image</label>
              <div className="dm-file-upload">
                <div className="dm-file-upload-text">
                  <span className="dm-file-upload-title">
                    {formData.meta_image instanceof File
                      ? formData.meta_image.name
                      : formData.meta_image ? 'Current image' : 'Choose image'}
                  </span>
                  <span className="dm-file-upload-sub">Recommended 1200 × 630 px · PNG, JPG or WEBP · used as the social/OG preview</span>
                </div>
                <input type="file" accept="image/*" onChange={handleImageChange} />
              </div>
              {formData.meta_image && (
                formData.meta_image instanceof File ? (
                  <img
                    src={URL.createObjectURL(formData.meta_image)}
                    alt="Meta Preview"
                    className="seo-image-preview"
                  />
                ) : (
                  <SafeImage
                    imageData={formData.meta_image}
                    alt="Meta Preview"
                    className="seo-image-preview"
                    fallbackSrc={null}
                  />
                )
              )}
            </div>
            <div style={{ marginTop: 24 }}>
              <h4 style={{ marginBottom: 12, color: 'var(--ds-color-text)', fontSize: 14 }}>Live Search Preview</h4>
              <SerpPreview
                title={formData.meta_title}
                description={formData.meta_description}
                siteName={brandSiteName(brand)}
                url={brandUrl(brand, formData.page_name)}
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

