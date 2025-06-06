import { useState } from "react";
import { FaSearch, FaEye, FaEdit } from "react-icons/fa";
import Button from "@/components/common/Button";
import Filter from "@/components/common/Filter";
import SortBy from "@/components/common/SortBy";
import InputField from "@/components/common/InputField";
import Table from "@/components/common/Table";
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

  const columns = [
    { header: "Order ID", accessor: "id" },
    { header: "Customer", accessor: "customer" },
    { header: "Date", accessor: "date" },
    { header: "Total", accessor: "total" },
    { header: "Items", accessor: "items" },
    { 
      header: "Status", 
      accessor: "status",
      cell: (row) => getStatusBadge(row.status)
    },
  ];

  const rowActions = [
    {
      type: "view",
      icon: <FaEye />,
      label: "View",
      onClick: (row) => console.log("View", row),
      className: "action-view"
    },
    {
      type: "edit",
      icon: <FaEdit />,
      label: "Edit",
      onClick: (row) => console.log("Edit", row),
      className: "action-edit"
    }
  ];

  const handleSearch = (data, searchTerm) => {
    return data.filter(order => 
      order.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.customer.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const handleSort = (key, direction) => {
    setSortValue(key);
    setSortDirection(direction);
    const sortedOrders = [...orders].sort((a, b) => {
      if (key === 'date') {
        return direction === 'asc' 
          ? new Date(a.date) - new Date(b.date)
          : new Date(b.date) - new Date(a.date);
      }
      if (key === 'total') {
        return direction === 'asc'
          ? parseFloat(a.total.replace('$', '')) - parseFloat(b.total.replace('$', ''))
          : parseFloat(b.total.replace('$', '')) - parseFloat(a.total.replace('$', ''));
      }
      return direction === 'asc'
        ? a[key] - b[key]
        : b[key] - a[key];
    });
    setOrders(sortedOrders);
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
        <Table
          columns={columns}
          data={orders}
          striped={true}
          hoverable={true}
          sortable={true}
          onSort={handleSort}
          currentSort={{ key: sortValue, direction: sortDirection }}
          searchable={true}
          onSearch={handleSearch}
          rowActions={rowActions}
          pagination={true}
          itemsPerPage={10}
          stickyHeader={true}
          responsive={true}
          className="order-status-table"
          customClassName="order-status-table-wrapper"
        />
      </div>
    </div>
  );
} 