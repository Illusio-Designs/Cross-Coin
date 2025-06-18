import ProtectedRoute from "@/components/ProtectedRoute.jsx";
import Sidebar from "@/components/Sidebar/Sidebar.jsx";
import CardGrid from '@/components/Dashboard/Card';
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Loader from "@/components/Loader";

// Import all dashboard pages
import Products from "./products/products";
import Categories from "./products/categories";
import Attributes from "./products/attributes";
import Orders from "./orders/orders";
import OrderStatus from "./orders/orderStatus";
import Users from "./users/users";
import ShippingFees from "./shipping/shippingFees";
import Payments from "./payments/payments";
// import Coupons from "./coupons/coupons";
import Reviews from "./reviews/reviews";
import SEO from "./seo/seo";
import Slider from "./slider/slider";
// import Analytics from "./analytics/analytics";

function DashboardHeader({ isCollapsed }) {
  const sidebarWidth = isCollapsed ? 72 : 260;
  return (
    <header
      className="dashboard-header"
      style={{
        position: 'fixed',
        top: 0,
        left: sidebarWidth,
        width: `calc(100% - ${sidebarWidth}px)`,
        zIndex: 100,
        transition: 'left 0.3s cubic-bezier(.4,0,.2,1), width 0.3s cubic-bezier(.4,0,.2,1)',
      }}
    >
      <div className="header-title">Dashboard</div>
      <div className="header-actions">
        <span style={{fontWeight:600, color:'#CE1E36'}}>Admin</span>
      </div>
    </header>
  );
}

function DashboardFooter({ isCollapsed }) {
  const sidebarWidth = isCollapsed ? 72 : 260;
  return (
    <footer
      className="dashboard-footer"
      style={{
        position: 'fixed',
        bottom: 0,
        left: sidebarWidth,
        width: `calc(100% - ${sidebarWidth}px)`,
        zIndex: 100,
        transition: 'left 0.3s cubic-bezier(.4,0,.2,1), width 0.3s cubic-bezier(.4,0,.2,1)',
      }}
    >
      &copy; {new Date().getFullYear()} CrossCoin. All rights reserved.
    </footer>
  );
}

export default function Dashboard() {
  const [currentView, setCurrentView] = useState('main');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  const handleViewChange = (view) => {
    if (view === 'logout') {
      window.location.href = '/auth/adminlogin';
    } else {
      setIsLoading(true);
      setCurrentView(view);
    }
  };

  const renderContent = () => {
    if (isLoading) {
      return <Loader />;
    }

    switch (currentView) {
      case 'products':
        return <Products />;
      case 'categories':
        return <Categories />;
      case 'attributes':
        return <Attributes />;
      case 'orders':
        return <Orders />;
      case 'orderStatus':
        return <OrderStatus />;
      case 'users':
        return <Users />;
      case 'shippingFees':
        return <ShippingFees />;
      case 'payments':
        return <Payments />;
      case 'coupons':
        return <Coupons />;
      case 'reviews':
        return <Reviews />;
      case 'seo':
        return <SEO />;
      case 'slider':
        return <Slider />;
      default:
        return <Analytics />;
    }
  };

  return (
    <ProtectedRoute requireAdmin={true}>
      <div className="dashboard-layout">
        <Sidebar
          isCollapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed((prev) => !prev)}
          onViewChange={handleViewChange}
          currentView={currentView}
        />
        <DashboardHeader isCollapsed={isCollapsed} />
        <DashboardFooter isCollapsed={isCollapsed} />
        <div
          className="dashboard-main"
          style={{
            marginLeft: isCollapsed ? 72 : 260,
            transition: 'margin-left 0.3s cubic-bezier(.4,0,.2,1)',
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
          }}
        >
          <main
            className="dashboard-content"
            style={{
              marginTop: 80, // header height
              marginBottom: 56, // footer height
              minHeight: 'calc(100vh - 136px)',
              transition: 'margin 0.3s cubic-bezier(.4,0,.2,1)',
              position: 'relative', // Added for loader positioning
            }}
          >
            {renderContent()}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
} 




