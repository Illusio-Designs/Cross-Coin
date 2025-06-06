import "../../../styles/dashboard/seo.css";
import { useState } from "react";
import Button from "../../../components/common/Button";
import InputField from "../../../components/common/InputField";
import Modal from "../../../components/common/Modal";
import Table from "../../../components/common/Table";
import Filter from "../../../components/common/Filter";
import SortBy from "../../../components/common/SortBy";
import Pagination from "../../../components/common/Pagination";

export default function SEO() {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [sortBy, setSortBy] = useState("title");
  const [filterValue, setFilterValue] = useState("");
  const [formData, setFormData] = useState({
    title: "",
    metaDescription: "",
    keywords: ""
  });

  // Sample data - replace with actual API data
  const seoData = [
    {
      id: 1,
      title: "Home Page",
      metaDescription: "Welcome to Cross-Coin - Your trusted crypto platform",
      keywords: "crypto, bitcoin, ethereum, trading",
      status: "Pending"
    },
    {
      id: 2,
      title: "Products Page",
      metaDescription: "Browse our wide range of crypto products and services",
      keywords: "crypto products, trading services, digital assets",
      status: "Processing"
    },
    {
      id: 3,
      title: "About Us",
      metaDescription: "Learn more about Cross-Coin and our mission.",
      keywords: "about, company, mission, team",
      status: "Shipped"
    }
  ];

  const statusBadge = (status) => {
    let badgeClass = "badge ";
    switch (status) {
      case "Pending":
        badgeClass += "badge-pending";
        break;
      case "Processing":
        badgeClass += "badge-processing";
        break;
      case "Shipped":
        badgeClass += "badge-shipped";
        break;
      default:
        badgeClass += "badge";
    }
    return <span className={badgeClass}>{status}</span>;
  };

  const columns = [
    { header: "Page Title", accessor: "title" },
    { header: "Meta Description", accessor: "metaDescription" },
    { header: "Keywords", accessor: "keywords" },
    {
      header: "Status",
      accessor: "status",
      cell: (row) => statusBadge(row.status)
    },
    {
      header: "Actions",
      accessor: "actions",
      cell: (row) => (
        <div className="flex gap-2">
          <button
            className="action-btn view"
            title="View"
            onClick={() => alert(`Viewing ${row.title}`)}
          >
            <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z"/><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"/></svg>
            View
          </button>
          <button
            className="action-btn edit"
            title="Edit"
            onClick={() => handleEdit(row.id)}
          >
            <svg fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15.232 5.232l3.536 3.536M9 13l6.586-6.586a2 2 0 112.828 2.828L11.828 15.828a4 4 0 01-1.414.828l-4.243 1.414 1.414-4.243a4 4 0 01.828-1.414z"/></svg>
            Edit
          </button>
        </div>
      ),
    },
  ];

  const handleEdit = (id) => {
    const item = seoData.find(item => item.id === id);
    if (item) {
      setFormData({
        title: item.title,
        metaDescription: item.metaDescription,
        keywords: item.keywords
      });
      setIsModalOpen(true);
    }
  };

  const handleDelete = (id) => {
    // Implement delete functionality
    console.log("Delete SEO for ID:", id);
  };

  const handleAddNew = () => {
    setFormData({
      title: "",
      metaDescription: "",
      keywords: ""
    });
    setIsModalOpen(true);
  };

  const handleModalClose = () => {
    setIsModalOpen(false);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // Implement form submission
    console.log("Form submitted:", formData);
    setIsModalOpen(false);
  };

  return (
    <div className="dashboard-page p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="dashboard-title text-2xl font-bold">SEO Management</h1>
        <Button 
          variant="primary"
          size="medium"
          onClick={handleAddNew}
        >
          Add New SEO
        </Button>
      </div>

      <div className="dashboard-content bg-white rounded-lg shadow p-6">
        <div className="flex justify-between mb-4">
          <Filter
            type="input"
            value={filterValue}
            onChange={(value) => setFilterValue(value)}
            placeholder="Search SEO entries..."
          />
          <SortBy
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value)}
            options={[
              { value: "title", label: "Sort by Title" },
              { value: "status", label: "Sort by Status" },
            ]}
          />
        </div>

        <Table
          columns={columns}
          data={seoData}
          className="w-full"
          striped={true}
          hoverable={true}
        />

        <div className="mt-4">
          <Pagination
            currentPage={currentPage}
            totalItems={seoData.length}
            itemsPerPage={itemsPerPage}
            onPageChange={setCurrentPage}
          />
        </div>
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={handleModalClose}
        title="SEO Entry"
        size="medium"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          <InputField
            label="Page Title"
            type="text"
            name="title"
            value={formData.title}
            onChange={handleInputChange}
            placeholder="Enter page title"
            required
          />
          <InputField
            label="Meta Description"
            type="textarea"
            name="metaDescription"
            value={formData.metaDescription}
            onChange={handleInputChange}
            placeholder="Enter meta description"
            required
          />
          <InputField
            label="Keywords"
            type="text"
            name="keywords"
            value={formData.keywords}
            onChange={handleInputChange}
            placeholder="Enter keywords (comma-separated)"
            required
          />
          <div className="flex justify-end gap-2 mt-4">
            <Button 
              variant="secondary"
              size="medium"
              onClick={handleModalClose}
            >
              Cancel
            </Button>
            <Button 
              type="submit"
              variant="primary"
              size="medium"
            >
              Save
            </Button>
          </div>
        </form>
      </Modal>
    </div>
  );
} 