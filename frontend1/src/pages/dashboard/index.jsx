import ProtectedRoute from "@/components/ProtectedRoute.jsx";
import Sidebar from "@/components/Sidebar/Sidebar.jsx";
import Card from "@/components/Dashboard/Card.jsx";
import { useState } from "react";
import { FaEye, FaChartBar, FaRocket } from "react-icons/fa";
import Button from "@/components/common/Button";
import Table from "@/components/common/Table";
import Filter from "@/components/common/Filter";
import SortBy from "@/components/common/SortBy";
import Modal from "@/components/common/Modal";
import Pagination from "@/components/common/Pagination";
import InputField from "@/components/common/InputField";
import DatePicker from "@/components/common/DatePicker";

function DashboardHeader() {
  return (
    <header className="dashboard-header">
      <div className="header-title">Dashboard</div>
      <div className="header-actions">
        <Button variant="primary" size="medium">
          New Report
        </Button>
        <span style={{fontWeight:600, color:'#CE1E36'}}>Admin</span>
      </div>
    </header>
  );
}

function DashboardFooter() {
  return (
    <footer className="dashboard-footer">
      &copy; {new Date().getFullYear()} CrossCoin. All rights reserved.
    </footer>
  );
}

export default function Dashboard() {
  const [selected, setSelected] = useState(0);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [filterValue, setFilterValue] = useState('');
  const [sortValue, setSortValue] = useState('');
  const [sortDirection, setSortDirection] = useState('asc');
  const [searchQuery, setSearchQuery] = useState('');
  const [startDate, setStartDate] = useState(null);
  const [endDate, setEndDate] = useState(null);

  const cards = [
    {
      title: "Free",
      price: "$0",
      description: "Best for high research, medical, legal and B2B content.",
      features: ["Feature 1", "Feature 2"],
      icon: <FaEye className="text-4xl text-green-400" />,
    },
    {
      title: "Standard",
      price: "$40",
      description: "Best for low research and/or consumer targeted content.",
      features: ["Feature 1", "Feature 2"],
      icon: <FaChartBar className="text-4xl text-green-400" />,
    },
    {
      title: "Pro",
      price: "$99",
      description: "Best for low research and/or consumer targeted content.",
      features: ["Feature 1", "Feature 2"],
      icon: <FaRocket className="text-4xl text-green-400" />,
    },
  ];

  // Example table data
  const tableHeaders = ['Name', 'Status', 'Date', 'Amount'];
  const tableData = [
    ['John Doe', 'Active', '2024-03-20', '$100'],
    ['Jane Smith', 'Pending', '2024-03-19', '$150'],
    ['Bob Johnson', 'Active', '2024-03-18', '$200'],
  ];

  // Example filter options
  const filterOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'active', label: 'Active' },
    { value: 'pending', label: 'Pending' },
  ];

  // Example sort options
  const sortOptions = [
    { value: 'name', label: 'Name' },
    { value: 'date', label: 'Date' },
    { value: 'amount', label: 'Amount' },
  ];

  return (
    <ProtectedRoute requireAdmin={true}>
      <div className="dashboard-layout">
        <Sidebar />
        <div className="dashboard-main">
          <DashboardHeader />
          <main className="dashboard-content">
            <div className="flex justify-between items-center mb-8">
              <h1 className="text-2xl font-bold">My Sites Details</h1>
              <Button 
                variant="primary" 
                size="medium"
                onClick={() => setIsModalOpen(true)}
              >
                Add New Site
              </Button>
            </div>

            {/* Search and Filters Section */}
            <div className="mb-6 flex flex-wrap gap-4 items-center">
              <InputField
                type="text"
                placeholder="Search sites..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-64"
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
              <div className="flex gap-2">
                <DatePicker
                  selected={startDate}
                  onChange={setStartDate}
                  placeholder="Start Date"
                  maxDate={endDate}
                  className="w-40"
                />
                <DatePicker
                  selected={endDate}
                  onChange={setEndDate}
                  placeholder="End Date"
                  minDate={startDate}
                  className="w-40"
                />
              </div>
            </div>

            {/* Table Section */}
            <div className="mb-6">
              <Table
                headers={tableHeaders}
                data={tableData}
                striped
                hoverable
                onRowClick={(row) => console.log('Clicked row:', row)}
              />
            </div>

            {/* Pagination */}
            <Pagination
              currentPage={currentPage}
              totalPages={5}
              onPageChange={setCurrentPage}
            />

            {/* Pricing Cards Section */}
            <section className="mb-12 mt-12">
              <h2 className="text-xl font-semibold mb-6">Content Quality</h2>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                {cards.map((card, idx) => (
                  <Card
                    key={card.title}
                    title={card.title}
                    price={card.price}
                    description={card.description}
                    features={card.features}
                    selected={selected === idx}
                    onSelect={() => setSelected(idx)}
                  >
                    {card.icon}
                  </Card>
                ))}
              </div>
            </section>
          </main>
          <DashboardFooter />
        </div>
      </div>

      {/* Modal Example */}
      <Modal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        title="Add New Site"
        size="medium"
      >
        <div className="space-y-4">
          <InputField
            label="Site Name"
            placeholder="Enter site name"
            required
          />
          <InputField
            label="Site URL"
            placeholder="https://example.com"
            required
          />
          <DatePicker
            label="Launch Date"
            selected={startDate}
            onChange={setStartDate}
            placeholder="Select launch date"
            required
          />
          <div className="flex justify-end gap-4 mt-6">
            <Button
              variant="secondary"
              onClick={() => setIsModalOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              onClick={() => setIsModalOpen(false)}
            >
              Add Site
            </Button>
          </div>
        </div>
      </Modal>
    </ProtectedRoute>
  );
} 