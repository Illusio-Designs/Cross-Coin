import { useState, useEffect, useCallback } from "react";
import Button from "@/components/common/Button";
import InputField from "@/components/common/InputField";
import Modal from "@/components/common/Modal";
import Table from "@/components/common/Table";
import Pagination from "@/components/common/Pagination";
import { sliderService, categoryService } from "@/services";
import { debounce } from 'lodash';
import { useRouter } from 'next/router';
import { useAuth } from '../../../context/AuthContext';
import Image from 'next/image';
import "../../../styles/dashboard/seo.css";
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
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    status: "active",
    image: null,
    categoryId: "",
    buttonText: "",
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
      console.error("Error fetching categories:", err);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

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

  // Fetch sliders data
  const fetchSliders = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await sliderService.getAllSliders();
      console.log('API Response:', response);
      
      if (Array.isArray(response)) {
        setSliders(response);
        console.log('Sliders data:', response);
        console.log('Image URLs:', response.map(slider => `${process.env.NEXT_PUBLIC_API_URL}${slider.image}`));
      } else if (response.sliders && Array.isArray(response.sliders)) {
        setSliders(response.sliders);
        console.log('Sliders data:', response.sliders);
        console.log('Image URLs:', response.sliders.map(slider => `${process.env.NEXT_PUBLIC_API_URL}${slider.image}`));
      } else {
        console.warn('Unexpected response format:', response);
        setSliders([]);
      }
    } catch (err) {
      console.error('Error fetching sliders:', err);
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

  // Columns definition
  const columns = [
    {
      header: "S/N",
      accessor: "serial_number"
    },
    { 
      header: "Image", 
      accessor: "image",
      cell: ({ image }) => (
        <div style={{ width: '100px', height: '60px', position: 'relative' }}>
          <img 
            src={image}
            alt="Slider" 
            style={{ width: '100%', height: '100%', objectFit: 'cover' }}
          />
        </div>
      )
    },
    { header: "Title", accessor: "title" },
    { header: "Description", accessor: "description" },
    { header: "Category", accessor: "categoryName" },
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
      const response = await sliderService.getSliderById(id);
      const data = response.slider || response; // Handle both response formats
      console.log('Edit slider data:', data);
      setFormData({
        id: data.id,
        title: data.title || "",
        description: data.description || "",
        status: data.status || "active",
        categoryId: data.categoryId || "",
        image: data.image || null,
        buttonText: data.buttonText || ""
      });
      setIsModalOpen(true);
    } catch (err) {
      setError(err.message || "Failed to fetch slider data");
      console.error("Error fetching slider data:", err);
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
      } catch (err) {
        setError(err.message || "Failed to delete slider");
        console.error("Error deleting slider:", err);
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
      buttonText: ""
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
      buttonText: ""
    });
  };

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    console.log('Input Change:', {
      name,
      value,
      type,
      currentFormData: formData
    });
    
    if (type === 'file') {
      setFormData(prev => ({
        ...prev,
        [name]: e.target.files[0]
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
      
      if (formData.image instanceof File) {
        formDataToSend.append("image", formData.image);
      }

      if (formData.id) {
        await sliderService.updateSlider(formData.id, formDataToSend);
        toast.success("Slider updated successfully");
      } else {
        await sliderService.createSlider(formDataToSend);
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
    return <div className="seo-loading">Loading...</div>;
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
            <div className="seo-loading">Loading...</div>
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
                  >
                    {currentItems.map((slider) => {
                      const imageUrl = `${process.env.NEXT_PUBLIC_API_URL}${slider.image}`;
                      console.log('Rendering slider image URL:', imageUrl);
                      return (
                        <tr key={slider.id}>
                          <td>
                            <img 
                              src={imageUrl}
                              alt={slider.title} 
                              className="seo-image-preview" 
                            />
                          </td>
                        </tr>
                      );
                    })}
                  </Table>
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
        title={formData.id ? "Edit Slider" : "Add New Slider"}
      >
        <form onSubmit={handleSubmit} className="seo-form">
          <div className="modal-body">
            <InputField
              label="Title"
              type="text"
              name="title"
              value={formData.title}
              onChange={handleInputChange}
              required
            />
            <InputField
              label="Description"
              type="textarea"
              name="description"
              value={formData.description}
              onChange={handleInputChange}
              required
            />
            <InputField
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
            <InputField
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
              />
              {formData.image && (
                <div style={{ width: '300px', height: '125px', position: 'relative', marginTop: '10px' }}>
                  <img 
                    src={typeof formData.image === 'string' 
                      ? formData.image 
                      : URL.createObjectURL(formData.image)} 
                    alt="Slider Preview" 
                    style={{ width: '100%', objectFit: 'cover' }}
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