import { useState, useEffect, useCallback } from "react";
import Button from "@/components/common/Button";
import Modal from "@/components/common/Modal";
import Table from "@/components/common/Table";
import Pagination from "@/components/common/Pagination";
import { sliderService, categoryService } from "@/services";
import { debounce } from 'lodash';
import "../../../styles/dashboard/slider.css";

export default function Slider() {
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
    categoryId: ""
  });

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
  const fetchSliders = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await sliderService.getAllSliders();
      console.log('Fetched sliders:', response); // Debug log
      if (response && response.sliders) {
        setSliders(response.sliders);
      } else {
        setSliders([]);
      }
    } catch (err) {
      setError(err.message || "Failed to fetch sliders");
      console.error("Error fetching sliders:", err);
      setSliders([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchSliders();
  }, []);

  // Enhanced filter function with array check
  const filteredData = Array.isArray(sliders) ? sliders.filter(item => {
    if (!filterValue) return true;
    
    const searchTerm = filterValue.toLowerCase();
    return (
      (item.title?.toLowerCase().includes(searchTerm)) ||
      (item.description?.toLowerCase().includes(searchTerm))
    );
  }) : [];

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
    { header: "Description", accessor: "description" },
    { header: "Category", accessor: "categoryName" },
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
      const data = await sliderService.getSliderById(id);
      setFormData({
        id: data.id,
        title: data.title || "",
        description: data.description || "",
        status: data.status || "active",
        categoryId: data.categoryId || "",
        image: data.image || null
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
      image: null
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
      image: null
    });
  };

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'file' ? e.target.files[0] : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const formDataToSend = new FormData();
      
      Object.keys(formData).forEach(key => {
        if (key === 'image' && formData[key] instanceof File) {
          formDataToSend.append('image', formData[key]);
        } else if (key !== 'id' && formData[key] !== null && formData[key] !== undefined) {
          formDataToSend.append(key, formData[key]);
        }
      });

      if (formData.id) {
        await sliderService.updateSlider(formData.id, formDataToSend);
      } else {
        await sliderService.createSlider(formDataToSend);
      }
      await fetchSliders(); // Refresh the table after creating/updating
      setIsModalOpen(false);
      setFormData({
        title: "",
        description: "",
        status: "active",
        categoryId: "",
        image: null
      });
    } catch (err) {
      console.error('Submit Error:', err);
      setError(err.message || "Failed to save slider");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="dashboard-page">
        <div className="seo-header-container">
          <h1 className="seo-title">Slider Management</h1>
          <div className="adding-button">
            <Button 
              variant="primary"
              onClick={handleAddNew}
              className="add-new-btn"
            >
              Add New Slider
            </Button>
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
        <div className="seo-table-container">
          {loading ? (
            <div className="seo-loading">Loading...</div>
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
            <div className="form-group">
              <label htmlFor="title">Title</label>
              <input
                type="text"
                id="title"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                required
                className="form-control"
              />
            </div>

            <div className="form-group">
              <label htmlFor="description">Description</label>
              <textarea
                id="description"
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                required
                className="form-control"
              />
            </div>

            <div className="form-group">
              <label htmlFor="categoryId">Category</label>
              <select
                id="categoryId"
                name="categoryId"
                value={formData.categoryId}
                onChange={handleInputChange}
                className="form-control"
              >
                <option value="">Select Category</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="status">Status</label>
              <select
                id="status"
                name="status"
                value={formData.status}
                onChange={handleInputChange}
                required
                className="form-control"
              >
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
              </select>
            </div>

            <div className="form-group">
              <label htmlFor="image">Slider Image</label>
              <input
                type="file"
                id="image"
                name="image"
                accept="image/*"
                onChange={handleInputChange}
                className="form-control"
              />
              {formData.image && (
                <img 
                  src={typeof formData.image === 'string' ? formData.image : URL.createObjectURL(formData.image)} 
                  alt="Slider Preview" 
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