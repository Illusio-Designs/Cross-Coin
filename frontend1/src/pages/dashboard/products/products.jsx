import "../../../styles/dashboard/products.css";
import Table from "@/components/common/Table";
import Button from "@/components/common/Button";
import Filter from "@/components/common/Filter";
import SearchBar from "@/components/common/SearchBar";
import Pagination from "@/components/common/Pagination";
import { useState } from "react";

export default function Products() {
  const [searchTerm, setSearchTerm] = useState("");
  const [currentPage, setCurrentPage] = useState(1);
  const [filters, setFilters] = useState({});

  // Sample data - replace with your actual data
  const products = [
    { id: 1, name: "Product 1", price: "$100", stock: 10 },
    { id: 2, name: "Product 2", price: "$200", stock: 5 },
  ];

  const columns = [
    { header: "ID", accessor: "id" },
    { header: "Name", accessor: "name" },
    { header: "Price", accessor: "price" },
    { header: "Stock", accessor: "stock" },
    {
      header: "Actions",
      accessor: "actions",
      cell: (row) => (
        <div className="flex gap-2">
          <Button variant="primary" size="sm">Edit</Button>
          <Button variant="danger" size="sm">Delete</Button>
        </div>
      ),
    },
  ];

  return (
    <div className="dashboard-page p-6">
      <div className="flex justify-between items-center mb-6">
        <h1 className="dashboard-title">All Products</h1>
        <Button variant="primary">Add New Product</Button>
      </div>

      <div className="dashboard-content">
        <div className="flex gap-4 mb-6">
          <SearchBar
            value={searchTerm}
            onChange={setSearchTerm}
            placeholder="Search products..."
          />
          <Filter
            options={[
              { label: "All", value: "all" },
              { label: "In Stock", value: "in_stock" },
              { label: "Out of Stock", value: "out_of_stock" },
            ]}
            value={filters.status || "all"}
            onChange={(value) => setFilters({ ...filters, status: value })}
          />
        </div>

        <Table
          columns={columns}
          data={products}
          className="mb-4"
        />

        <Pagination
          currentPage={currentPage}
          totalPages={5}
          onPageChange={setCurrentPage}
        />
      </div>
    </div>
  );
} 