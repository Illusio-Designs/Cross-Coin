import ProtectedRoute from "@/components/ProtectedRoute";
import Sidebar from "@/components/Sidebar/Sidebar.jsx";
import CardGrid from '@/components/Dashboard/Card';
import { useState, useEffect } from "react";
import { useRouter } from "next/router";
import Loader from "@/components/Loader";
import { FiMaximize, FiMinimize } from "react-icons/fi";
import { FaUserCircle } from "react-icons/fa";

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

function DashboardHeader({ isCollapsed, isFullscreen, onToggleFullscreen, currentView }) {
  const sidebarWidth = isCollapsed ? 72 : 260;
  
  // Convert view name to display title
  const getPageTitle = (view) => {
    const titles = {
      'main': 'Dashboard',
      'products': 'Products',
      'categories': 'Categories',
      'attributes': 'Attributes',
      'orders': 'Orders',
      'consumers': 'Consumers',
      'shippingFees': 'Shipping Fees',
      'payments': 'Payments',
      'coupons': 'Coupons',
      'reviews': 'Reviews',
      'seo': 'SEO',
      'policies': 'Policies',
      'slider': 'Slider'
    };
    return titles[view] || 'Dashboard';
  };

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
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        height: 80,
        background: '#F3F4F5',
        borderBottom: '1px solid #E6E6E6',
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.03)',
        padding: '0 0',
      }}
    >
      {/* Left group: Title only */}
      <div style={{ display: 'flex', alignItems: 'center', marginLeft: 20 }}>
        <div className="header-title" style={{ fontWeight: 700, fontSize: '1.7rem', color: '#180D3E', letterSpacing: 0.2 }}>
          {getPageTitle(currentView)}
        </div>
      </div>
      {/* Right group: Fullscreen button + Profile icon + Admin label */}
      <div className="header-actions" style={{ display: 'flex', alignItems: 'center', gap: 14, marginRight: 40, minWidth: 120, justifyContent: 'flex-end' }}>
        <button
          onClick={onToggleFullscreen}
          style={{
            background: 'none',
            border: 'none',
            cursor: 'pointer',
            fontSize: 26,
            color: '#180D3E',
            outline: 'none',
            display: 'flex',
            alignItems: 'center',
            marginRight: 0
          }}
          title={isFullscreen ? 'Exit Fullscreen' : 'Enter Fullscreen'}
        >
          {isFullscreen ? <FiMinimize /> : <FiMaximize />}
        </button>
        <FaUserCircle style={{ fontSize: 28, color: '#180D3E' }} />
        <span style={{ fontWeight: 600, color: '#180D3E', fontSize: '1.15rem', letterSpacing: 0.2 }}>Admin</span>
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
  const router = useRouter();
  const [currentView, setCurrentView] = useState('main');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Handle URL-based routing on page load
  useEffect(() => {
    const path = window.location.pathname;
    if (path === '/dashboard') {
      setCurrentView('main');
    } else if (path.startsWith('/dashboard/')) {
      const page = path.split('/dashboard/')[1];
      setCurrentView(page);
    }
  }, []);

  // Handle browser back/forward buttons
  useEffect(() => {
    const handlePopState = () => {
      const path = window.location.pathname;
      if (path === '/dashboard') {
        setCurrentView('main');
      } else if (path.startsWith('/dashboard/')) {
        const page = path.split('/dashboard/')[1];
        setCurrentView(page);
      }
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

  const handleViewChange = (view) => {
    if (view === 'logout') {
      window.location.href = '/auth/adminlogin';
    } else {
      setCurrentView(view);
      // Update URL without page reload using browser history API
      const newUrl = view === 'main' ? '/dashboard' : `/dashboard/${view}`;
      window.history.pushState({}, '', newUrl);
    }
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
          onViewChange={handleViewChange}
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




