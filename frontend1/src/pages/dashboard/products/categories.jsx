import { useState, useEffect, useCallback } from "react";
import Button from "@/components/common/Button";
import InputField from "@/components/common/InputField";
import Modal from "@/components/common/Modal";
import Table from "@/components/common/Table";
import Pagination from "@/components/common/Pagination";
import { categoryService } from "@/services";
import { debounce } from 'lodash';
import "../../../styles/dashboard/seo.css";

export default function Categories() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [filterValue, setFilterValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [categories, setCategories] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    description: "",
    status: "active",
    metaKeywords: "",
    image: null
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

  // Fetch categories data
  const fetchCategories = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await categoryService.getAllCategories();
      setCategories(data);
    } catch (err) {
      setError(err.message || "Failed to fetch categories");
      console.error("Error fetching categories:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCategories();
  }, []);

  // Enhanced filter function
  const filteredData = categories.filter(item => {
    if (!filterValue) return true;
    
    const searchTerm = filterValue.toLowerCase();
    return (
      (item.name?.toLowerCase().includes(searchTerm)) ||
      (item.description?.toLowerCase().includes(searchTerm)) ||
      (item.parentName?.toLowerCase().includes(searchTerm))
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
    { header: "Name", accessor: "name" },
    { header: "Description", accessor: "description" },
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
      const data = await categoryService.getCategoryById(id);
      setFormData({
        id: data.id,
        name: data.name || "",
        description: data.description || "",
        status: data.status || "active",
        metaKeywords: data.metaKeywords || "",
        image: data.image || null
      });
      setIsModalOpen(true);
    } catch (err) {
      setError(err.message || "Failed to fetch category data");
      console.error("Error fetching category data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this category?")) {
      try {
        setLoading(true);
        await categoryService.deleteCategory(id);
        await fetchCategories();
      } catch (err) {
        setError(err.message || "Failed to delete category");
        console.error("Error deleting category:", err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleAddNew = () => {
    setFormData({
      name: "",
      description: "",
      status: "active",
      metaKeywords: "",
      image: null
    });
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setFormData({
      name: "",
      description: "",
      status: "active",
      metaKeywords: "",
      image: null
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
    
    setFormData(prev => {
      const newData = {
        ...prev,
        [name]: type === 'file' ? e.target.files[0] : value
      };

      // Automatically generate meta title and description
      if (name === 'name') {
        newData.metaTitle = value;
      }
      if (name === 'description') {
        newData.metaDescription = value;
      }

      console.log('New Form Data:', newData);
      return newData;
    });
  };

  const handleImageChange = (e) => {
    const file = e.target.files[0];
    console.log('Image Change:', {
      file,
      currentFormData: formData
    });
    
    if (file) {
      setFormData(prev => {
        const newData = {
          ...prev,
          image: file
        };
        console.log('New Form Data with Image:', newData);
        return newData;
      });
    }
  };

  const handleCopyToMeta = (field) => {
    if (field === 'title') {
      setFormData(prev => ({ ...prev, metaTitle: prev.name }));
    } else if (field === 'description') {
      setFormData(prev => ({ ...prev, metaDescription: prev.description }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Form Submit:', {
      formData,
      isEdit: !!formData.id
    });
    
    try {
      setLoading(true);
      const formDataToSend = new FormData();
      
      // Append all form fields to FormData
      Object.keys(formData).forEach(key => {
        if (key === 'image' && formData[key] instanceof File) {
          formDataToSend.append('image', formData[key]);
        } else if (key !== 'id' && formData[key] !== null && formData[key] !== undefined) {
          formDataToSend.append(key, formData[key]);
        }
      });

      console.log('FormData being sent:', {
        formDataToSend: Object.fromEntries(formDataToSend.entries())
      });

      if (formData.id) {
        await categoryService.updateCategory(formData.id, formDataToSend);
      } else {
        await categoryService.createCategory(formDataToSend);
      }
      await fetchCategories();
      setIsModalOpen(false);
      setFormData({
        name: "",
        description: "",
        status: "active",
        metaKeywords: "",
        image: null
      });
    } catch (err) {
      console.error('Submit Error:', err);
      setError(err.message || "Failed to save category");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="dashboard-page">
        <div className="seo-header-container">
          <h1 className="seo-title">Categories Management</h1>
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
              Add New Category
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
                  {filterValue ? "No results found for your search" : "No categories found"}
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
        title={formData.id ? "Edit Category" : "Add New Category"}
      >
        <form onSubmit={handleSubmit} className="seo-form">
          <div className="modal-body">
            <InputField
              label="Category Name"
              type="text"
              name="name"
              value={formData.name}
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
              label="Meta Keywords"
              type="text"
              name="metaKeywords"
              value={formData.metaKeywords}
              onChange={handleInputChange}
            />
            <div className="input-field">
              <label className="input-field-label">Category Image</label>
              <input
                type="file"
                accept="image/*"
                className="input-field"
                onChange={e => {
                  const file = e.target.files[0];
                  if (file) {
                    const reader = new FileReader();
                    reader.onload = ev => {
                      setFormData(prev => ({ ...prev, image: ev.target.result }));
                    };
                    reader.readAsDataURL(file);
                  }
                }}
              />
              {formData.image && (
                <img 
                  src={typeof formData.image === 'string' ? formData.image : URL.createObjectURL(formData.image)} 
                  alt="Category Preview" 
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