import { useState, useEffect, useCallback } from "react";
import { Button, Input, Modal, Table, Pagination } from "../../../components/ui";
import Loader from "../../../components/common/Loader";
import BrandTags from "../../../components/Dashboard/BrandTags";
import { sliderService, categoryService, brandService } from "../../../services";
import { debounce } from 'lodash';
import { useRouter } from 'next/router';
import { useAuth } from '../../../context/AuthContext';
import { toast } from 'react-hot-toast';

export default function Slider() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [filterValue, setFilterValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [sliders, setSliders] = useState([]);
  const [categories, setCategories] = useState([]);
  const [brands, setBrands] = useState([]);
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    status: "active",
    image: null,
    categoryId: "",
    buttonText: "",
    brand_id: "",
    brand_ids: [], // Array for multi-brand selection
  });

  // Check admin access
  useEffect(() => {
    if (!authLoading && (!user || user.role !== 'admin')) {
      router.push('/dashboard');
    }
  }, [user, authLoading, router]);

  // Fetch categories
  const fetchCategories = async () => {
    try {
      const response = await categoryService.getAllCategories();
      setCategories(response);
    } catch (err) {
      }
  };

  // Fetch brands
  const fetchBrands = async () => {
    try {
      const response = await brandService.getAllBrands(true);
      if (response.success && response.data) {
        setBrands(response.data);
      }
    } catch (err) {
      }
  };

  useEffect(() => {
    fetchCategories();
    fetchBrands();
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

  // Fetch sliders data
  const fetchSliders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await sliderService.getAllSliders();
      if (Array.isArray(response)) {
        setSliders(response);
        } else if (response.sliders && Array.isArray(response.sliders)) {
        setSliders(response.sliders);
        } else {
        setSliders([]);
      }
    } catch (err) {
      setError(err.message || "Failed to fetch sliders");
      toast.error(err.message || "Failed to fetch sliders");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchSliders();
  }, [fetchSliders]);

  // Enhanced filter function
  const filteredData = sliders.filter(item => {
    if (!filterValue) return true;
    
    const searchTerm = filterValue.toLowerCase();
    return (
      (item.title?.toLowerCase().includes(searchTerm)) ||
      (item.description?.toLowerCase().includes(searchTerm)) ||
      (item.categoryName?.toLowerCase().includes(searchTerm))
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

  // Helper function to get image URL
  const getImageUrl = (imagePath) => {
    if (!imagePath) return '';
    // If the image path contains localhost, replace it with the production URL
    if (imagePath.includes('localhost:5000') || imagePath.includes('localhost')) {
      const productionUrl = imagePath.replace(/http:\/\/localhost(:\d+)?/, 'https://api.crosscoin.in');
      return productionUrl;
    }
    
    // The backend already returns the full URL, so just return as is
    return imagePath;
  };

  // Columns definition
  const columns = [
    {
      header: "S/N",
      accessor: "serial_number"
    },
    { 
      header: "Image", 
      accessor: "image",
      cell: ({ image }) => {
        const imageUrl = getImageUrl(image);
        
        return (
          <div style={{ width: '150px', height: '100px', position: 'relative' }}>
            {imageUrl ? (
              <img 
                src={imageUrl}
                alt="Slider" 
                style={{ 
                  width: '100%', 
                  height: '100%', 
                  objectFit: 'cover',
                  borderRadius: '4px'
                }}
                onError={(e) => {
                  e.target.style.display = 'none';
                  e.target.nextSibling.style.display = 'flex';
                }}
                crossOrigin="anonymous"
                data-no-optimize="true"
              />
            ) : null}
            <div style={{ 
              width: '100%', 
              height: '100%', 
              backgroundColor: '#f0f0f0',
              display: imageUrl ? 'none' : 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              borderRadius: '4px',
              fontSize: '12px',
              color: '#666'
            }}>
              {imageUrl ? 'Failed to load' : 'No Image'}
            </div>
          </div>
        );
      }
    },
    { header: "Title", accessor: "title" },
    { header: "Description", accessor: "description" },
    { header: "Category", accessor: "categoryName" },
    {
      header: "Brands",
      accessor: "id", // Use a simple accessor that won't cause issues
      cell: (row) => {
        // Show brands from slider_brands relationship
        const sliderBrands = row.brands || [];
        
        // Handle if brands is an array of objects
        if (sliderBrands.length > 0) {
          return (
            <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
              {sliderBrands.map((brand, idx) => {
                // Handle both string and object formats
                const brandName = typeof brand === 'string' ? brand : (brand.name || brand.display_name || 'Unknown');
                return (
                  <span key={idx} className="brand-tag">{brandName}</span>
                );
              })}
            </div>
          );
        }
        
        // Fallback to single brand_id if no multi-brand assignments
        const brand = brands.find(b => b.id === row.brand_id);
        return brand ? (
          <span className="brand-tag">{brand.display_name || brand.name}</span>
        ) : 'N/A';
      }
    },
    { 
      header: "Status", 
      accessor: "status",
      cell: ({ status }) => (
        <span className={`status-badge ${status}`}>
          {status}
        </span>
      )
    },
    {
      header: "Actions",
      accessor: "actions",
      cell: ({ id }) => (
        <div className="action-buttons">
          <button
            className="action-btn edit"
            title="Edit Slider"
            onClick={() => handleEdit(id)}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a4 4 0 01-1.414.828l-4.243 1.414 1.414-4.243a4 4 0 01.828-1.414z"/>
            </svg>
          </button>
          <button
            className="action-btn delete"
            title="Delete Slider"
            onClick={() => handleDelete(id)}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          </button>
        </div>
      )
    }
  ];

  const handleEdit = async (id) => {
    try {
      setLoading(true);
      const response = await sliderService.getSliderById(id);
      const data = response.slider || response; // Handle both response formats
      // Extract brand IDs from brands array
      const brandIds = data.brands && Array.isArray(data.brands) 
        ? data.brands.map(b => typeof b === 'object' ? b.id : b)
        : (data.brand_id ? [data.brand_id] : []);
      
      setFormData({
        id: data.id,
        title: data.title || "",
        description: data.description || "",
        status: data.status || "active",
        categoryId: data.categoryId || "",
        image: data.image || null,
        buttonText: data.buttonText || "",
        brand_id: data.brand_id || "",
        brand_ids: brandIds
      });
      setIsModalOpen(true);
    } catch (err) {
      setError(err.message || "Failed to fetch slider data");
      } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this slider?")) {
      try {
        setLoading(true);
        await sliderService.deleteSlider(id);
        await fetchSliders();
        toast.success("Slider deleted successfully");
      } catch (err) {
        setError(err.message || "Failed to delete slider");
        toast.error(err.message || "Failed to delete slider");
        } finally {
        setLoading(false);
      }
    }
  };

  const handleAddNew = () => {
    setFormData({
      title: "",
      description: "",
      status: "active",
      categoryId: "",
      image: null,
      buttonText: "",
      brand_id: "",
      brand_ids: []
    });
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setFormData({
      title: "",
      description: "",
      status: "active",
      categoryId: "",
      image: null,
      buttonText: "",
      brand_id: "",
      brand_ids: []
    });
    // Reset file input value if present
    const fileInput = document.querySelector('input[type="file"][name="image"]');
    if (fileInput) fileInput.value = "";
  };

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    if (type === 'file') {
      setFormData(prev => ({
        ...prev,
        [name]: e.target.files && e.target.files[0] ? e.target.files[0] : null
      }));
    } else if (name === 'brand_ids') {
      // Handle multi-select for brands
      const selectedOptions = Array.from(e.target.selectedOptions, option => parseInt(option.value));
      setFormData(prev => ({
        ...prev,
        brand_ids: selectedOptions
      }));
    } else {
      setFormData(prev => ({
        ...prev,
        [name]: value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const formDataToSend = new FormData();
      formDataToSend.append("title", formData.title);
      formDataToSend.append("description", formData.description);
      formDataToSend.append("categoryId", formData.categoryId);
      formDataToSend.append("status", formData.status);
      formDataToSend.append("buttonText", formData.buttonText);
      
      // Add brand_id for backward compatibility (use first selected brand)
      if (formData.brand_ids && formData.brand_ids.length > 0) {
        formDataToSend.append("brand_id", formData.brand_ids[0]);
      } else if (formData.brand_id) {
        formDataToSend.append("brand_id", formData.brand_id);
      }
      
      // Only append image if it's a File (i.e., a new image was selected)
      if (formData.image && formData.image instanceof File) {
        formDataToSend.append("image", formData.image);
      }

      if (formData.id) {
        await sliderService.updateSlider(formData.id, formDataToSend);
        
        // Assign slider to multiple brands
        if (formData.brand_ids && formData.brand_ids.length > 0) {
          await sliderService.assignSliderToBrands(formData.id, formData.brand_ids);
        }
        
        toast.success("Slider updated successfully");
      } else {
        const response = await sliderService.createSlider(formDataToSend);
        const sliderId = response.data?.id || response.id;
        
        // Assign slider to multiple brands
        if (sliderId && formData.brand_ids && formData.brand_ids.length > 0) {
          await sliderService.assignSliderToBrands(sliderId, formData.brand_ids);
        }
        
        toast.success("Slider created successfully");
      }

      handleModalClose();
      fetchSliders();
    } catch (err) {
      setError(err.message || "Failed to save slider");
      toast.error(err.message || "Failed to save slider");
    } finally {
      setLoading(false);
    }
  };

  if (authLoading) {
    return (
      <div style={{ position: 'relative', minHeight: '400px' }}>
        <Loader />
      </div>
    );
  }

  if (!user || user.role !== 'admin') {
    return null;
  }

  return (
    <>
    <div className="dashboard-page">
        <div className="seo-header-container">
          <h1 className="seo-title">Slider Management</h1>
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
              Add New Slider
            </Button>
          </div>
        </div>

        {/* Table Section */}
        <div className="seo-table-container">
          {loading ? (
            <div style={{ position: 'relative', minHeight: '400px', zIndex: '1' }}>
              <Loader />
            </div>
          ) : error ? (
            <div className="seo-error">{error}</div>
          ) : (
            <>
              {filteredData.length === 0 ? (
                <div className="seo-empty-state">
                  {filterValue ? "No results found for your search" : "No sliders found"}
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

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        title={formData.id ? "Edit Slider" : "Add New Slider"}
        closeOnOverlayClick={false}
      >
        <form onSubmit={handleSubmit} className="seo-form">
          <div className="modal-body">
            <Input
              label="Title"
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              required
            />
            <Input
              label="Description"
              type="textarea"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              required
            />
            <Input
              label="Category"
              type="select"
              name="categoryId"
              value={formData.categoryId}
              onChange={handleInputChange}
              options={[
                { value: "", label: "Select Category" },
                ...categories.map(category => ({
                  value: category.id,
                  label: category.name
                }))
              ]}
            />
            <div className="input-field">
              <label className="input-field-label">Brands (Hold Ctrl/Cmd to select multiple)</label>
              <select
                name="brand_ids"
                multiple
                value={formData.brand_ids}
                onChange={handleInputChange}
                className="input-field"
                style={{ minHeight: '120px' }}
                required
              >
                {brands.map(brand => (
                  <option key={brand.id} value={brand.id}>
                    {brand.display_name || brand.name}
                  </option>
                ))}
              </select>
              {formData.brand_ids && formData.brand_ids.length > 0 && (
                <div style={{ marginTop: '8px', fontSize: '12px', color: '#666' }}>
                  Selected: {formData.brand_ids.map(id => {
                    const brand = brands.find(b => b.id === id);
                    return brand ? (brand.display_name || brand.name) : '';
                  }).filter(Boolean).join(', ')}
                </div>
              )}
            </div>
            <Input
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
            <Input
              label="Button Text"
              type="text"
              name="buttonText"
              value={formData.buttonText}
              onChange={handleInputChange}
            />
            <div className="input-field">
              <label className="input-field-label">Slider Image</label>
              <input
                type="file"
                accept="image/*"
                className="input-field"
                onChange={handleInputChange}
                name="image"
                required={!formData.id}
                key={formData.id || 'new'} // force reset on modal open/close
              />
              {formData.image && (
                <div style={{ width: '300px', position: 'relative', marginTop: '10px' }}>
                  <img
                    src={typeof formData.image === 'string'
                      ? getImageUrl(formData.image)
                      : URL.createObjectURL(formData.image)}
                    alt="Slider Preview"
                    style={{ width: '100%', objectFit: 'contain'}}
                  />
                </div>
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

