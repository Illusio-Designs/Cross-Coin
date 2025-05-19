import React from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';

const Dashboard = () => {
  return (
    <DashboardLayout>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Dashboard cards will go here */}
        <div className="bg-white p-4 rounded-lg shadow">
          <h2 className="text-lg font-semibold mb-2">Overview</h2>
          <p>Welcome to your dashboard</p>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard; 