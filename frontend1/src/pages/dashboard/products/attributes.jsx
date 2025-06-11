import { useState, useEffect, useCallback } from "react";
import Button from "@/components/common/Button";
import InputField from "@/components/common/InputField";
import Modal from "@/components/common/Modal";
import Table from "@/components/common/Table";
import Pagination from "@/components/common/Pagination";
import { attributeService } from "@/services";
import { debounce } from 'lodash';
import "../../../styles/dashboard/seo.css";

export default function Attributes() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [filterValue, setFilterValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [attributes, setAttributes] = useState([]);
  const [formData, setFormData] = useState({
    name: "",
    type: "select",
    isRequired: false,
    values: ""
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

  // Fetch attributes data
  const fetchAttributes = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await attributeService.getAllAttributes();
      setAttributes(data);
    } catch (err) {
      setError(err.message || "Failed to fetch attributes");
      console.error("Error fetching attributes:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAttributes();
  }, []);

  // Enhanced filter function
  const filteredData = attributes.filter(item => {
    if (!filterValue) return true;
    
    const searchTerm = filterValue.toLowerCase();
    return (
      (item.name?.toLowerCase().includes(searchTerm)) ||
      (item.type?.toLowerCase().includes(searchTerm))
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
    { header: "Type", accessor: "type" },
    { 
      header: "Values", 
      accessor: row => row.AttributeValues?.map(v => v.value).join(", ") || "N/A"
    },
    { 
      header: "Required", 
      accessor: row => row.isRequired ? "Yes" : "No"
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
      const data = await attributeService.getAttributeById(id);
      setFormData({
        id: data.id,
        name: data.name || "",
        type: data.type || "select",
        isRequired: data.isRequired || false,
        values: data.AttributeValues?.map(v => v.value).join(", ") || ""
      });
      setIsModalOpen(true);
    } catch (err) {
      setError(err.message || "Failed to fetch attribute data");
      console.error("Error fetching attribute data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this attribute?")) {
      try {
        setLoading(true);
        await attributeService.deleteAttribute(id);
        await fetchAttributes();
      } catch (err) {
        setError(err.message || "Failed to delete attribute");
        console.error("Error deleting attribute:", err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleAddNew = () => {
    setFormData({
      name: "",
      type: "select",
      isRequired: false,
      values: ""
    });
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setFormData({
      name: "",
      type: "select",
      isRequired: false,
      values: ""
    });
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    console.log('Input Change:', {
      name,
      value,
      type,
      currentFormData: formData
    });
    
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const attributeData = {
        name: formData.name,
        type: formData.type,
        isRequired: formData.isRequired,
        values: formData.values.split(',').map(v => v.trim()).filter(v => v)
      };

      if (formData.id) {
        await attributeService.updateAttribute(formData.id, attributeData);
      } else {
        await attributeService.createAttribute(attributeData);
      }
      await fetchAttributes();
      setIsModalOpen(false);
      setFormData({
        name: "",
        type: "select",
        isRequired: false,
        values: ""
      });
    } catch (err) {
      setError(err.message || "Failed to save attribute");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-page">
      <div className="seo-header-container">
        <h1 className="seo-title">Attributes Management</h1>
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
          <Button variant="primary" onClick={handleAddNew}>
            Add New Attribute
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
                {filterValue ? "No results found for your search" : "No attributes found"}
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

      {/* Modal */}
      <Modal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        title={formData.id ? "Edit Attribute" : "Add New Attribute"}
      >
        <form onSubmit={handleSubmit} className="seo-form">
          <div className="modal-body">
            <InputField
              label="Attribute Name"
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              required
            />
            <InputField
              label="Type"
              type="select"
              name="type"
              value={formData.type}
              onChange={handleInputChange}
              required
              options={[
                { value: "select", label: "Select" },
                { value: "text", label: "Text" }
              ]}
            />
            <InputField
              label="Values (comma-separated)"
              type="text"
              name="values"
              value={formData.values}
              onChange={handleInputChange}
              placeholder="For select type only"
            />
            <div className="flex items-center mt-4">
              <input
                type="checkbox"
                name="isRequired"
                id="isRequired"
                checked={formData.isRequired}
                onChange={handleInputChange}
                className="mr-2"
              />
              <label htmlFor="isRequired">Required</label>
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
    </div>
  );
} 