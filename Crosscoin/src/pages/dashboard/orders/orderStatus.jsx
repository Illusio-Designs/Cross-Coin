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
    const [totalItems, setTotalItems] = useState(0);
    const [serverStats, setServerStats] = useState(null);

    // Server-side pagination + filtering (no more fetching thousands of rows to
    // join and paginate on the client). The backend scopes to the admin's brand.
    useEffect(() => {
        let alive = true;
        const fetchHistory = async () => {
            setLoading(true);
            setError(null);
            try {
                const res = await orderService.getAllOrderStatusHistory({
                    page: currentPage,
                    limit: itemsPerPage,
                    search: filterValue || undefined,
                    status: statusFilter !== 'all' ? statusFilter : undefined,
                });
                if (!alive) return;
                setHistory(res.history || []);
                setTotalItems(res.pagination?.total || 0);
                setServerStats(res.stats || null);
            } catch (err) {
                if (alive) setError(err.message || 'Failed to fetch status history');
            } finally {
                if (alive) setLoading(false);
            }
        };
        fetchHistory();
        return () => { alive = false; };
    }, [currentPage, itemsPerPage, filterValue, statusFilter]);

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

    // Status statistics come from the server (whole brand-scoped set), not just
    // the current page.
    const getStatusStats = () => ({
        total: serverStats?.total ?? totalItems,
        pending: serverStats?.pending ?? 0,
        processing: serverStats?.processing ?? 0,
        shipped: serverStats?.shipped ?? 0,
        delivered: serverStats?.delivered ?? 0,
        cancelled: serverStats?.cancelled ?? 0,
    });

    const totalPages = Math.ceil(totalItems / itemsPerPage) || 1;
    const startIndex = (currentPage - 1) * itemsPerPage;
    const currentItems = history.map((item, idx) => ({ ...item, serial_number: startIndex + idx + 1 }));
    
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
                        {history.length === 0 ? <div className="sl-empty"><p>No status history found.</p></div> :
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
                                {totalItems > itemsPerPage && (
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

