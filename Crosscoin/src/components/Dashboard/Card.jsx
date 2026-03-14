import React, { useState, useEffect } from 'react';
import '../../styles/dashboard/Card.css';
import { FaBox, FaShoppingCart, FaDollarSign, FaUsers, FaStar, FaClock, FaRupeeSign, FaExclamationTriangle, FaCreditCard, FaUndo, FaChartBar } from "react-icons/fa";
import { dashboardService } from '../../services';
import Loader from '../Loader';
import DonutChart from '../common/DonutChart';
import cacheManager from '../../services/cacheManager';

function CardGrid() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [cacheHit, setCacheHit] = useState(false);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      setCacheHit(false);

      // Check cache first (5 minute TTL for dashboard)
      const cachedStats = cacheManager.getByType('dashboard');
      if (cachedStats) {
        setStats(cachedStats);
        setCacheHit(true);
        setError(null);
        setLoading(false);
        return;
      }

      // Cache miss - fetch from API
      const response = await dashboardService.getDashboardStats();
      if (response.success) {
        setStats(response.stats);
        
        // Cache the response (5 minute TTL)
        cacheManager.setByType('dashboard', response.stats);
        }
      setError(null);
    } catch (err) {
      setError('Failed to load dashboard statistics');
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="dashboard-sections">
        <div style={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          minHeight: '400px',
          width: '100%'
        }}>
          <Loader />
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="dashboard-sections">
        <div style={{ textAlign: 'center', padding: '40px', color: '#d32f2f' }}>
          {error}
        </div>
      </div>
    );
  }

  if (!stats) {
    return null;
  }

  // Cache status indicator
  const cacheStatusStyle = {
    position: 'fixed',
    top: '20px',
    right: '20px',
    padding: '8px 12px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: '500',
    zIndex: 1000,
    opacity: 0.8,
    backgroundColor: cacheHit ? '#10b981' : '#f59e0b',
    color: 'white'
  };

  const productCards = [
    {
      title: "Total Products",
      value: stats.products.total,
      description: "All products in inventory",
      icon: <FaBox className="dashboard-card-icon" />,
      trend: `${stats.products.active} active`
    },
    {
      title: "Active Products",
      value: stats.products.active,
      description: `${stats.products.total > 0 ? Math.round((stats.products.active / stats.products.total) * 100) : 0}% of total`,
      icon: <FaBox className="dashboard-card-icon" />,
      color: 'success'
    },
    {
      title: "Total Reviews",
      value: stats.reviews.total,
      description: `${stats.reviews.approved} approved`,
      icon: <FaStar className="dashboard-card-icon" />,
      color: 'warning'
    }
  ];

  const orderCards = [
    {
      title: "Total Orders",
      value: stats.orders.total,
      description: "All time orders",
      icon: <FaShoppingCart className="dashboard-card-icon" />,
      color: 'primary'
    },
    {
      title: "Pending Orders",
      value: stats.orders.pending,
      description: "Awaiting processing",
      icon: <FaClock className="dashboard-card-icon" />,
      color: 'warning'
    },
    {
      title: "Completed Orders",
      value: stats.orders.completed,
      description: `${stats.orders.total > 0 ? Math.round((stats.orders.completed / stats.orders.total) * 100) : 0}% success rate`,
      icon: <FaShoppingCart className="dashboard-card-icon" />,
      color: 'success'
    },
    {
      title: "Recent Orders",
      value: stats.orders.recent,
      description: "Last 30 days",
      icon: <FaShoppingCart className="dashboard-card-icon" />,
      color: 'info'
    }
  ];

  return (
    <div className="dashboard-sections">
      {/* Cache Status Indicator */}
      <div style={cacheStatusStyle}>
        {cacheHit ? '✅ Cached' : '🔄 Fresh'}
      </div>

      {/* Revenue Overview - Hero Section */}
      <div className="dashboard-hero-section">
        <div className="revenue-hero-card">
          <div className="revenue-hero-content">
            <div className="revenue-hero-icon">
              <FaRupeeSign />
            </div>
            <div className="revenue-hero-details">
              <h2 className="revenue-hero-title">Total Revenue</h2>
              <div className="revenue-hero-value">
                ₹{stats.revenue.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
              <p className="revenue-hero-subtitle">All time revenue</p>
            </div>
          </div>
          <div className="revenue-hero-stats">
            <div className="revenue-stat-item">
              <span className="revenue-stat-label">Monthly</span>
              <span className="revenue-stat-value">
                ₹{stats.revenue.monthly.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="revenue-stat-divider"></div>
            <div className="revenue-stat-item">
              <span className="revenue-stat-label">Avg Order</span>
              <span className="revenue-stat-value">
                ₹{stats.revenue.average.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
            <div className="revenue-stat-divider"></div>
            <div className="revenue-stat-item">
              <span className="revenue-stat-label">Customers</span>
              <span className="revenue-stat-value">{stats.customers.total}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Quick Stats Grid */}
      <div className="dashboard-section">
        <div className="dashboard-section-title">
          <FaShoppingCart style={{marginRight: 8}} />
          Order Overview
        </div>
        <div className="dashboard-card-grid">
          {orderCards.map((card) => (
            <div className={`dashboard-card dashboard-card-${card.color || 'default'}`} key={card.title}>
              <div className="dashboard-card-icon">{card.icon}</div>
              <div className="dashboard-card-title">{card.title}</div>
              <div className="dashboard-card-value">{card.value}</div>
              <div className="dashboard-card-description">{card.description}</div>
            </div>
          ))}
        </div>
      </div>
      
      <div className="dashboard-section">
        <div className="dashboard-section-title">
          <FaBox style={{marginRight: 8}} />
          Product Overview
        </div>
        <div className="dashboard-card-grid dashboard-card-grid-3">
          {productCards.map((card) => (
            <div className={`dashboard-card dashboard-card-${card.color || 'default'}`} key={card.title}>
              <div className="dashboard-card-icon">{card.icon}</div>
              <div className="dashboard-card-title">{card.title}</div>
              <div className="dashboard-card-value">{card.value}</div>
              <div className="dashboard-card-description">{card.description}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Charts Row */}
      <div className="dashboard-charts-row">
        {/* Revenue Breakdown Donut Chart */}
        {stats.revenue && stats.revenue.donutChart && stats.revenue.donutChart.length > 0 && (
          <div className="dashboard-section dashboard-chart-section">
            <div className="dashboard-section-title">
              <FaRupeeSign style={{marginRight: 8}} />
              Revenue by Status
            </div>
            <div className="dashboard-chart-container">
              <DonutChart
                data={stats.revenue.donutChart}
                title="Revenue Distribution"
                subtitle="By order status"
                totalValue={`₹${stats.revenue.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                totalLabel="Total Revenue"
                size={180}
                strokeWidth={25}
                showLegend={true}
              />
            </div>
          </div>
        )}

        {/* Payment Distribution Chart */}
        {stats.paymentDistribution && stats.paymentDistribution.chart && stats.paymentDistribution.chart.length > 0 && (
          <div className="dashboard-section dashboard-chart-section">
            <div className="dashboard-section-title">
              <FaCreditCard style={{marginRight: 8}} />
              Payment Methods
            </div>
            <div className="dashboard-chart-container">
              <DonutChart
                data={stats.paymentDistribution.chart}
                title="Payment Distribution"
                subtitle="COD vs Prepaid"
                totalValue={`${stats.orders.total}`}
                totalLabel="Total Orders"
                size={180}
                strokeWidth={25}
                showLegend={true}
              />
            </div>
          </div>
        )}

        {/* Payment Status Chart */}
        {stats.paymentStatusDistribution && stats.paymentStatusDistribution.chart && stats.paymentStatusDistribution.chart.length > 0 && (
          <div className="dashboard-section dashboard-chart-section">
            <div className="dashboard-section-title">
              <FaCreditCard style={{marginRight: 8}} />
              Payment Status
            </div>
            <div className="dashboard-chart-container">
              <DonutChart
                data={stats.paymentStatusDistribution.chart}
                title="Payment Status"
                subtitle="All payment statuses"
                totalValue={`${stats.orders.total}`}
                totalLabel="Total Orders"
                size={180}
                strokeWidth={25}
                showLegend={true}
              />
            </div>
          </div>
        )}

        {/* Order Status Chart */}
        {stats.orders && stats.orders.statusChart && stats.orders.statusChart.length > 0 && (
          <div className="dashboard-section dashboard-chart-section">
            <div className="dashboard-section-title">
              <FaShoppingCart style={{marginRight: 8}} />
              Order Pipeline
            </div>
            <div className="dashboard-chart-container">
              <DonutChart
                data={stats.orders.statusChart}
                title="Order Status"
                subtitle="Current pipeline"
                totalValue={`${stats.orders.total}`}
                totalLabel="Total Orders"
                size={180}
                strokeWidth={25}
                showLegend={true}
              />
            </div>
          </div>
        )}
      </div>

      {/* RTO Statistics */}
      {stats.rtoStats && stats.rtoStats.totalRTO > 0 && (
        <div className="dashboard-section">
          <div className="dashboard-section-title">
            <FaUndo style={{marginRight: 8}} />
            RTO Statistics
          </div>
          <div className="dashboard-card-grid dashboard-card-grid-3">
            <div className="dashboard-card dashboard-card-danger">
              <div className="dashboard-card-icon"><FaUndo /></div>
              <div className="dashboard-card-title">Total RTO Orders</div>
              <div className="dashboard-card-value">{stats.rtoStats.totalRTO}</div>
              <div className="dashboard-card-description">{stats.rtoStats.rtoRate}% of total orders</div>
            </div>
            <div className="dashboard-card dashboard-card-danger">
              <div className="dashboard-card-icon"><FaRupeeSign /></div>
              <div className="dashboard-card-title">RTO Revenue Loss</div>
              <div className="dashboard-card-value">
                ₹{stats.rtoStats.rtoRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div className="dashboard-card-description">{stats.rtoStats.rtoPercentageOfRevenue}% of total revenue</div>
            </div>
            <div className="dashboard-card dashboard-card-danger">
              <div className="dashboard-card-icon"><FaDollarSign /></div>
              <div className="dashboard-card-title">Avg RTO Value</div>
              <div className="dashboard-card-value">
                ₹{stats.rtoStats.averageRTOValue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
              <div className="dashboard-card-description">Per RTO order</div>
            </div>
          </div>
        </div>
      )}

      {/* UTM Tracking Overview */}
      {stats.utmTracking && (stats.utmTracking.topSources?.length > 0 || stats.utmTracking.conversions?.length > 0) && (
        <div className="dashboard-section">
          <div className="dashboard-section-title">
            <FaChartBar style={{marginRight: 8, color: '#3b82f6'}} />
            Marketing Performance (Last 30 Days)
          </div>
          
          {/* Top Traffic Sources */}
          {stats.utmTracking.topSources && stats.utmTracking.topSources.length > 0 && (
            <div className="dashboard-subsection">
              <h3 className="dashboard-subsection-title">Top Traffic Sources</h3>
              <div className="dashboard-table-container">
                <table className="dashboard-table">
                  <thead>
                    <tr>
                      <th>Source</th>
                      <th>Medium</th>
                      <th>Campaign</th>
                      <th>Sessions</th>
                      <th>Registered</th>
                      <th>Guests</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.utmTracking.topSources.slice(0, 5).map((source, index) => (
                      <tr key={index}>
                        <td>
                          <span className="utm-badge source">{source.source}</span>
                        </td>
                        <td>
                          <span className="utm-badge medium">{source.medium}</span>
                        </td>
                        <td>
                          <span className="utm-badge campaign">{source.campaign}</span>
                        </td>
                        <td>{source.sessions}</td>
                        <td>{source.registeredUsers}</td>
                        <td>{source.guestUsers}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Conversion Performance */}
          {stats.utmTracking.conversions && stats.utmTracking.conversions.length > 0 && (
            <div className="dashboard-subsection">
              <h3 className="dashboard-subsection-title">Conversion Performance</h3>
              <div className="dashboard-table-container">
                <table className="dashboard-table">
                  <thead>
                    <tr>
                      <th>Source</th>
                      <th>Medium</th>
                      <th>Sessions</th>
                      <th>Orders</th>
                      <th>Conversion Rate</th>
                      <th>Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {stats.utmTracking.conversions.slice(0, 5).map((conv, index) => (
                      <tr key={index}>
                        <td>
                          <span className="utm-badge source">{conv.source}</span>
                        </td>
                        <td>
                          <span className="utm-badge medium">{conv.medium}</span>
                        </td>
                        <td>{conv.sessions}</td>
                        <td>{conv.orders}</td>
                        <td>
                          <span className={`conversion-badge ${conv.conversionRate > 5 ? 'high' : conv.conversionRate > 2 ? 'medium' : 'low'}`}>
                            {conv.conversionRate}%
                          </span>
                        </td>
                        <td className="table-revenue">
                          ₹{conv.revenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* UTM Source Chart */}
          {stats.utmTracking.sourceChart && stats.utmTracking.sourceChart.length > 0 && (
            <div className="dashboard-chart-container" style={{marginTop: '20px'}}>
              <DonutChart
                data={stats.utmTracking.sourceChart}
                title="Traffic Sources"
                subtitle="Top 5 sources"
                totalValue={stats.utmTracking.sourceChart.reduce((sum, item) => sum + item.value, 0).toString()}
                totalLabel="Total Sessions"
                size={180}
                strokeWidth={25}
                showLegend={true}
              />
            </div>
          )}
        </div>
      )}

      {/* Low Stock Alerts */}
      {stats.lowStock && (stats.lowStock.lowStockCount > 0 || stats.lowStock.outOfStockCount > 0) && (
        <div className="dashboard-section">
          <div className="dashboard-section-title">
            <FaExclamationTriangle style={{marginRight: 8, color: '#ef4444'}} />
            Stock Alerts
          </div>
          <div className="dashboard-alert-cards">
            {stats.lowStock.outOfStockCount > 0 && (
              <div className="dashboard-alert-card alert-danger">
                <div className="alert-icon"><FaExclamationTriangle /></div>
                <div className="alert-content">
                  <div className="alert-title">Out of Stock</div>
                  <div className="alert-value">{stats.lowStock.outOfStockCount} products</div>
                  <div className="alert-description">Need immediate restocking</div>
                </div>
              </div>
            )}
            {stats.lowStock.lowStockCount > 0 && (
              <div className="dashboard-alert-card alert-warning">
                <div className="alert-icon"><FaExclamationTriangle /></div>
                <div className="alert-content">
                  <div className="alert-title">Low Stock</div>
                  <div className="alert-value">{stats.lowStock.lowStockCount} products</div>
                  <div className="alert-description">Stock below 10 units</div>
                </div>
              </div>
            )}
          </div>
          {stats.lowStock.products && stats.lowStock.products.length > 0 && (
            <div className="dashboard-table-container">
              <table className="dashboard-table">
                <thead>
                  <tr>
                    <th>Product</th>
                    <th>SKU</th>
                    <th>Stock</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {stats.lowStock.products.slice(0, 10).map((product, index) => (
                    <tr key={index}>
                      <td className="table-product-name">{product.name}</td>
                      <td>{product.sku}</td>
                      <td>
                        <span className={`stock-badge ${product.stock < 5 ? 'stock-critical' : 'stock-low'}`}>
                          {product.stock} units
                        </span>
                      </td>
                      <td>
                        <span className={`status-badge ${product.stock < 5 ? 'status-danger' : 'status-warning'}`}>
                          {product.stock < 5 ? 'Critical' : 'Low'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Top Selling Products */}
      {stats.topProducts && stats.topProducts.length > 0 && (
        <div className="dashboard-section">
          <div className="dashboard-section-title">
            <FaStar style={{marginRight: 8, color: '#f59e0b'}} />
            Top Selling Products
          </div>
          <div className="dashboard-table-container">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Product</th>
                  <th>Price</th>
                  <th>Sold</th>
                  <th>Orders</th>
                  <th>Revenue</th>
                </tr>
              </thead>
              <tbody>
                {stats.topProducts.map((product, index) => (
                  <tr key={product.id}>
                    <td className="table-rank">#{index + 1}</td>
                    <td className="table-product-name">{product.name}</td>
                    <td>₹{product.price.toLocaleString('en-IN')}</td>
                    <td>{product.totalSold} units</td>
                    <td>{product.orderCount}</td>
                    <td className="table-revenue">
                      ₹{product.totalRevenue.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Recent Orders */}
      {stats.recentOrders && stats.recentOrders.length > 0 && (
        <div className="dashboard-section">
          <div className="dashboard-section-title">
            <FaShoppingCart style={{marginRight: 8}} />
            Recent Orders
          </div>
          <div className="dashboard-table-container">
            <table className="dashboard-table">
              <thead>
                <tr>
                  <th>Order #</th>
                  <th>Customer</th>
                  <th>Amount</th>
                  <th>Payment</th>
                  <th>Status</th>
                  <th>Date</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentOrders.map((order) => (
                  <tr key={order.id}>
                    <td className="table-order-number">{order.orderNumber}</td>
                    <td>{order.customerName}</td>
                    <td className="table-amount">
                      ₹{order.amount.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
                    </td>
                    <td>
                      <span className={`payment-badge payment-${order.paymentType}`}>
                        {order.paymentType.toUpperCase()}
                      </span>
                    </td>
                    <td>
                      <span className={`status-badge status-${order.status.toLowerCase().replace(/\s+/g, '-')}`}>
                        {order.status}
                      </span>
                    </td>
                    <td className="table-date">
                      {new Date(order.date).toLocaleDateString('en-IN', { 
                        day: '2-digit', 
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}

export default CardGrid;
