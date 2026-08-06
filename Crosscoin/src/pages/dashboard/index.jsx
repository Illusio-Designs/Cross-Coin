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
import { BrandManager } from "./brands";
import { Blogs } from "./blogs";
import AdminLookbooks from "./social/lookbooks";
import { WhatsAppManager } from "./whatsapp";
import StaffUsers from "./staff-users/staffUsers";
import Reports from "./reports/reports";
import { HugeiconsIcon } from '@hugeicons/react';
import { UnavailableIcon } from '@hugeicons/core-free-icons';

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
      <HugeiconsIcon icon={UnavailableIcon} size={48} strokeWidth={1.5} aria-hidden="true" />
      <h2 style={{ fontSize: 18, fontWeight: 600, color: '#374151', margin: 0 }}>
        Access Denied
      </h2>
      <p style={{ fontSize: 14, margin: 0 }}>
        You don't have permission to view this page.
      </p>
    </section>
  );
}

// Shown while auth/role is still resolving, so we never flash "Access Denied"
// before the role API has responded (e.g. on a dashboard reload).
function LoadingAccess() {
  return (
    <section
      role="status"
      aria-label="Loading"
      aria-busy="true"
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        height: '60vh',
        gap: 14,
        color: '#6b7280'
      }}
    >
      <span
        aria-hidden="true"
        style={{
          width: 34,
          height: 34,
          border: '3px solid #e5e7eb',
          borderTopColor: 'var(--ds-color-text)',
          borderRadius: '50%',
          animation: 'dashSpin 0.7s linear infinite'
        }}
      />
      <p style={{ fontSize: 14, margin: 0 }}>Loading…</p>
      <style jsx>{`@keyframes dashSpin { to { transform: rotate(360deg); } }`}</style>
    </section>
  );
}

function Dashboard() {
  const { role, canAccessView, loading } = useAuth();
  const [currentView, setCurrentView] = useState('main');
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isCollapsed, setIsCollapsed] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [themeMode, setThemeMode] = useState('auto'); // 'auto' | 'light' | 'dark'
  const [theme, setTheme] = useState('light');        // effective theme (drives the icon)

  // In 'auto' mode the theme follows the clock in IST (UTC+5:30): dark at
  // night (18:00–06:00), light during the day. Manual light/dark overrides it.
  const istTheme = () => {
    const now = new Date();
    const istHour = new Date(now.getTime() + (now.getTimezoneOffset() * 60000) + (5.5 * 3600000)).getHours();
    return (istHour >= 18 || istHour < 6) ? 'dark' : 'light';
  };
  const applyMode = (mode) => {
    const eff = mode === 'auto' ? istTheme() : mode;
    setTheme(eff);
    document.documentElement.setAttribute('data-theme', eff);
  };

  // Theme is scoped to the dashboard only — we set data-theme on <html> while
  // the dashboard is mounted and remove it on unmount so the storefront (which
  // doesn't read the dark tokens) is never affected.
  useEffect(() => {
    const saved = (typeof window !== 'undefined' && localStorage.getItem('obzus-theme')) || 'auto';
    setThemeMode(saved);
    applyMode(saved);
    return () => { document.documentElement.removeAttribute('data-theme'); };
  }, []);

  // While auto, re-evaluate every minute so the theme flips at the IST
  // day/night boundary without a page reload.
  useEffect(() => {
    if (themeMode !== 'auto') return;
    applyMode('auto');
    const id = setInterval(() => applyMode('auto'), 60 * 1000);
    return () => clearInterval(id);
  }, [themeMode]); // eslint-disable-line react-hooks/exhaustive-deps

  const handleToggleTheme = () => {
    setThemeMode(prev => {
      const next = prev === 'auto' ? 'light' : prev === 'light' ? 'dark' : 'auto';
      try { localStorage.setItem('obzus-theme', next); } catch {}
      applyMode(next);
      return next;
    });
  };

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
      case 'faqs':            return <SeoHub initialTab="faqs" />;
      case 'policies':        return <Policies />;
      case 'blogs':           return <Blogs />;
      case 'lookbooks':       return <AdminLookbooks />;
      case 'whatsapp':        return <WhatsAppManager />;
      case 'whatsapp-chat':   return <WhatsAppManager />;
      // Brands and settings are now one combined page — both menu items open it.
      case 'brands':          return <BrandManager />;
      case 'brand-settings':  return <BrandManager />;
      case 'slider':          return <Slider />;
      case 'media-gallery':   return <MediaGallery />;
      case 'utm-analytics':   return <UTMAnalytics />;
      case 'reports':         return <Reports />;
      case 'staff-users':     return <StaffUsers />;
      // Error/uptime monitoring now lives in Sentry + UptimeRobot, so the
      // in-app System Monitoring panel (5s polling) was removed.
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
            theme={theme}
            themeMode={themeMode}
            onToggleTheme={handleToggleTheme}
          />
        </header>
        <footer role="contentinfo" aria-label="Dashboard footer">
          <DashboardFooter />
        </footer>
        <div className="dl-main">
          <main className="dl-content" role="main" aria-label="Dashboard main content">
            {loading ? (
              <LoadingAccess />
            ) : currentView !== 'main' && !canAccessView(currentView) ? (
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
