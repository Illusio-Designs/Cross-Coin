import { useState, useEffect } from "react";
import Button from "@/components/common/Button";
import InputField from "@/components/common/InputField";
import Modal from "@/components/common/Modal";
import Table from "@/components/common/Table";
import Pagination from "@/components/common/Pagination";
import { attributeService } from "@/services";
import "../../../styles/dashboard/seo.css";

export default function Attributes() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [attributes, setAttributes] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [formData, setFormData] = useState({
    name: "",
    type: "",
    isRequired: false,
    values: ""
  });

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

  // Preprocess attributes for table display
  const processedAttributes = attributes.map((attr, idx) => ({
    ...attr,
    serial_number: idx + 1,
    type_label: attr.type ? attr.type.charAt(0).toUpperCase() + attr.type.slice(1) : "-",
    values_label:
      attr.type === "select" && attr.AttributeValues && attr.AttributeValues.length > 0
        ? attr.AttributeValues.map(v => v.value).join(", ")
        : attr.type === "text"
        ? "Text Input"
        : "-",
    required_label: attr.isRequired ? "Required" : "Optional"
  }));

  // Pagination
  const totalPages = Math.ceil(processedAttributes.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = processedAttributes.slice(indexOfFirstItem, indexOfLastItem);

  // Add serial number to current items
  const currentItemsWithSN = currentItems.map((item, idx) => ({
    ...item,
    serial_number: indexOfFirstItem + idx + 1
  }));

  // Columns definition
  const columns = [
    { header: "S/N", accessor: "serial_number" },
    { header: "Name", accessor: "name" },
    { header: "Type", accessor: "type_label" },
    { header: "Required", accessor: "required_label" },
    {
      header: "Actions",
      accessor: "actions",
      cell: ({ id }) => (
        <div className="action-buttons">
          <button 
            className="action-btn edit" 
            title="Edit Attribute" 
            onClick={() => handleEdit(id)}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a4 4 0 01-1.414.828l-4.243 1.414 1.414-4.243a4 4 0 01.828-1.414z"/>
            </svg>
          </button>
          <button 
            className="action-btn delete" 
            title="Delete Attribute" 
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
      const data = await attributeService.getAttributeById(id);
      if (!data) {
        throw new Error('Attribute not found');
      }
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
      type: "",
      isRequired: false,
      values: ""
    });
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setFormData({
      name: "",
      type: "",
      isRequired: false,
      values: ""
    });
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    
    setFormData(prev => {
      const newData = {
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      };

      // If type is changed to 'text', clear the values
      if (name === 'type' && value === 'text') {
        newData.values = '';
      }

      return newData;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setError(null);

      // Validate form data
      if (!formData.name.trim()) {
        throw new Error('Attribute name is required');
      }

      if (formData.type === 'select' && !formData.values.trim()) {
        throw new Error('Values are required for select type attributes');
      }

      const attributeData = {
        name: formData.name.trim(),
        type: formData.type,
        isRequired: formData.isRequired,
        values: formData.type === 'select' 
          ? formData.values.split(',').map(v => v.trim()).filter(v => v)
          : []
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
        type: "",
        isRequired: false,
        values: ""
      });
    } catch (err) {
      setError(err.message || "Failed to save attribute");
      console.error("Error saving attribute:", err);
    } finally {
      setLoading(false);
    }
  };

  // Add this CSS to your existing styles
  const styles = `
    .required-badge {
      background-color: #dc2626;
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
    }

    .optional-badge {
      background-color: #6b7280;
      color: white;
      padding: 4px 8px;
      border-radius: 4px;
      font-size: 12px;
    }

    .seo-table-container table {
      width: 100%;
      border-collapse: collapse;
    }

    .seo-table-container th,
    .seo-table-container td {
      padding: 12px;
      text-align: left;
      border-bottom: 1px solid #e5e7eb;
    }

    .seo-table-container th {
      background-color: #f9fafb;
      font-weight: 600;
    }

    .seo-table-container tr:hover {
      background-color: #f9fafb;
    }
  `;

  // Add the styles to the document
  useEffect(() => {
    const styleSheet = document.createElement("style");
    styleSheet.textContent = styles;
    document.head.appendChild(styleSheet);
    return () => {
      document.head.removeChild(styleSheet);
    };
  }, []);

  return (
    <div className="dashboard-page">
      <div className="seo-header-container">
        <h1 className="seo-title">Attributes Management</h1>
        <div className="adding-button">
          <Button variant="primary" onClick={handleAddNew}>
            Add New Attribute
          </Button>
        </div>
      </div>

      {error && (
        <div className="error-message">
          {error}
        </div>
      )}

      {/* Table Section */}
      <div className="seo-table-container">
        {loading ? (
          <div className="seo-loading">Loading...</div>
        ) : (
          <>
            {attributes.length === 0 ? (
              <div className="seo-empty-state">
                No attributes found. Click "Add New Attribute" to create one.
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
                {processedAttributes.length > itemsPerPage && (
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
              placeholder="Enter attribute name"
            />
            <InputField
              label="Type"
              type="select"
              name="type"
              value={formData.type}
              onChange={handleInputChange}
              required
              options={[
                { value: "", label: "Select type...", disabled: true },
                { value: "select", label: "Select" },
                { value: "text", label: "Text" }
              ]}
            />
            {formData.type === 'select' && (
              <InputField
                label="Values (comma-separated)"
                type="text"
                name="values"
                value={formData.values}
                onChange={handleInputChange}
                placeholder="Enter values separated by commas"
                required
                helpText="Enter multiple values separated by commas (e.g., Red, Blue, Green)"
              />
            )}
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