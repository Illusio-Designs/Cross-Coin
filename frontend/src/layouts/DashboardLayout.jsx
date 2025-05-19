import React from 'react';
import Header from '../components/dashboard/Header';
import Sidebar from '../components/dashboard/Sidebar';
import Footer from '../components/dashboard/Footer';

const DashboardLayout = ({ children }) => {
  return (
    <div className="dashboard-layout">
      <Header />
      <div className="dashboard-main">
        <Sidebar />
        <main className="dashboard-content">
          {children}
        </main>
      </div>
      <Footer />
    </div>
  );
};

export default DashboardLayout; 