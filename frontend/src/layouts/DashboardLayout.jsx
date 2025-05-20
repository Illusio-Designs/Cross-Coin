import React, { useState } from 'react';
import Sidebar from '../components/dashboard/Sidebar';
import Header from '../components/dashboard/Header';
import Footer from '../components/dashboard/Footer';

const DashboardLayout = ({ children }) => {
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  const toggleSidebar = () => {
    setIsSidebarCollapsed(!isSidebarCollapsed);
  };

  return (
    <div className="dashboard-layout">
      <Sidebar isCollapsed={isSidebarCollapsed} onToggle={toggleSidebar} />
      <div className={`dashboard-content ${isSidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
        <Header />
        <main className="dashboard-main">
          {children}
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default DashboardLayout; 