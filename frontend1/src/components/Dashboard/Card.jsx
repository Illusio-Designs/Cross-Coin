import React, { useState } from 'react';
import '../../styles/dashboard/Card.css';
import { FaEye, FaChartBar, FaRocket } from "react-icons/fa";

export default function CardGrid() {
  const [selected, setSelected] = useState(0);
  const cards = [
    {
      title: "Total Companies",
      value: 2,
      description: "Total number of companies.",
      icon: <FaEye className="dashboard-card-icon" />,
    },
    {
      title: "Active Companies",
      value: 2,
      description: "100% of total",
      icon: <FaChartBar className="dashboard-card-icon" />,
    },
    {
      title: "Inactive Companies",
      value: 0,
      description: "0% of total",
      icon: <FaRocket className="dashboard-card-icon" />,
    },
    {
      title: "Recent Companies (30 days)",
      value: 2,
      description: "100% of total",
      icon: <FaEye className="dashboard-card-icon" />,
    },
    {
      title: "Total Consumers",
      value: 2,
      description: "Total number of consumers.",
      icon: <FaChartBar className="dashboard-card-icon" />,
    },
    {
      title: "Active Consumers",
      value: 2,
      description: "100% of total",
      icon: <FaRocket className="dashboard-card-icon" />,
    },
    {
      title: "Inactive Consumers",
      value: 0,
      description: "0% of total",
      icon: <FaEye className="dashboard-card-icon" />,
    },
    {
      title: "Recent Consumers (30 days)",
      value: 2,
      description: "100% of total",
      icon: <FaChartBar className="dashboard-card-icon" />,
    },
  ];

  return (
    <div className="dashboard-card-grid">
      {cards.map((card, idx) => (
        <div className="dashboard-card" key={card.title}>
          <div className="dashboard-card-icon">{card.icon}</div>
          <div className="dashboard-card-title">{card.title}</div>
          <div className="dashboard-card-value">{card.value}</div>
          <div className="dashboard-card-description">{card.description}</div>
        </div>
      ))}
    </div>
  );
} 