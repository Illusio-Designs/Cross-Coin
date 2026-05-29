import ProtectedRoute from "../../components/common/ProtectedRoute";
import Sidebar from "../../components/Sidebar/Sidebar.jsx";
import CardGrid from '../../components/Dashboard/Card';
import DashboardHeader from '../../components/Dashboard/DashboardHeader';
import DashboardFooter from '../../components/Dashboard/DashboardFooter';
import { useState, useEffect } from "react";
import { useAuth, ROLE_VIEWS } from "../../context/AuthContext";
import { handleViewChange, getViewFromPath } from "../../utils/dashboardRouting";

import Products from "./products/products";
import Categories from "./products/categories";
import Attributes from "./products/attributes";
import Orders from "./orders/orders";
import Consumers from "./consumers/consumers";
import ShippingFees from "./shipping/shippingFees";
import { ShippingSettingsManager } from "./shipping/shippingSettings";
import Payments from "./payments/payments";
import Coupons from "./coupon/coupons";
import Reviews from "./reviews/reviews";
import SEO from "./seo/seo";
import FaqsManager from "./seo/faqs";
import GlobalSeoSettings from "./seo/global";
import SeoHealth from "./seo/health";
import SeoBulkEditor from "./seo/bulk";
import SeoHub from "./seo/hub";
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
import StaffUsers from "./staff-users/staffUsers";
import MonitoringDashboard from "./monitoring/index";

const SB_EXPANDED = 260;
const SB_COLLAPSED = 72;

// Unauthorized placeholder with accessibility
function NoAccess() {
  return (
    <section
      role="region"
      aria-label="Access denied"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '60vh',
        gap: 12,
        color: '#6b7280'
      }}
    >
      <svg
        width="48"
        height="48"
        fill="none"
        stroke="currentColor"
        strokeWidth="1.5"
        viewBox="0 0 24 24"
        aria-hidden="true"
      >
        <circle cx="12" cy="12" r="10"/>
        <line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/>
      </svg>
      <h2 style={{ fontSize: 18, fontWeight: 600, color: '#374151', margin: 0 }}>
        Access Denied
      </h2>
      <p style={{ fontSize: 14, margin: 0 }}>
        You don't have permission to view this page.
      </p>
    </section>
  );
}

function Dashboard() {
  const { role, canAccessView } = useAuth();
  const [currentView, setCurrentView] = useState('main');
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  useEffect(() => {
    const mobile = window.innerWidth <= 900;
    setIsMobile(mobile);
    if (mobile) {
      setIsCollapsed(true);
      localStorage.removeItem('sidebarCollapsed');
    } else {
      const saved = localStorage.getItem('sidebarCollapsed');
      setIsCollapsed(saved !== null ? JSON.parse(saved) : false);
    }
  }, []);

  useEffect(() => {
    if (!isMobile) localStorage.setItem('sidebarCollapsed', JSON.stringify(isCollapsed));
  }, [isCollapsed, isMobile]);

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
      case 'products':        return <Products />;
      case 'categories':      return <Categories />;
      case 'attributes':      return <Attributes />;
      case 'orders':          return <Orders />;
      case 'consumers':       return <Consumers />;
      case 'shippingFees':    return <ShippingFees />;
      case 'shipping-settings': return <ShippingSettingsManager />;
      case 'payments':        return <Payments />;
      case 'coupons':         return <Coupons />;
      case 'reviews':         return <Reviews />;
      // The new unified SEO hub. Legacy seo-* views still work as
      // direct routes (each renders the same component the hub uses
      // for its tab content) so old admin bookmarks don't break.
      case 'seo':             return <SeoHub />;
      case 'seo-global':      return <SeoHub initialTab="settings" />;
      case 'seo-health':      return <SeoHub initialTab="overview" />;
      case 'seo-bulk':        return <SeoHub initialTab="products" />;
      case 'seo-pages':       return <SeoHub initialTab="pages" />;
      case 'seo-search':      return <SeoHub initialTab="search" />;
      case 'faqs':            return <SeoHub initialTab="faqs" />;
      case 'policies':        return <Policies />;
      case 'blogs':           return <Blogs />;
      case 'lookbooks':       return <AdminLookbooks />;
      case 'reels-admin':     return <AdminReels />;
      case 'instagram-admin': return <AdminInstagramFeed />;
      case 'whatsapp':        return <WhatsAppManager />;
      case 'whatsapp-chat':   return <WhatsAppManager />;
      case 'brands':          return <BrandManager />;
      case 'brand-settings':  return <BrandSettingsManager />;
      case 'slider':          return <Slider />;
      case 'media-gallery':   return <MediaGallery />;
      case 'analytics':       return <AnalyticsPage />;
      case 'utm-analytics':   return <UTMAnalytics />;
      case 'monitoring':      return <MonitoringDashboard />;
      case 'staff-users':     return <StaffUsers />;
      default:                return <CardGrid />;
    }
  };

  return (
    <ProtectedRoute>
      <div className="dl">
        <nav aria-label="Dashboard navigation" role="navigation">
          <Sidebar
            isCollapsed={isCollapsed}
            onToggleCollapse={() => setIsCollapsed(p => !p)}
            onViewChange={onViewChange}
            currentView={currentView}
            isMobileMenuOpen={isMobileMenuOpen}
            onMobileMenuToggle={handleMobileMenuToggle}
          />
        </nav>
        <header role="banner" aria-label="Dashboard header">
          <DashboardHeader
            isFullscreen={isFullscreen}
            onToggleFullscreen={handleToggleFullscreen}
            currentView={currentView}
            isMobile={isMobile}
            onMobileMenuToggle={handleMobileMenuToggle}
          />
        </header>
        <footer role="contentinfo" aria-label="Dashboard footer">
          <DashboardFooter />
        </footer>
        <div className="dl-main">
          <main className="dl-content" role="main" aria-label="Dashboard main content">
            {currentView !== 'main' && !canAccessView(currentView) ? (
              <NoAccess />
            ) : (
              renderContent()
            )}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}

export default Dashboard;
