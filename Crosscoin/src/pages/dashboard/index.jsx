import ProtectedRoute from "../../components/common/ProtectedRoute";
import Sidebar from "../../components/Sidebar/Sidebar.jsx";
import CardGrid from '../../components/Dashboard/Card';
import DashboardHeader from '../../components/Dashboard/DashboardHeader';
import DashboardFooter from '../../components/Dashboard/DashboardFooter';
import { useState, useEffect } from "react";
import { handleViewChange, getViewFromPath } from "../../utils/dashboardRouting";

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
import { Policies } from "./policies";
import UTMAnalytics from "./analytics/utmAnalytics";
import AnalyticsPage from "../../components/Dashboard/AnalyticsPage";
import { BrandSettingsManager } from "./brandSettings";
import { BrandManager } from "./brands";
import { Blogs } from "./blogs";
import AdminLookbooks from "./social/lookbooks";
import AdminReels from "./social/reels";
import AdminInstagramFeed from "./social/instagram";
import { WhatsAppManager } from "./whatsapp";

const SB_EXPANDED = 260;
const SB_COLLAPSED = 72;

function Dashboard() {
  const [currentView, setCurrentView] = useState('main');
  // Initialize isMobile synchronously so hamburger renders on first paint
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Single init effect — runs once on mount
  useEffect(() => {
    const mobile = window.innerWidth <= 900;
    setIsMobile(mobile);

    if (mobile) {
      setIsCollapsed(true);
      // Clear any mobile-saved collapsed state so desktop isn't affected
      localStorage.removeItem('sidebarCollapsed');
    } else {
      const saved = localStorage.getItem('sidebarCollapsed');
      setIsCollapsed(saved !== null ? JSON.parse(saved) : false);
    }
  }, []);

  // Save to localStorage only on desktop
  useEffect(() => {
    if (!isMobile) {
      localStorage.setItem('sidebarCollapsed', JSON.stringify(isCollapsed));
    }
  }, [isCollapsed, isMobile]);

  // Resize handler
  useEffect(() => {
    const check = () => {
      const mobile = window.innerWidth <= 900;
      setIsMobile(mobile);
      if (mobile) setIsCollapsed(true);
    };
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  useEffect(() => { setCurrentView(getViewFromPath()); }, []);

  useEffect(() => {
    const onPop = () => setCurrentView(getViewFromPath());
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  // Drive header/footer/main offset via a single CSS variable
  const sbw = isMobile ? 0 : (isCollapsed ? SB_COLLAPSED : SB_EXPANDED);
  useEffect(() => {
    document.documentElement.style.setProperty('--sb-w', `${sbw}px`);
  }, [sbw]);

  const onViewChange = (v) => {
    handleViewChange(v, setCurrentView);
    if (isMobile) setIsMobileMenuOpen(false);
  };
  const handleMobileMenuToggle = () => setIsMobileMenuOpen(p => !p);

  const handleToggleFullscreen = () => {
    const el = document.documentElement;
    if (!isFullscreen) {
      if (el.requestFullscreen) el.requestFullscreen();
      else if (el.mozRequestFullScreen) el.mozRequestFullScreen();
      else if (el.webkitRequestFullscreen) el.webkitRequestFullscreen();
      setIsFullscreen(true);
    } else {
      if (document.exitFullscreen) document.exitFullscreen();
      else if (document.mozCancelFullScreen) document.mozCancelFullScreen();
      else if (document.webkitExitFullscreen) document.webkitExitFullscreen();
      setIsFullscreen(false);
    }
  };

  useEffect(() => {
    const onChange = () => setIsFullscreen(!!(
      document.fullscreenElement || document.webkitFullscreenElement ||
      document.mozFullScreenElement || document.msFullscreenElement
    ));
    const evts = ['fullscreenchange','webkitfullscreenchange','mozfullscreenchange','MSFullscreenChange'];
    evts.forEach(e => document.addEventListener(e, onChange));
    return () => evts.forEach(e => document.removeEventListener(e, onChange));
  }, []);

  const renderContent = () => {
    switch (currentView) {
      case 'products':       return <Products />;
      case 'categories':     return <Categories />;
      case 'attributes':     return <Attributes />;
      case 'orders':         return <Orders />;
      case 'consumers':      return <Consumers />;
      case 'shippingFees':   return <ShippingFees />;
      case 'payments':       return <Payments />;
      case 'coupons':        return <Coupons />;
      case 'reviews':        return <Reviews />;
      case 'seo':            return <SEO />;
      case 'policies':       return <Policies />;
      case 'blogs':          return <Blogs />;
      case 'lookbooks':      return <AdminLookbooks />;
      case 'reels-admin':    return <AdminReels />;
      case 'instagram-admin': return <AdminInstagramFeed />;
      case 'whatsapp':       return <WhatsAppManager />;
      case 'whatsapp-chat':  return <WhatsAppManager />;
      case 'brands':         return <BrandManager />;
      case 'brand-settings': return <BrandSettingsManager />;
      case 'slider':         return <Slider />;
      case 'media-gallery':  return <MediaGallery />;
      case 'analytics':      return <AnalyticsPage />;
      case 'utm-analytics':  return <UTMAnalytics />;
      default:               return <CardGrid />;
    }
  };

  return (
    <ProtectedRoute requireAdmin={true}>
      <div className="dl">
        <Sidebar
          isCollapsed={isCollapsed}
          onToggleCollapse={() => setIsCollapsed(p => !p)}
          onViewChange={onViewChange}
          currentView={currentView}
          isMobileMenuOpen={isMobileMenuOpen}
          onMobileMenuToggle={handleMobileMenuToggle}
        />
        <DashboardHeader
          isFullscreen={isFullscreen}
          onToggleFullscreen={handleToggleFullscreen}
          currentView={currentView}
          isMobile={isMobile}
          onMobileMenuToggle={handleMobileMenuToggle}
        />
        <DashboardFooter />
        <div className="dl-main">
          <main className="dl-content">
            {renderContent()}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}

export default Dashboard;
