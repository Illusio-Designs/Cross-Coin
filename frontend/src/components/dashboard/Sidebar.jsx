import React from 'react';
import { Link, useLocation } from 'react-router-dom';

const Sidebar = ({ isCollapsed, onToggle }) => {
  const location = useLocation();

  const isActive = (path) => {
    return location?.pathname === path;
  };

  return (
    <aside className={`sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <nav className="sidebar-nav">
        <Link to="/dashboard" className={`menu-item ${isActive('/dashboard') ? 'active' : ''}`}>
          <svg className="menu-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
          </svg>
          <span>Dashboard</span>
        </Link>
      </nav>

      <div className="sidebar-footer">
        <button className="collapse-button" onClick={onToggle}>
          <svg className="collapse-icon" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={isCollapsed ? "M13 5l7 7-7 7M5 5l7 7-7 7" : "M11 19l-7-7 7-7m8 14l-7-7 7-7"} />
          </svg>
          <span>{isCollapsed ? 'Expand' : 'Collapse'}</span>
        </button>
      </div>
    </aside>
  );
};

export default Sidebar; 