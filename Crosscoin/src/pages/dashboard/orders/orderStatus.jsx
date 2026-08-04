import React, { useState, useEffect, useCallback } from 'react';
import { orderService } from '../../../services';
import { debounce } from 'lodash';
import { Table, Pagination, Select } from "../../../components/ui";
import Loader from "../../../components/common/Loader";
import { getStatusClassName, getStatusDisplayText } from '../../../utils/statusUtils';

const OrderStatus = () => {
    const [history, setHistory] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filterValue, setFilterValue] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [statusFilter, setStatusFilter] = useState("all");
    const [dashboardOrderIds, setDashboardOrderIds] = useState([]);

    // Fetch dashboard orders and then status history
    useEffect(() => {
        const fetchOrdersAndHistory = async () => {
            setLoading(true);
            setError(null);
            try {
                // Fetch all dashboard orders (like in orders.jsx)
                const ordersData = await orderService.getAllOrders({ limit: 1000 });
                const orderIds = ordersData.orders.map(order => order.id);
                setDashboardOrderIds(orderIds);
                // Fetch all status history
                const historyData = await orderService.getAllOrderStatusHistory({ limit: 1000 });
                // Only keep status history for dashboard orders
                const filteredHistory = historyData.history.filter(entry => orderIds.includes(entry.order_id));
                setHistory(filteredHistory);
            } catch (err) {
                setError(err.message || 'Failed to fetch status history');
            } finally {
                setLoading(false);
            }
        };
        fetchOrdersAndHistory();
    }, []);

    const debouncedSearch = useCallback((searchTerm) => {
        const timeoutId = setTimeout(() => setFilterValue(searchTerm), 300);
        return () => clearTimeout(timeoutId);
    }, []);
    const handleSearchChange = (e) => debouncedSearch(e.target.value);

    const formatDate = (dateString) => {
        if (!dateString) return 'N/A';
        return new Date(dateString).toLocaleString('en-US', {
            year: 'numeric', month: 'short', day: 'numeric',
            hour: '2-digit', minute: '2-digit'
        });
    };

    // Helper function to get status statistics
    const getStatusStats = () => {
        const stats = {
            total: history.length,
            pending: 0,
            processing: 0,
            shipped: 0,
            delivered: 0,
            cancelled: 0
        };

        history.forEach(entry => {
            const status = entry.status?.toLowerCase();
            if (stats.hasOwnProperty(status)) {
                stats[status]++;
            }
        });

        return stats;
    };

    const filteredData = history.filter(entry => {
        // Text search filter
        if (filterValue) {
            const searchTerm = filterValue.toLowerCase();
            const matchesSearch = entry.Order?.order_number.toLowerCase().includes(searchTerm);
            if (!matchesSearch) return false;
        }
        // Status filter
        if (statusFilter !== "all") {
            if (entry.status?.toLowerCase() !== statusFilter) {
                return false;
            }
        }
        return true;
    });

    const totalPages = Math.ceil(filteredData.length / itemsPerPage);
    const indexOfLastItem = currentPage * itemsPerPage;
    const indexOfFirstItem = indexOfLastItem - itemsPerPage;
    const currentItems = filteredData.slice(indexOfFirstItem, indexOfLastItem).map((item, idx) => ({ ...item, serial_number: indexOfFirstItem + idx + 1 }));
    
    useEffect(() => {
        setCurrentPage(1);
    }, [filterValue, statusFilter]);

    const columns = [
        { header: "Sr. No", accessor: "serial_number" },
        { header: "Order Number", cell: (row) => row.Order?.order_number || 'N/A' },
        { header: "Status", cell: (row) => <span className={`status-badge status-${getStatusClassName(row.status)}`}>{getStatusDisplayText(row.status)}</span> },
        { header: "Notes", cell: (row) => row.notes || 'No notes' },
        { header: "Updated By", cell: (row) => row.UpdatedBy?.username || 'System' },
        { header: "Timestamp", cell: (row) => formatDate(row.createdAt) }
    ];

    return (
        <div className="dashboard-page">
            <div className="sl-page-header">
                <div className="sl-header-left">
                    <div className="sl-header-icon">
                        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/></svg>
                    </div>
                    <div>
                        <h1 className="sl-page-title">Order Status History</h1>
                        <p className="sl-page-sub">Track all order status changes</p>
                    </div>
                </div>
                <div className="sl-header-right">
                    <div className="sl-search-wrap">
                        <span className="sl-search-icon">
                            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
                        </span>
                        <input type="text" className="sl-search-input" placeholder="Search by order number" onChange={handleSearchChange} />
                    </div>
                    <Select
                        options={[
                            { value: 'all', label: 'All Status' },
                            { value: 'pending', label: 'Pending' },
                            { value: 'processing', label: 'Processing' },
                            { value: 'shipped', label: 'Shipped' },
                            { value: 'delivered', label: 'Delivered' },
                            { value: 'cancelled', label: 'Cancelled' },
                        ]}
                        value={statusFilter}
                        onChange={setStatusFilter}
                        placeholder="All Status"
                    />
                </div>
            </div>

            <div className="sl-table-wrap">
                {loading ? (
                    <div className="sl-loader-wrap">
                        <Loader />
                    </div>
                ) :
                    <>
                        {filteredData.length === 0 ? <div className="sl-empty"><p>No status history found.</p></div> :
                            <>
                                {/* Status Statistics */}
                                <div className="payment-stats">
                                    {(() => {
                                        const stats = getStatusStats();
                                        return (
                                            <>
                                                <div className="stat-item">
                                                    <span className="stat-label">Total Updates:</span>
                                                    <span className="stat-badge total">{stats.total}</span>
                                                </div>
                                                <div className="stat-item">
                                                    <span className="stat-label">Pending:</span>
                                                    <span className="stat-badge pending">{stats.pending}</span>
                                                </div>
                                                <div className="stat-item">
                                                    <span className="stat-label">Processing:</span>
                                                    <span className="stat-badge processing">{stats.processing}</span>
                                                </div>
                                                <div className="stat-item">
                                                    <span className="stat-label">Shipped:</span>
                                                    <span className="stat-badge shipped">{stats.shipped}</span>
                                                </div>
                                                <div className="stat-item">
                                                    <span className="stat-label">Delivered:</span>
                                                    <span className="stat-badge delivered">{stats.delivered}</span>
                                                </div>
                                                <div className="stat-item">
                                                    <span className="stat-label">Cancelled:</span>
                                                    <span className="stat-badge cancelled">{stats.cancelled}</span>
                                                </div>
                                            </>
                                        );
                                    })()}
                                </div>
                                <div className="info-note">
                                    <strong>Note:</strong> This shows the complete history of order status changes. Status updates are now automatically synchronized with the shipping courier. Manual status changes have been disabled to maintain sync integrity.
                                </div>
                                <Table columns={columns} data={currentItems} className="w-full" striped={true} hoverable={true} style={{ fontSize: '14px' }} />
                                {filteredData.length > itemsPerPage && (
                                    <div className="sl-pagination">
                                        <Pagination currentPage={currentPage} totalPages={totalPages} onPageChange={setCurrentPage} />
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

