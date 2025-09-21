import { useState, useEffect, useCallback } from "react";
import Button from "@/components/common/Button";
import Table from "@/components/common/Table";
import Pagination from "@/components/common/Pagination";
import { debounce } from 'lodash';
import { userService } from '@/services';

export default function Consumers() {
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage] = useState(10);
  const [filterValue, setFilterValue] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [consumers, setConsumers] = useState([]);

  // Fetch consumers from backend
  useEffect(() => {
    const fetchConsumers = async () => {
      setLoading(true);
      setError(null);
      try {
        const data = await userService.getAllUsers();
        setConsumers(data);
      } catch (err) {
        setError(err.message || "Failed to fetch consumers");
      } finally {
        setLoading(false);
      }
    };
    fetchConsumers();
  }, []);

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

  // Enhanced filter function
  const filteredData = consumers
    .filter(item => item.role === 'consumer' || item.role === 'customer') // Only show consumers
    .filter(item => {
      if (!filterValue) return true;
      const searchTerm = filterValue.toLowerCase();
      return (
        (item.name?.toLowerCase().includes(searchTerm)) ||
        (item.email?.toLowerCase().includes(searchTerm))
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

  // Columns definition (no join date, no last login)
  const columns = [
    { header: "S/N", accessor: "serial_number" },
    { header: "Name", accessor: "name" },
    { header: "Email", accessor: "email" },
    { header: "Role", accessor: "role" },
    { header: "Status", accessor: "status" },
    {
      header: "Option",
      accessor: "ok",
      cell: () => (
        <Button variant="primary" size="small">OK</Button>
      )
    }
  ];

  return (
    <div className="dashboard-page">
      <div className="seo-header-container">
        <h1 className="seo-title">Consumers Management</h1>
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
        ) : error ? (
          <div className="seo-empty-state">{error}</div>
        ) : (
          <>
            {filteredData.length === 0 ? (
              <div className="seo-empty-state">
                {filterValue ? "No results found for your search" : "No consumers found"}
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
  );
} 