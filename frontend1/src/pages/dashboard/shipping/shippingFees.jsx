import { useState } from "react";
import { FaSearch, FaPlus, FaEdit, FaTrash } from "react-icons/fa";
import Button from "@/components/common/Button";
import Filter from "@/components/common/Filter";
import SortBy from "@/components/common/SortBy";
import InputField from "@/components/common/InputField";
import Pagination from "@/components/common/Pagination";
import Modal from "@/components/common/Modal";
import "../../../styles/dashboard/shippingFees.css";

export default function ShippingFees() {
  const [fees, setFees] = useState([
    {
      id: 1,
      name: "Standard Shipping",
      type: "flat",
      amount: 5.99,
      minOrder: 0,
      maxOrder: 50,
      status: "active",
      regions: ["US", "CA"],
    },
    {
      id: 2,
      name: "Express Shipping",
      type: "flat",
      amount: 12.99,
      minOrder: 0,
      maxOrder: 100,
      status: "active",
      regions: ["US"],
    },
    {
      id: 3,
      name: "International Shipping",
      type: "percentage",
      amount: 15,
      minOrder: 50,
      maxOrder: 1000,
      status: "inactive",
      regions: ["Global"],
    },
  ]);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterValue, setFilterValue] = useState("");
  const [sortValue, setSortValue] = useState("");
  const [sortDirection, setSortDirection] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedFee, setSelectedFee] = useState(null);

  const filterOptions = [
    { value: "all", label: "All Types" },
    { value: "flat", label: "Flat Rate" },
    { value: "percentage", label: "Percentage" },
  ];

  const sortOptions = [
    { value: "name", label: "Name" },
    { value: "amount", label: "Amount" },
    { value: "type", label: "Type" },
  ];

  const handleAddFee = () => {
    setSelectedFee(null);
    setIsModalOpen(true);
  };

  const handleEditFee = (fee) => {
    setSelectedFee(fee);
    setIsModalOpen(true);
  };

  const handleDeleteFee = (id) => {
    setFees(fees.filter(fee => fee.id !== id));
  };

  const handleToggleStatus = (id) => {
    setFees(fees.map(fee => 
      fee.id === id 
        ? { ...fee, status: fee.status === "active" ? "inactive" : "active" }
        : fee
    ));
  };

  return (
    <div className="shipping-fees-container">
      <div className="shipping-fees-header">
        <h1 className="shipping-fees-title">Shipping Fees</h1>
        <Button variant="primary" onClick={handleAddFee}>
          <FaPlus /> Add Fee
        </Button>
      </div>

      <div className="shipping-fees-filters">
        <InputField
          type="text"
          placeholder="Search fees..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="shipping-fees-search"
          icon={<FaSearch />}
        />
        <Filter
          options={filterOptions}
          selectedValue={filterValue}
          onChange={setFilterValue}
          placeholder="Filter by type"
        />
        <SortBy
          options={sortOptions}
          selectedValue={sortValue}
          onChange={setSortValue}
          direction={sortDirection}
          onDirectionChange={setSortDirection}
        />
      </div>

      <table className="shipping-fees-table">
        <thead>
          <tr>
            <th>Name</th>
            <th>Type</th>
            <th>Amount</th>
            <th>Order Range</th>
            <th>Regions</th>
            <th>Status</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {fees.map((fee) => (
            <tr key={fee.id}>
              <td>{fee.name}</td>
              <td>{fee.type === "flat" ? "Flat Rate" : "Percentage"}</td>
              <td>
                {fee.type === "flat" 
                  ? `$${fee.amount.toFixed(2)}`
                  : `${fee.amount}%`
                }
              </td>
              <td>
                ${fee.minOrder.toFixed(2)} - ${fee.maxOrder.toFixed(2)}
              </td>
              <td>{fee.regions.join(", ")}</td>
              <td>
                <span className={`status-badge status-${fee.status}`}>
                  {fee.status.charAt(0).toUpperCase() + fee.status.slice(1)}
                </span>
              </td>
              <td className="shipping-fees-actions">
                <Button
                  variant="primary"
                  size="small"
                  onClick={() => handleEditFee(fee)}
                >
                  <FaEdit /> Edit
                </Button>
                <Button
                  variant="secondary"
                  size="small"
                  onClick={() => handleDeleteFee(fee.id)}
                >
                  <FaTrash /> Delete
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="shipping-fees-pagination">
        <Pagination
          currentPage={currentPage}
          totalPages={5}
          onPageChange={setCurrentPage}
        />
      </div>

      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title={selectedFee ? "Edit Shipping Fee" : "Add Shipping Fee"}
        size="medium"
      >
        <div className="shipping-fees-form">
          <div className="shipping-fees-form-group">
            <label>Fee Name</label>
            <InputField
              type="text"
              placeholder="Enter fee name"
              value={selectedFee?.name || ""}
            />
          </div>

          <div className="shipping-fees-form-row">
            <div className="shipping-fees-form-group">
              <label>Fee Type</label>
              <select className="form-select">
                <option value="flat">Flat Rate</option>
                <option value="percentage">Percentage</option>
              </select>
            </div>

            <div className="shipping-fees-form-group">
              <label>Amount</label>
              <InputField
                type="number"
                placeholder="Enter amount"
                value={selectedFee?.amount || ""}
              />
            </div>
          </div>

          <div className="shipping-fees-form-row">
            <div className="shipping-fees-form-group">
              <label>Minimum Order</label>
              <InputField
                type="number"
                placeholder="Enter minimum order"
                value={selectedFee?.minOrder || ""}
              />
            </div>

            <div className="shipping-fees-form-group">
              <label>Maximum Order</label>
              <InputField
                type="number"
                placeholder="Enter maximum order"
                value={selectedFee?.maxOrder || ""}
              />
            </div>
          </div>

          <div className="shipping-fees-form-group">
            <label>Regions</label>
            <InputField
              type="text"
              placeholder="Enter regions (comma-separated)"
              value={selectedFee?.regions?.join(", ") || ""}
            />
          </div>

          <div className="shipping-fees-form-actions">
            <Button
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button variant="primary">
              {selectedFee ? "Update Fee" : "Add Fee"}
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  );
} 