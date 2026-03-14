import { useState, useEffect, useCallback } from "react";
import { Button, Input, Modal, Table, Pagination } from "@/components/ui";
import Loader from "@/components/Loader";
import { couponService } from "@/services";
import { debounce } from 'lodash';

export default function Coupons() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [filterValue, setFilterValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [coupons, setCoupons] = useState([]);
  const [formData, setFormData] = useState({
    code: "",
    description: "",
    type: "percentage",
    value: "",
    minPurchase: "",
    maxDiscount: "",
    usageLimit: "",
    usageCount: "",
    perUserLimit: "",
    status: "active",
    applicableCategories: [],
    applicableProducts: [],
    startDate: "",
    endDate: "",
    // New fields
    paymentModeRestriction: "all",
    firstOrderOnly: false,
    tieredDiscounts: [],
    quantityBasedDiscounts: []
  });

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

  // Fetch coupons data
  const fetchCoupons = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await couponService.getAllCoupons();
      if (data && Array.isArray(data.coupons)) {
        setCoupons(data.coupons);
      } else {
        setCoupons([]); // Set to empty array if data is not in expected format
        console.error("Fetched data does not contain a coupons array:", data);
      }
    } catch (err) {
      setError(err.message || "Failed to fetch coupons");
      console.error("Error fetching coupons:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCoupons();
  }, []);

  // Enhanced filter function
  const filteredData = coupons.filter(item => {
    if (!filterValue) return true;
    const searchTerm = filterValue.toLowerCase();
    return (
      (item.code?.toLowerCase().includes(searchTerm)) ||
      (item.description?.toLowerCase().includes(searchTerm))
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
    { header: "S/N", accessor: "serial_number" },
    { header: "Code", accessor: "code" },
    { header: "Description", accessor: row => (
      <div style={{ maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis' }}>
        {row.description || 'No description'}
      </div>
    )},
    { header: "Type", accessor: row => (
      <span style={{
        backgroundColor: row.type === 'percentage' ? '#E3F2FD' : '#FFF3E0',
        color: row.type === 'percentage' ? '#1976D2' : '#F57C00',
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: '500'
      }}>
        {row.type === 'percentage' ? `${row.value}%` : `₹${row.value}`}
      </span>
    )},
    { header: "Min Purchase", accessor: row => row.minPurchase ? `₹${row.minPurchase}` : 'No minimum' },
    { header: "Usage", accessor: row => (
      <span>
        {row.usageCount || 0} / {row.usageLimit || '∞'}
      </span>
    )},
    { header: "Status", accessor: row => (
      <span style={{
        backgroundColor: row.status === 'active' ? '#E8F5E8' : '#FFEBEE',
        color: row.status === 'active' ? '#2E7D32' : '#C62828',
        padding: '4px 8px',
        borderRadius: '4px',
        fontSize: '12px',
        fontWeight: '500'
      }}>
        {row.status.charAt(0).toUpperCase() + row.status.slice(1)}
      </span>
    )},
    { header: "Valid Until", accessor: row => {
      if (!row.endDate) return 'No expiry';
      const endDate = new Date(row.endDate);
      const now = new Date();
      const isExpired = endDate < now;
      return (
        <span style={{ color: isExpired ? '#C62828' : '#2E7D32' }}>
          {endDate.toLocaleDateString()}
        </span>
      );
    }},
    {
      header: "Actions",
      accessor: "actions",
      cell: ({ id }) => (
        <div className="action-buttons">
          <button
            className="action-btn edit"
            title="Edit Coupon"
            onClick={() => handleEdit(id)}
          >
            <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a4 4 0 01-1.414.828l-4.243 1.414 1.414-4.243a4 4 0 01.828-1.414z"/>
            </svg>
          </button>
          <button
            className="action-btn delete"
            title="Delete Coupon"
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
      const data = await couponService.getCouponById(id);
      
      // Format dates properly for date inputs
      const formatDateForInput = (dateString) => {
        if (!dateString) return "";
        const date = new Date(dateString);
        return date.toISOString().split('T')[0];
      };
      
      setFormData({
        id: data.id,
        code: data.code || "",
        description: data.description || "",
        type: data.type || "percentage",
        value: data.value || "",
        minPurchase: data.minPurchase || "",
        maxDiscount: data.maxDiscount || "",
        usageLimit: data.usageLimit || "",
        usageCount: data.usageCount || "",
        perUserLimit: data.perUserLimit || "",
        status: data.status || "active",
        applicableCategories: data.applicableCategories || [],
        applicableProducts: data.applicableProducts || [],
        startDate: formatDateForInput(data.startDate),
        endDate: formatDateForInput(data.endDate),
        // New fields
        paymentModeRestriction: data.paymentModeRestriction || "all",
        firstOrderOnly: data.firstOrderOnly || false,
        tieredDiscounts: data.tieredDiscounts || [],
        quantityBasedDiscounts: data.quantityBasedDiscounts || []
      });
      setIsModalOpen(true);
    } catch (err) {
      setError(err.message || "Failed to fetch coupon data");
      console.error("Error fetching coupon data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this coupon?")) {
      try {
        setLoading(true);
        await couponService.deleteCoupon(id);
        await fetchCoupons();
      } catch (err) {
        setError(err.message || "Failed to delete coupon");
        console.error("Error deleting coupon:", err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleAddNew = () => {
    setFormData({
      code: "",
      description: "",
      type: "percentage",
      value: "",
      minPurchase: "",
      maxDiscount: "",
      usageLimit: "",
      usageCount: "",
      perUserLimit: "",
      status: "active",
      applicableCategories: [],
      applicableProducts: [],
      startDate: "",
      endDate: "",
      // New fields
      paymentModeRestriction: "all",
      firstOrderOnly: false,
      tieredDiscounts: [],
      quantityBasedDiscounts: []
    });
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setFormData({
      code: "",
      description: "",
      type: "percentage",
      value: "",
      minPurchase: "",
      maxDiscount: "",
      usageLimit: "",
      usageCount: "",
      perUserLimit: "",
      status: "active",
      applicableCategories: [],
      applicableProducts: [],
      startDate: "",
      endDate: "",
      // New fields
      paymentModeRestriction: "all",
      firstOrderOnly: false,
      tieredDiscounts: [],
      quantityBasedDiscounts: []
    });
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null); // Clear previous errors
    
    // Validation
    if (!formData.code.trim()) {
      setError("Coupon code is required");
      return;
    }
    
    if (!formData.description.trim()) {
      setError("Description is required");
      return;
    }
    
    if (!formData.value || formData.value <= 0) {
      setError("Discount value must be greater than 0");
      return;
    }
    
    if (formData.type === 'percentage' && formData.value > 100) {
      setError("Percentage discount cannot exceed 100%");
      return;
    }
    
    if (formData.minPurchase && formData.minPurchase < 0) {
      setError("Minimum purchase amount cannot be negative");
      return;
    }
    
    if (formData.maxDiscount && formData.maxDiscount < 0) {
      setError("Maximum discount amount cannot be negative");
      return;
    }
    
    if (!formData.startDate || !formData.endDate) {
      setError("Start date and end date are required");
      return;
    }
    
    if (new Date(formData.endDate) <= new Date(formData.startDate)) {
      setError("End date must be after start date");
      return;
    }
    
    try {
      setLoading(true);
      const couponData = { ...formData };

      // Convert comma-separated strings to arrays of numbers
      if (typeof couponData.applicableCategories === 'string') {
        couponData.applicableCategories = couponData.applicableCategories.split(',').map(s => Number(s.trim())).filter(n => !isNaN(n) && n > 0);
      }
      if (typeof couponData.applicableProducts === 'string') {
        couponData.applicableProducts = couponData.applicableProducts.split(',').map(s => Number(s.trim())).filter(n => !isNaN(n) && n > 0);
      }
      
      // Sanitize numeric fields
      const numericFields = ['value', 'minPurchase', 'maxDiscount', 'usageLimit', 'perUserLimit'];
      numericFields.forEach(field => {
        if (couponData[field] === '' || couponData[field] === null || couponData[field] === undefined) {
          couponData[field] = null;
        } else {
          couponData[field] = Number(couponData[field]);
        }
      });
      
      // usageCount should not be sent, it is managed by the backend.
      delete couponData.usageCount;

      if (formData.id) {
        delete couponData.id;
        await couponService.updateCoupon(formData.id, couponData);
      } else {
        await couponService.createCoupon(couponData);
      }
      await fetchCoupons();
      setIsModalOpen(false);
      setFormData({
        code: "",
        description: "",
        type: "percentage",
        value: "",
        minPurchase: "",
        maxDiscount: "",
        usageLimit: "",
        usageCount: "",
        perUserLimit: "",
        status: "active",
        applicableCategories: [],
        applicableProducts: [],
        startDate: "",
        endDate: "",
        // New fields
        paymentModeRestriction: "all",
        firstOrderOnly: false,
        tieredDiscounts: [],
        quantityBasedDiscounts: []
      });
    } catch (err) {
      setError(err.message || "Failed to save coupon");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="dashboard-page">
        <div className="seo-header-container">
          <h1 className="seo-title">Coupons Management</h1>
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
              Add New Coupon
            </Button>
          </div>
        </div>
        {/* Table Section */}
        <div className="seo-table-container">
          {loading ? (
            <div style={{ position: 'relative', minHeight: '400px', zIndex: '1' }}>
              <Loader />
            </div>
          ) : (
            <>
              {filteredData.length === 0 ? (
                <div className="seo-empty-state">
                  {filterValue ? "No results found for your search" : "No coupons found"}
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
        title={formData.id ? "Edit Coupon" : "Add New Coupon"}
        closeOnOverlayClick={false}
      >
        <form onSubmit={handleSubmit} className="seo-form">
          {error && <div className="modal-error-banner">{error}</div>}
          <div className="modal-body">
            <Input
              label="Coupon Code"
              type="text"
              name="code"
              value={formData.code}
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
              label="Discount Type"
              type="select"
              name="type"
              value={formData.type}
              onChange={handleInputChange}
              required
              options={[
                { value: "percentage", label: "Percentage" },
                { value: "fixed", label: "Fixed Amount" },
                { value: "tiered", label: "Tiered Discount" },
                { value: "quantity_based", label: "Quantity Based" }
              ]}
            />
            <Input
              label="Discount Value"
              type="number"
              name="value"
              value={formData.value}
              onChange={handleInputChange}
              required
            />
            <Input
              label="Minimum Purchase Amount"
              type="number"
              name="minPurchase"
              value={formData.minPurchase}
              onChange={handleInputChange}
            />
            <Input
              label="Maximum Discount Amount"
              type="number"
              name="maxDiscount"
              value={formData.maxDiscount}
              onChange={handleInputChange}
            />
            <Input
              label="Usage Limit"
              type="number"
              name="usageLimit"
              value={formData.usageLimit}
              onChange={handleInputChange}
            />
            <Input
              label="Usage Count"
              type="number"
              name="usageCount"
              value={formData.usageCount}
              onChange={handleInputChange}
              disabled
            />
            <Input
              label="Per User Limit"
              type="number"
              name="perUserLimit"
              value={formData.perUserLimit}
              onChange={handleInputChange}
            />
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
              label="Applicable Category IDs"
              type="text"
              name="applicableCategories"
              value={Array.isArray(formData.applicableCategories) ? formData.applicableCategories.join(', ') : formData.applicableCategories}
              onChange={handleInputChange}
              placeholder="e.g., 1, 2, 3"
            />
            <Input
              label="Applicable Product IDs"
              type="text"
              name="applicableProducts"
              value={Array.isArray(formData.applicableProducts) ? formData.applicableProducts.join(', ') : formData.applicableProducts}
              onChange={handleInputChange}
              placeholder="e.g., 101, 102"
            />
            <Input
              label="Start Date"
              type="date"
              name="startDate"
              value={formData.startDate}
              onChange={handleInputChange}
            />
            <Input
              label="End Date"
              type="date"
              name="endDate"
              value={formData.endDate}
              onChange={handleInputChange}
            />
            
            {/* New Advanced Fields */}
            <div style={{ marginTop: '20px', borderTop: '1px solid #e0e0e0', paddingTop: '20px' }}>
              <h4 style={{ marginBottom: '15px', color: '#333' }}>Advanced Settings</h4>
              
              <Input
                label="Payment Mode Restriction"
                type="select"
                name="paymentModeRestriction"
                value={formData.paymentModeRestriction}
                onChange={handleInputChange}
                options={[
                  { value: "all", label: "All Payment Modes" },
                  { value: "cod", label: "Cash on Delivery Only" },
                  { value: "prepaid", label: "Prepaid Only" }
                ]}
              />
              
              <Input
                label="First Order Only"
                type="select"
                name="firstOrderOnly"
                value={formData.firstOrderOnly}
                onChange={handleInputChange}
                options={[
                  { value: false, label: "No" },
                  { value: true, label: "Yes" }
                ]}
              />
              
              {formData.type === 'tiered' && (
                <div style={{ marginTop: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                    Tiered Discounts (JSON format)
                  </label>
                  <textarea
                    name="tieredDiscounts"
                    value={JSON.stringify(formData.tieredDiscounts, null, 2)}
                    onChange={(e) => {
                      try {
                        const parsed = JSON.parse(e.target.value);
                        setFormData(prev => ({ ...prev, tieredDiscounts: parsed }));
                      } catch (err) {
                        // Invalid JSON, keep the text as is for user to fix
                        setFormData(prev => ({ ...prev, tieredDiscounts: e.target.value }));
                      }
                    }}
                    placeholder='[{"minAmount": 0, "discount": 100}, {"minAmount": 1000, "discount": 150}]'
                    rows="4"
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontFamily: 'monospace'
                    }}
                  />
                  <small style={{ color: '#666', fontSize: '12px' }}>
                    Example: {`[{"minAmount": 0, "discount": 100}, {"minAmount": 1000, "discount": 150}]`}
                  </small>
                </div>
              )}
              
              {formData.type === 'quantity_based' && (
                <div style={{ marginTop: '15px' }}>
                  <label style={{ display: 'block', marginBottom: '8px', fontWeight: '500' }}>
                    Quantity Based Discounts (JSON format)
                  </label>
                  <textarea
                    name="quantityBasedDiscounts"
                    value={JSON.stringify(formData.quantityBasedDiscounts, null, 2)}
                    onChange={(e) => {
                      try {
                        const parsed = JSON.parse(e.target.value);
                        setFormData(prev => ({ ...prev, quantityBasedDiscounts: parsed }));
                      } catch (err) {
                        // Invalid JSON, keep the text as is for user to fix
                        setFormData(prev => ({ ...prev, quantityBasedDiscounts: e.target.value }));
                      }
                    }}
                    placeholder='[{"minQuantity": 2, "discount": 50}, {"minQuantity": 3, "discount": 100}]'
                    rows="4"
                    style={{
                      width: '100%',
                      padding: '8px',
                      border: '1px solid #ddd',
                      borderRadius: '4px',
                      fontFamily: 'monospace'
                    }}
                  />
                  <small style={{ color: '#666', fontSize: '12px' }}>
                    Example: {`[{"minQuantity": 2, "discount": 50}, {"minQuantity": 3, "discount": 100}]`}
                  </small>
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
