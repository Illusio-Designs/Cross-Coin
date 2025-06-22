import React, { useState, useEffect, useCallback } from 'react';
import { orderService } from '../../../services';
import { debounce } from 'lodash';
import Table from "@/components/common/Table";
import Pagination from "@/components/common/Pagination";
import Modal from "@/components/common/Modal";
import Button from "@/components/common/Button";
import '../../../styles/dashboard/orders.css';
import "../../../styles/dashboard/seo.css"; // Reusing styles for consistency

const Orders = () => {
    const [orders, setOrders] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [filterValue, setFilterValue] = useState("");
    const [currentPage, setCurrentPage] = useState(1);
    const [itemsPerPage] = useState(10);
    const [isViewModalOpen, setIsViewModalOpen] = useState(false);
    const [selectedOrder, setSelectedOrder] = useState(null);

    const fetchOrders = async () => {
        setLoading(true);
        setError(null);
        try {
            // Fetch all orders, pagination will be handled client-side for now
            const data = await orderService.getAllOrders({ limit: 1000 }); // A high limit to get all data for client-side filtering
            setOrders(data.orders);
        } catch (err) {
            setError(err.message || 'Failed to fetch orders');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchOrders();
    }, []);

    const debouncedSearch = useCallback(debounce((searchTerm) => setFilterValue(searchTerm), 300), []);
    const handleSearchChange = (e) => debouncedSearch(e.target.value);

    const handleStatusChange = async (orderId, newStatus) => {
        try {
            await orderService.updateOrderStatus(orderId, { status: newStatus });
            fetchOrders(); // Refresh all orders
        } catch (err) {
            alert(`Failed to update status: ${err.message || 'Unknown error'}`);
        }
    };

    const formatDate = (dateString) => new Date(dateString).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });

    const filteredData = orders.filter(order => {
        if (!filterValue) return true;
        const searchTerm = filterValue.toLowerCase();
        return (
            order.order_number.toLowerCase().includes(searchTerm) ||
            order.User?.username.toLowerCase().includes(searchTerm)
        );
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
        { header: "Order ID", accessor: "order_number" },
        { header: "Customer", cell: (row) => row.User?.username || 'N/A' },
        { header: "Date", cell: (row) => formatDate(row.createdAt) },
        { header: "Total", cell: (row) => `₹${parseFloat(row.final_amount).toFixed(2)}` },
        { header: "Payment", cell: (row) => <span className={`status-badge status-${row.payment_status}`}>{row.payment_status}</span> },
        { header: "Status", cell: (row) => <span className={`status-badge status-${row.status}`}>{row.status}</span> },
        {
            header: "Actions",
            cell: (row) => (
                <div className="adding-button">
                    <button className="action-btn edit" title="View Details" onClick={() => { setSelectedOrder(row); setIsViewModalOpen(true); }}>
                         <svg width="16" height="16" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" /><path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" /></svg>
                        View
                    </button>
                    <select value={row.status} onChange={(e) => handleStatusChange(row.id, e.target.value)} className="action-btn status-select-action">
                        <option value="pending">Pending</option>
                        <option value="processing">Processing</option>
                        <option value="shipped">Shipped</option>
                        <option value="delivered">Delivered</option>
                        <option value="cancelled">Cancelled</option>
                    </select>
                </div>
            )
        }
    ];

    return (
        <>
            <div className="dashboard-page">
                <div className="seo-header-container">
                    <h1 className="seo-title">Manage Orders</h1>
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
                            {filteredData.length === 0 ? <div className="seo-empty-state">No orders found.</div> :
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

            <Modal isOpen={isViewModalOpen} onClose={() => setIsViewModalOpen(false)} title={`Order Details: #${selectedOrder?.order_number}`}>
                {selectedOrder && (
                    <div className="order-details-modal">
                        <div className="order-info-grid">
                            <div><strong>Customer:</strong> {selectedOrder.User?.username}</div>
                            <div><strong>Date:</strong> {formatDate(selectedOrder.createdAt)}</div>
                            <div><strong>Payment:</strong> {selectedOrder.payment_type} ({selectedOrder.payment_status})</div>
                            <div><strong>Status:</strong> {selectedOrder.status}</div>
                        </div>
                        <h4>Items Ordered</h4>
                        <table className="items-table">
                            <thead>
                                <tr>
                                    <th>Product</th>
                                    <th>Quantity</th>
                                    <th>Price</th>
                                    <th>Subtotal</th>
                                </tr>
                            </thead>
                            <tbody>
                                {selectedOrder.OrderItems.map(item => (
                                    <tr key={item.id}>
                                        <td>{item.Product?.name || 'N/A'}</td>
                                        <td>{item.quantity}</td>
                                        <td>₹{parseFloat(item.price).toFixed(2)}</td>
                                        <td>₹{parseFloat(item.subtotal).toFixed(2)}</td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                        <div className="order-summary-grid">
                            <div><strong>Subtotal:</strong> ₹{parseFloat(selectedOrder.total_amount).toFixed(2)}</div>
                            <div><strong>Shipping:</strong> ₹{parseFloat(selectedOrder.shipping_fee).toFixed(2)}</div>
                            <div><strong>Discount:</strong> - ₹{parseFloat(selectedOrder.discount_amount || 0).toFixed(2)}</div>
                            <div><strong>Total:</strong> ₹{parseFloat(selectedOrder.final_amount).toFixed(2)}</div>
                        </div>
                         <div className="modal-footer">
                            <Button variant="secondary" onClick={() => setIsViewModalOpen(false)}>Close</Button>
                        </div>
                    </div>
                )}
            </Modal>
        </>
    );
};

export default Orders; 