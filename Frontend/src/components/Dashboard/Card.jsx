import React, { useState, useEffect } from 'react';
import '../../styles/dashboard/Card.css';
import { FaBox, FaShoppingCart, FaDollarSign, FaUsers, FaStar, FaClock } from "react-icons/fa";
import { dashboardService } from '../../services';

export default function CardGrid() {
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
      if (response.success) {
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
        <div style={{ textAlign: 'center', padding: '40px', color: '#666' }}>
          Loading dashboard statistics...
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
      icon: <FaBox className="dashboard-card-icon" />
    },
    {
      title: "Active Products",
      value: stats.products.active,
      description: `${stats.products.total > 0 ? Math.round((stats.products.active / stats.products.total) * 100) : 0}% of total`,
      icon: <FaBox className="dashboard-card-icon" />
    },
    {
      title: "Inactive Products",
      value: stats.products.inactive,
      description: `${stats.products.total > 0 ? Math.round((stats.products.inactive / stats.products.total) * 100) : 0}% of total`,
      icon: <FaBox className="dashboard-card-icon" />
    },
    {
      title: "Total Reviews",
      value: stats.reviews.total,
      description: `${stats.reviews.approved} approved`,
      icon: <FaStar className="dashboard-card-icon" />
    }
  ];

  const orderCards = [
    {
      title: "Total Orders",
      value: stats.orders.total,
      description: "All time orders",
      icon: <FaShoppingCart className="dashboard-card-icon" />
    },
    {
      title: "Pending Orders",
      value: stats.orders.pending,
      description: "Awaiting processing",
      icon: <FaClock className="dashboard-card-icon" />
    },
    {
      title: "Completed Orders",
      value: stats.orders.completed,
      description: `${stats.orders.total > 0 ? Math.round((stats.orders.completed / stats.orders.total) * 100) : 0}% of total`,
      icon: <FaShoppingCart className="dashboard-card-icon" />
    },
    {
      title: "Recent Orders (30 days)",
      value: stats.orders.recent,
      description: `${stats.orders.total > 0 ? Math.round((stats.orders.recent / stats.orders.total) * 100) : 0}% of total`,
      icon: <FaShoppingCart className="dashboard-card-icon" />
    }
  ];

  const revenueCards = [
    {
      title: "Total Revenue",
      value: `₹${stats.revenue.total.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      description: "All time revenue",
      icon: <FaDollarSign className="dashboard-card-icon" />
    },
    {
      title: "Monthly Revenue",
      value: `₹${stats.revenue.monthly.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      description: "Current month",
      icon: <FaDollarSign className="dashboard-card-icon" />
    },
    {
      title: "Average Order Value",
      value: `₹${stats.revenue.average.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`,
      description: "Per order",
      icon: <FaDollarSign className="dashboard-card-icon" />
    },
    {
      title: "Total Customers",
      value: stats.customers.total,
      description: `${stats.customers.recent} new (30 days)`,
      icon: <FaUsers className="dashboard-card-icon" />
    }
  ];

  return (
    <div className="dashboard-sections">
      <div className="dashboard-section">
        <div className="dashboard-section-title">
          <FaBox style={{marginRight: 8}} />
          Product Statistics
        </div>
        <div className="dashboard-card-grid">
          {productCards.map((card) => (
            <div className="dashboard-card" key={card.title}>
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
          <FaShoppingCart style={{marginRight: 8}} />
          Order Statistics
        </div>
        <div className="dashboard-card-grid">
          {orderCards.map((card) => (
            <div className="dashboard-card" key={card.title}>
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
          <FaDollarSign style={{marginRight: 8}} />
          Revenue & Customer Statistics
        </div>
        <div className="dashboard-card-grid">
          {revenueCards.map((card) => (
            <div className="dashboard-card" key={card.title}>
              <div className="dashboard-card-icon">{card.icon}</div>
              <div className="dashboard-card-title">{card.title}</div>
              <div className="dashboard-card-value">{card.value}</div>
              <div className="dashboard-card-description">{card.description}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
} 