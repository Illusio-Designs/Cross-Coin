import { useState, useEffect, useCallback } from "react";
import Button from "@/components/common/Button";
import InputField from "@/components/common/InputField";
import Modal from "@/components/common/Modal";
import Table from "@/components/common/Table";
import Pagination from "@/components/common/Pagination";
import { shippingFeeService } from "@/services";
import { debounce } from 'lodash';
import "../../../styles/dashboard/seo.css";

export default function ShippingFees() {
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [selectedFee, setSelectedFee] = useState(null);
  const [shippingFees, setShippingFees] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [filterValue, setFilterValue] = useState("");
  
  const [formData, setFormData] = useState({
    orderType: "cod",
    fee: ""
  });

  const debouncedSearch = useCallback(
    debounce((searchTerm) => {
      setFilterValue(searchTerm);
    }, 300),
    []
  );

  const handleSearchChange = (e) => {
    const value = e.target.value;
    debouncedSearch(value);
  };

  const fetchShippingFees = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await shippingFeeService.getAllShippingFees();
      setShippingFees(data);
    } catch (err) {
      setError(err.message || "Failed to fetch shipping fees");
      console.error("Error fetching shipping fees:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchShippingFees();
  }, []);

  const filteredData = shippingFees.filter(item => {
    if (!filterValue) return true;
    
    const searchTerm = filterValue.toLowerCase();
    return (
      (item.orderType?.toLowerCase().includes(searchTerm)) ||
      (item.fee?.toString().toLowerCase().includes(searchTerm))
    );
  });

  const totalPages = Math.ceil(filteredData.length / itemsPerPage);
  const indexOfLastItem = currentPage * itemsPerPage;
  const indexOfFirstItem = indexOfLastItem - itemsPerPage;
  const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem);

  const currentItemsWithSN = currentItems.map((item, idx) => ({
    ...item,
    serial_number: indexOfFirstItem + idx + 1
  }));

  useEffect(() => {
    setCurrentPage(1);
  }, [filterValue]);

  const columns = [
    {
      header: "S/N",
      accessor: "serial_number"
    },
    {
      header: "Order Type",
      accessor: row => row.orderType.toUpperCase()
    },
    {
      header: "Fee",
      accessor: row => `$${parseFloat(row.fee).toFixed(2)}`
    },
    {
      header: "Actions",
      accessor: "actions",
      cell: ({ id, ...row }) => (
        <div className="adding-button">
          <button
            className="action-btn edit"
            title="Edit"
            onClick={() => handleEdit(id, row)}
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

  const handleEdit = async (id, rowData) => {
    setSelectedFee({
      id: id,
      orderType: rowData.orderType || "cod",
      fee: parseFloat(rowData.fee || 0)
    });
        setIsEditModalOpen(true);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this shipping fee?")) {
      try {
        setLoading(true);
        await shippingFeeService.deleteShippingFee(id);
        await fetchShippingFees();
      } catch (err) {
        setError(err.message || "Failed to delete shipping fee");
        console.error("Error deleting shipping fee:", err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleAddNew = () => {
    setFormData({
      orderType: "cod",
      fee: ""
    });
    setIsAddModalOpen(true);
  };

  const handleModalClose = () => {
    setIsAddModalOpen(false);
    setIsEditModalOpen(false);
    setSelectedFee(null);
    setFormData({
      orderType: "cod",
      fee: ""
    });
  };

  const handleInputChange = (e) => {
    const { name, value, type } = e.target;
    if (isAddModalOpen) {
      setFormData(prev => ({
        ...prev,
        [name]: type === 'number' ? (value ? Number(value) : '') : value
      }));
    } else if (isEditModalOpen) {
      setSelectedFee(prev => ({
        ...prev,
        [name]: type === 'number' ? (value ? Number(value) : '') : value
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      
      if (selectedFee) {
        await shippingFeeService.updateShippingFee(selectedFee.id, {
          orderType: selectedFee.orderType,
          fee: selectedFee.fee
        });
      } else {
        await shippingFeeService.createShippingFee(formData);
      }
      await fetchShippingFees();
      handleModalClose();
    } catch (err) {
      setError(err.message || "Failed to save shipping fee");
      console.error("Error saving shipping fee:", err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dashboard-page">
      <div className="seo-header-container">
        <h1 className="seo-title">Shipping Fees Management</h1>
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
                placeholder="Search by Order Type or Fee"
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
          Add New Fee
        </Button>
        </div>
      </div>

      <div className="seo-table-container">
        {loading ? (
          <div className="seo-loading">Loading...</div>
        ) : (
          <>
            {filteredData.length === 0 ? (
              <div className="seo-empty-state">
                {filterValue ? "No results found for your search" : "No shipping fees found"}
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

      <Modal
        isOpen={isAddModalOpen}
        onClose={handleModalClose}
        title="Add New Shipping Fee"
      >
        <form onSubmit={handleSubmit} className="seo-form">
          <div className="modal-body">
            <InputField
              label="Order Type"
              type="select"
              name="orderType"
              value={formData.orderType}
              onChange={handleInputChange}
              options={[
                { value: "cod", label: "Cash On Delivery" },
                { value: "prepaid", label: "Prepaid" }
              ]}
              required
            />
              <InputField
              label="Fee"
                type="number"
              name="fee"
              value={formData.fee}
              onChange={handleInputChange}
              required
            />
          </div>
          <div className="modal-footer">
              <Button
                variant="secondary"
              size="medium"
              onClick={handleModalClose}
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
              {loading ? "Adding..." : "Add Fee"}
              </Button>
          </div>
        </form>
      </Modal>

      <Modal
        isOpen={isEditModalOpen}
        onClose={handleModalClose}
        title="Edit Shipping Fee"
      >
        {selectedFee && (
          <form onSubmit={handleSubmit} className="seo-form">
            <div className="modal-body">
              <InputField
                label="Order Type"
                type="select"
                name="orderType"
                value={selectedFee.orderType}
                onChange={handleInputChange}
                options={[
                  { value: "cod", label: "Cash On Delivery" },
                  { value: "prepaid", label: "Prepaid" }
                ]}
                required
              />
              <InputField
                label="Fee"
                type="number"
                name="fee"
                value={selectedFee.fee}
                onChange={handleInputChange}
                required
              />
            </div>
            <div className="modal-footer">
            <Button
              variant="secondary"
                size="medium"
                onClick={handleModalClose}
                type="button"
            >
              Cancel
            </Button>
                <Button
                  variant="primary"
                size="medium"
                  type="submit"
                disabled={loading}
                >
                {loading ? "Saving..." : "Save Changes"}
            </Button>
        </div>
          </form>
        )}
      </Modal>
    </div>
  );
} 