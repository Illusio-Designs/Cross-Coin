import React from 'react';
import '../../styles/dashboard/Card.css';
import { FaEye, FaChartBar, FaRocket } from "react-icons/fa";

export default function CardGrid() {
  const companyCards = [
    {
      title: "Total Companies",
      value: 25,
      description: "Total number of companies.",
      icon: <FaEye className="dashboard-card-icon" />,
      variant: "blue"
    },
    {
      title: "Active Companies",
      value: 25,
      description: "100% of total",
      icon: <FaChartBar className="dashboard-card-icon" />,
      variant: "green"
    },
    {
      title: "Inactive Companies",
      value: 0,
      description: "0% of total",
      icon: <FaRocket className="dashboard-card-icon" />,
      variant: "lightblue"
    },
    {
      title: "Recent Companies (30 days)",
      value: 25,
      description: "100% of total",
      icon: <FaEye className="dashboard-card-icon" />,
      variant: "yellow"
    }
  ];

  const consumerCards = [
    {
      title: "Total Consumers",
      value: 2,
      description: "Total number of consumers.",
      icon: <FaChartBar className="dashboard-card-icon" />,
      variant: "blue"
    },
    {
      title: "Active Consumers",
      value: 2,
      description: "100% of total",
      icon: <FaRocket className="dashboard-card-icon" />,
      variant: "green"
    },
    {
      title: "Inactive Consumers",
      value: 0,
      description: "0% of total",
      icon: <FaEye className="dashboard-card-icon" />,
      variant: "lightblue"
    },
    {
      title: "Recent Consumers (30 days)",
      value: 2,
      description: "100% of total",
      icon: <FaChartBar className="dashboard-card-icon" />,
      variant: "yellow"
    }
  ];

  return (
    <div className="dashboard-sections">
      <div className="dashboard-section">
        <div className="dashboard-section-title">
          <FaEye style={{marginRight: 8}} />
          Company Statistics
        </div>
        <div className="dashboard-card-grid">
          {companyCards.map((card) => (
            <div className={`dashboard-card ${card.variant}`} key={card.title}>
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
          <FaChartBar style={{marginRight: 8}} />
          Consumer Statistics
        </div>
        <div className="dashboard-card-grid">
          {consumerCards.map((card) => (
            <div className={`dashboard-card ${card.variant}`} key={card.title}>
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