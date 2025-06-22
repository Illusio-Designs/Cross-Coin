import React, { useState, useEffect, useCallback } from 'react';
import { orderService } from '../../../services';
import { debounce } from 'lodash';
import Table from "@/components/common/Table";
import Pagination from "@/components/common/Pagination";
import '../../../styles/dashboard/orders.css'; // Reusing the same stylesheet
import "../../../styles/dashboard/seo.css"; // Reusing styles for consistency

const OrderStatus = () => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filterValue, setFilterValue] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(15);

    const fetchHistory = async () => {
        setLoading(true);
        setError(null);
        try {
            // Fetch all history for client-side filtering
            const data = await orderService.getAllOrderStatusHistory({ limit: 1000 }); 
            setHistory(data.history);
        } catch (err) {
            setError(err.message || 'Failed to fetch status history');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchHistory();
    }, []);

    const debouncedSearch = useCallback(debounce((searchTerm) => setFilterValue(searchTerm), 300), []);
    const handleSearchChange = (e) => debouncedSearch(e.target.value);

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    const filteredData = history.filter(entry => {
        if (!filterValue) return true;
        const searchTerm = filterValue.toLowerCase();
        return entry.Order?.order_number.toLowerCase().includes(searchTerm);
    });

    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem).map((item, idx) => ({ ...item, serial_number: indexOfFirstItem + idx + 1 }));
    
    useEffect(() => {
        setCurrentPage(1);
    }, [filterValue]);

    const columns = [
        { header: "S/N", accessor: "serial_number" },
        { header: "Order Number", cell: (row) => row.Order?.order_number || 'N/A' },
        { header: "Status", cell: (row) => <span className={`status-badge status-${row.status}`}>{row.status}</span> },
        { header: "Notes", accessor: "notes", cell: (row) => row.notes || 'No notes' },
        { header: "Updated By", cell: (row) => row.UpdatedBy?.username || 'System' },
        { header: "Timestamp", cell: (row) => formatDate(row.createdAt) }
    ];

    return (
        <div className="dashboard-page">
            <div className="seo-header-container">
                <h1 className="seo-title">Order Status History</h1>
                 <div className="adding-button">
                    <form className="modern-searchbar-form" onSubmit={e => e.preventDefault()}>
                        <div className="modern-searchbar-group">
                            <span className="modern-searchbar-icon">
                                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                                </svg>
                            </span>
                            <input type="text" className="modern-searchbar-input" placeholder="Search" onChange={handleSearchChange} />
                        </div>
                    </form>
                </div>
            </div>

            <div className="seo-table-container">
                {loading ? <div className="seo-loading">Loading...</div> :
                    <>
                        {filteredData.length === 0 ? <div className="seo-empty-state">No status history found.</div> :
                            <>
                                <Table columns={columns} data={currentItems} className="w-full" striped={true} hoverable={true} />
                                {filteredData.length > itemsPerPage && (
                                    <div className="seo-pagination-container">
                                        <Pagination currentPage={currentPage} totalItems={filteredData.length} itemsPerPage={itemsPerPage} onPageChange={setCurrentPage} />
                                    </div>
                                )}
                            </>
                        }
                    </>
                }
            </div>
        </div>
    );
};

export default OrderStatus; 