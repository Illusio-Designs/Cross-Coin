import React, { useState, useEffect } from 'react';
import '../../styles/dashboard/Card.css';
import { FaBox, FaShoppingCart, FaDollarSign, FaUsers, FaStar, FaClock, FaRupeeSign } from "react-icons/fa";
import { dashboardService } from '../../services';
import Loader from '../Loader';
import DonutChart from '../common/DonutChart';

function CardGrid() {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    fetchDashboardStats();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      const response = await dashboardService.getDashboardStats();
      console.log('Dashboard Stats Response:', response);
      if (response.success) {
        console.log('Revenue Data:', response.stats.revenue);
        console.log('Donut Chart Data:', response.stats.revenue?.donutChart);
        setStats(response.stats);
      }
      setError(null);
    } catch (err) {
      console.error('Error fetching dashboard stats:', err);
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

      {/* Revenue Breakdown Donut Chart */}
      {stats.revenue && (
        <div className="dashboard-section">
          <div className="dashboard-section-title">
            <FaRupeeSign style={{marginRight: 8}} />
            Revenue Breakdown by Order Status
          </div>
          <div className="dashboard-chart-container">
            {stats.revenue.donutChart && stats.revenue.donutChart.length > 0 ? (
              <DonutChart
                data={stats.revenue.donutChart}
                title="Revenue Distribution"
                subtitle="Breakdown by order status"
                totalValue={`₹${stats.revenue.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`}
                totalLabel="Total Revenue"
                size={200}
                strokeWidth={30}
                showLegend={true}
              />
            ) : (
              <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                <p>No revenue data available for chart</p>
                <p style={{ fontSize: '14px', marginTop: '8px' }}>
                  Total Revenue: ₹{stats.revenue.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default CardGrid;