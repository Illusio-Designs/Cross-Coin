import React from 'react';
import DashboardLayout from '../../layouts/DashboardLayout';
import Card from '../../components/common/Card';
import Button from '../../components/common/Button';

const Dashboard = () => {
  return (
    <DashboardLayout>
      <div className="dashboard-page">
        <div className="page-header">
          <h1>Dashboard</h1>
          <p>Welcome to your dashboard</p>
        </div>
        
        <div className="dashboard-grid">
          <Card
            title="Quick Actions"
            subtitle="Common tasks and actions"
          >
            <div className="quick-actions">
              <Button variant="primary" icon="plus">New Transaction</Button>
              <Button variant="secondary" icon="wallet">View Wallet</Button>
            </div>
          </Card>

          <Card
            title="Recent Activity"
            subtitle="Your latest transactions"
          >
            <div className="recent-activity">
              {/* Activity content will go here */}
            </div>
          </Card>
        </div>
      </div>
    </DashboardLayout>
  );
};

export default Dashboard; 