import { useState } from "react";
import { FaSearch, FaEye, FaEdit } from "react-icons/fa";
import Button from "@/components/common/Button";
import Filter from "@/components/common/Filter";
import SortBy from "@/components/common/SortBy";
import InputField from "@/components/common/InputField";
import Pagination from "@/components/common/Pagination";
import "../../../styles/dashboard/orderStatus.css";

export default function OrderStatus() {
  const [orders, setOrders] = useState([
    {
      id: "ORD001",
      customer: "John Doe",
      date: "2024-03-20",
      total: "$299.99",
      status: "pending",
      items: 3,
    },
    {
      id: "ORD002",
      customer: "Jane Smith",
      date: "2024-03-19",
      total: "$149.99",
      status: "processing",
      items: 2,
    },
    {
      id: "ORD003",
      customer: "Bob Johnson",
      date: "2024-03-18",
      total: "$499.99",
      status: "shipped",
      items: 5,
    },
  ]);

  const [searchQuery, setSearchQuery] = useState("");
  const [filterValue, setFilterValue] = useState("");
  const [sortValue, setSortValue] = useState("");
  const [sortDirection, setSortDirection] = useState("asc");
  const [currentPage, setCurrentPage] = useState(1);

  const filterOptions = [
    { value: "all", label: "All Status" },
    { value: "pending", label: "Pending" },
    { value: "processing", label: "Processing" },
    { value: "shipped", label: "Shipped" },
    { value: "delivered", label: "Delivered" },
    { value: "cancelled", label: "Cancelled" },
  ];

  const sortOptions = [
    { value: "date", label: "Date" },
    { value: "total", label: "Total" },
    { value: "items", label: "Items" },
  ];

  const getStatusBadge = (status) => {
    const statusClasses = {
      pending: "status-pending",
      processing: "status-processing",
      shipped: "status-shipped",
      delivered: "status-delivered",
      cancelled: "status-cancelled",
    };

    return (
      <span className={`order-status-badge ${statusClasses[status]}`}>
        {status.charAt(0).toUpperCase() + status.slice(1)}
      </span>
    );
  };

  return (
    <div className="order-status-container">
      <div className="order-status-header">
        <h1 className="order-status-title">Order Status</h1>
        <div className="order-status-filters">
          <InputField
            type="text"
            placeholder="Search orders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="order-status-search"
            icon={<FaSearch />}
          />
          <Filter
            options={filterOptions}
            selectedValue={filterValue}
            onChange={setFilterValue}
            placeholder="Filter by status"
          />
          <SortBy
            options={sortOptions}
            selectedValue={sortValue}
            onChange={setSortValue}
            direction={sortDirection}
            onDirectionChange={setSortDirection}
          />
        </div>
      </div>

      <div className="order-status-table-container">
        <table className="order-status-table">
          <thead>
            <tr>
              <th>Order ID</th>
              <th>Customer</th>
              <th>Date</th>
              <th>Total</th>
              <th>Items</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {orders.map((order) => (
              <tr key={order.id}>
                <td>{order.id}</td>
                <td>{order.customer}</td>
                <td>{order.date}</td>
                <td>{order.total}</td>
                <td>{order.items}</td>
                <td>{getStatusBadge(order.status)}</td>
                <td>
                  <div className="order-status-actions">
                    <Button variant="primary" size="small">
                      <FaEye /> View
                    </Button>
                    <Button variant="secondary" size="small">
                      <FaEdit /> Edit
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="order-status-pagination">
        <Pagination
          currentPage={currentPage}
          totalPages={5}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
} 