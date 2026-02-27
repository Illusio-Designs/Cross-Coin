import ProtectedRoute from "@/components/ProtectedRoute";
import Sidebar from "@/components/Sidebar/Sidebar.jsx";
import CardGrid from '@/components/Dashboard/Card';
import DashboardHeader from '@/components/Dashboard/DashboardHeader';
import DashboardFooter from '@/components/Dashboard/DashboardFooter';
import { useState, useEffect } from "react";
import Loader from "@/components/Loader";
import { handleViewChange, getViewFromPath } from "@/utils/dashboardRouting";

// Load dashboard-specific CSS
import "@/styles/dashboard/layout.css";
import "@/styles/dashboard/sidebar.css";
import "@/styles/dashboard/full-width-fix.css";
import "@/styles/dashboard/mobile.css";

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
import MediaGallery from "./media/gallery";
import Policies from "./policies";
import UTMAnalytics from "./analytics/utmAnalytics";

function Dashboard() {
  const [currentView, setCurrentView] = useState('main');
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Detect mobile screen size
  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 900;
      setIsMobile(mobile);
      if (mobile) {
        setIsCollapsed(true);
      }
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

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
  
  const handleMobileMenuToggle = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };
  
  // Get responsive sidebar width
  const getSidebarWidth = () => {
    if (typeof window === 'undefined') return 260;
    
    const width = window.innerWidth;
    if (width <= 900) return 0; // Hidden on mobile, no margin needed
    return isCollapsed ? 72 : 260;
  };
  
  const sidebarWidth = getSidebarWidth();

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
      case 'media-gallery':
        return <MediaGallery />;
      case 'utm-analytics':
        return <UTMAnalytics />;
      default:
        return <CardGrid />;
    }
  };
  
  // Get responsive header/footer heights
  const getHeaderHeight = () => {
    if (typeof window === 'undefined') return 80;
    const width = window.innerWidth;
    if (width <= 480) return 56;
    if (width <= 768) return 60;
    return 80;
  };
  
  const getFooterHeight = () => {
    if (typeof window === 'undefined') return 56;
    const width = window.innerWidth;
    if (width <= 480) return 36;
    if (width <= 768) return 40;
    return 56;
  };
  
  const headerHeight = getHeaderHeight();
  const footerHeight = getFooterHeight();

  return (
    <ProtectedRoute requireAdmin={true}>
      <div className="dashboard-layout">
        <Sidebar
          isCollapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed((prev) => !prev)}
          onViewChange={onViewChange}
          currentView={currentView}
          isMobileMenuOpen={isMobileMenuOpen}
          onMobileMenuToggle={handleMobileMenuToggle}
        />
        <DashboardHeader 
          isCollapsed={isCollapsed} 
          isFullscreen={isFullscreen} 
          onToggleFullscreen={handleToggleFullscreen} 
          currentView={currentView}
          sidebarWidth={sidebarWidth}
          isMobile={isMobile}
          onMobileMenuToggle={handleMobileMenuToggle}
        />
        <DashboardFooter isCollapsed={isCollapsed} sidebarWidth={sidebarWidth} />
        <div
          className="dashboard-main"
          style={{
            marginLeft: isMobile ? 0 : sidebarWidth,
            transition: 'margin-left 0.3s cubic-bezier(.4,0,.2,1)',
            minHeight: '100vh',
            display: 'flex',
            flexDirection: 'column',
            width: isMobile ? '100%' : `calc(100vw - ${sidebarWidth}px)`,
            maxWidth: isMobile ? '100%' : `calc(100vw - ${sidebarWidth}px)`,
            overflow: 'hidden',
            boxSizing: 'border-box',
          }}
        >
          <main
            className="dashboard-content"
            style={{
              marginTop: headerHeight,
              marginBottom: footerHeight,
              minHeight: `calc(100vh - ${headerHeight + footerHeight}px)`,
              transition: 'margin 0.3s cubic-bezier(.4,0,.2,1)',
              position: 'relative',
              width: '100%',
              maxWidth: '100%',
              padding: isMobile ? (window.innerWidth <= 480 ? '8px' : '12px') : '20px',
              boxSizing: 'border-box',
              overflow: 'hidden',
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