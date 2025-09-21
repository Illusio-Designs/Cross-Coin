import { useState, useEffect, useCallback } from "react";
import Button from "@/components/common/Button";
import InputField from "@/components/common/InputField";
import Modal from "@/components/common/Modal";
import Table from "@/components/common/Table";
import Pagination from "@/components/common/Pagination";
import { reviewService } from "@/services";
import { debounce } from 'lodash';
import "../../../styles/dashboard/reviews.css";

export default function Reviews() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [filterValue, setFilterValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [formData, setFormData] = useState({
    status: "pending",
    is_featured: false,
    admin_notes: ""
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

  // Fetch reviews data
  const fetchReviews = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await reviewService.getAllReviews();
      console.log('API Response:', response);
      
      const mappedReviews = response.map(review => ({
        id: review.id,
        customerName: review.customerName || 'Guest',
        productName: review.productName || 'N/A',
        rating: review.rating,
        review: review.review,
        status: review.status,
        is_featured: review.is_featured,
        admin_notes: review.admin_notes
      }));
      
      setReviews(mappedReviews);
    } catch (err) {
      setError(err.message || "Failed to fetch reviews");
      console.error("Error fetching reviews:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReviews();
  }, []);

  // Enhanced filter function
  const filteredData = reviews.filter(item => {
    if (!filterValue) return true;
    
    const searchTerm = filterValue.toLowerCase();
    return (
      (item.customerName?.toLowerCase().includes(searchTerm)) ||
      (item.productName?.toLowerCase().includes(searchTerm)) ||
      (item.review?.toLowerCase().includes(searchTerm))
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
    { header: "Customer", accessor: "customerName" },
    { header: "Product", accessor: "productName" },
    { header: "Rating", accessor: "rating" },
    { header: "Review", accessor: "review" },
    { header: "Status", accessor: "status" },
    {
      header: "Actions",
      accessor: "actions",
      cell: (row) => {
        const reviewId = row.id;
        return (
          <div className="adding-button">
            <button
              className="action-btn edit"
              title="Moderate"
              onClick={() => handleModerate(reviewId)}
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a4 4 0 01-1.414.828l-4.243 1.414 1.414-4.243a4 4 0 01.828-1.414z"/>
              </svg>
              Moderate
            </button>
            <button
              className="action-btn delete"
              title="Delete"
              onClick={() => handleDelete(reviewId)}
            >
              <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
              </svg>
              Delete
            </button>
          </div>
        );
      }
    }
  ];

  const handleModerate = async (id) => {
    try {
      setLoading(true);
      const data = await reviewService.getReviewById(id);
      console.log('Fetched review data:', data);
      setFormData({
        id: id,
        status: data.status || "pending",
        is_featured: data.is_featured || false,
        admin_notes: data.admin_notes || ""
      });
      setIsModalOpen(true);
    } catch (err) {
      setError(err.message || "Failed to fetch review data");
      console.error("Error fetching review data:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this review?")) {
      try {
        setLoading(true);
        await reviewService.deleteReview(id);
        await fetchReviews();
      } catch (err) {
        setError(err.message || "Failed to delete review");
        console.error("Error deleting review:", err);
      } finally {
        setLoading(false);
      }
    }
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
    setFormData({
      status: "pending",
      is_featured: false,
      admin_notes: ""
    });
  };

  const handleInputChange = (e) => {
    const { name, value, type, checked } = e.target;
    console.log('Input Change:', {
      name,
      value,
      type,
      checked,
      currentFormData: formData
    });
    
    setFormData(prev => {
      const newData = {
        ...prev,
        [name]: type === 'checkbox' ? checked : value
      };
      console.log('New Form Data:', newData);
      return newData;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    console.log('Form Submit:', {
      formData,
      isEdit: !!formData.id
    });
    
    if (!formData.id) {
      setError("Review ID is missing");
      return;
    }

    try {
      setLoading(true);
      const moderationData = {
        status: formData.status,
        is_featured: formData.is_featured,
        admin_notes: formData.admin_notes
      };

      console.log('Moderation data being sent:', moderationData);

      const response = await reviewService.moderateReview(formData.id, moderationData);
      console.log('Moderation response:', response);
      
      // Update the reviews state with the new data
      setReviews(prevReviews => {
        const updatedReviews = prevReviews.map(review => {
          if (review.id === formData.id) {
            return {
              ...review,
              status: moderationData.status,
              is_featured: moderationData.is_featured,
              admin_notes: moderationData.admin_notes
            };
          }
          return review;
        });
        console.log('Updated reviews:', updatedReviews);
        return updatedReviews;
      });

      // Close modal and reset form
      setIsModalOpen(false);
      setFormData({
        status: "pending",
        is_featured: false,
        admin_notes: ""
      });
    } catch (err) {
      console.error('Submit Error:', err);
      setError(err.message || "Failed to moderate review");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <div className="dashboard-page">
        <div className="seo-header-container">
          <h1 className="seo-title">Reviews Management</h1>
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
                  {filterValue ? "No results found for your search" : "No reviews found"}
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
        title="Moderate Review"
      >
        <form onSubmit={handleSubmit} className="seo-form">
          <div className="modal-body">
            <InputField
              label="Status"
              type="select"
              name="status"
              value={formData.status}
              onChange={handleInputChange}
              required
              options={[
                { value: "pending", label: "Pending" },
                { value: "approved", label: "Approved" },
                { value: "rejected", label: "Rejected" }
              ]}
            />
            <div className="input-field">
              <label className="input-field-label">
                <input
                  type="checkbox"
                  name="is_featured"
                  checked={formData.is_featured}
                  onChange={handleInputChange}
                />
                Featured Review
              </label>
            </div>
            <InputField
              label="Admin Notes"
              type="textarea"
              name="admin_notes"
              value={formData.admin_notes}
              onChange={handleInputChange}
            />
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