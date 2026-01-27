import ProtectedRoute from "@/components/ProtectedRoute";
import Sidebar from "@/components/Sidebar/Sidebar.jsx";
import CardGrid from '@/components/Dashboard/Card';
import DashboardHeader from '@/components/Dashboard/DashboardHeader';
import DashboardFooter from '@/components/Dashboard/DashboardFooter';
import { useState, useEffect } from "react";
import Loader from "@/components/Loader";
import { handleViewChange, getViewFromPath } from "@/utils/dashboardRouting";

// Import all dashboard pages
import Products from "./products/products";
import Categories from "./products/categories";
import Attributes from "./products/attributes";
import Orders from "./orders/orders";
import Consumers from "./consumers/consumers";
import ShippingFees from "./shipping/shippingFees";
import Payments from "./payments/payments";
import Coupons from "./coupon/coupons";
import Reviews from "./reviews/reviews";
import SEO from "./seo/seo";
import Slider from "./slider/slider";
import Policies from "./policies";

function Dashboard() {
  const [currentView, setCurrentView] = useState('main');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Handle URL-based routing on page load
  useEffect(() => {
    setCurrentView(getViewFromPath());
  }, []);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      setCurrentView(getViewFromPath());
    };

    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  useEffect(() => {
    if (isLoading) {
      const timer = setTimeout(() => {
        setIsLoading(false);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isLoading]);

  const onViewChange = (view) => {
    handleViewChange(view, setCurrentView);
  };

  // Fullscreen logic
  const handleToggleFullscreen = () => {
    const elem = document.documentElement;
    if (!isFullscreen) {
      if (elem.requestFullscreen) elem.requestFullscreen();
      else if (elem.mozRequestFullScreen) elem.mozRequestFullScreen();
      else if (elem.webkitRequestFullscreen) elem.webkitRequestFullscreen();
      else if (elem.msRequestFullscreen) elem.msRequestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
      else if (document.mozCancelFullScreen) document.mozCancelFullScreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      else if (document.msExitFullscreen) document.msExitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    function onFullscreenChange() {
      setIsFullscreen(!!(document.fullscreenElement || document.webkitFullscreenElement || document.mozFullScreenElement || document.msFullscreenElement));
    }
    document.addEventListener('fullscreenchange', onFullscreenChange);
    document.addEventListener('webkitfullscreenchange', onFullscreenChange);
    document.addEventListener('mozfullscreenchange', onFullscreenChange);
    document.addEventListener('MSFullscreenChange', onFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', onFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', onFullscreenChange);
      document.removeEventListener('mozfullscreenchange', onFullscreenChange);
      document.removeEventListener('MSFullscreenChange', onFullscreenChange);
    };
  }, []);

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
      case 'consumers':
        return <Consumers />;
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
      case 'policies':
        return <Policies />;
      case 'slider':
        return <Slider />;
      default:
        return <CardGrid />;
    }
  };

  return (
    <ProtectedRoute requireAdmin={true}>
      <div className="dashboard-layout">
        <Sidebar
          isCollapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed((prev) => !prev)}
          onViewChange={onViewChange}
          currentView={currentView}
        />
        <DashboardHeader isCollapsed={isCollapsed} isFullscreen={isFullscreen} onToggleFullscreen={handleToggleFullscreen} currentView={currentView} />
        <DashboardFooter isCollapsed={isCollapsed} />
        <div
          className="dashboard-main"
          style={{
            marginLeft: isCollapsed ? 72 : 260,
            transition: 'margin-left 0.3s cubic-bezier(.4,0,.2,1)',
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            width: `calc(100% - ${isCollapsed ? 72 : 260}px)`,
            maxWidth: 'none',
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
              width: '100%',
              maxWidth: 'none',
              padding: '0', // Remove padding here since it's handled by CSS
              boxSizing: 'border-box',
            }}
          >
            {renderContent()}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}

export default Dashboard;