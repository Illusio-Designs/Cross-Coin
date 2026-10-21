import ProtectedRoute from "../../components/common/ProtectedRoute";
import Sidebar from "../../components/Sidebar/Sidebar.jsx";
import CardGrid from '../../components/Dashboard/Card';
import DashboardHeader from '../../components/Dashboard/DashboardHeader';
import DashboardFooter from '../../components/Dashboard/DashboardFooter';
import { useState, useEffect, Fragment } from "react";
import { useAuth } from "../../context/AuthContext";
import { SkeletonPage } from "../../components/ui/Skeleton";
import { handleViewChange, getViewFromPath } from "../../utils/dashboardRouting";

import Products from "./products/products";
import Categories from "./products/categories";
import Attributes from "./products/attributes";
import PackPricing from "./products/pack-pricing";
import Orders from "./orders/orders";
import Consumers from "./consumers/consumers";
import Leads from "./consumers/leads";
import CustomerProfile from "./consumers/customer";
import Payments from "./payments/payments";
import Loyalty from "./loyalty/loyalty";
import ShippingFees from "./shipping/shippingFees";
import Coupons from "./coupon/coupons";
import Reviews from "./reviews/reviews";
import SeoHub from "./seo/hub";
import Slider from "./slider/slider";
import MediaGallery from "./media/gallery";
import { Policies } from "./policies";
import { BrandManager } from "./brands";
import { Blogs } from "./blogs";
import { WhatsAppManager } from "./whatsapp";
import StaffUsers from "./staff-users/staffUsers";
import ReportHub, { LEGACY_REPORT_VIEWS } from "./reports/ReportHub";
import SystemHealth from "./system/systemHealth";
import { HugeiconsIcon } from '@hugeicons/react';
import { UnavailableIcon } from '@hugeicons/core-free-icons';

const SB_EXPANDED = 248;
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
        color: 'var(--ds-color-text-muted)'
      }}
    >
      <HugeiconsIcon icon={UnavailableIcon} size={48} strokeWidth={1.5} aria-hidden="true" />
      <h2 style={{ fontSize: 18, fontWeight: 600, color: 'var(--ds-color-text-muted)', margin: 0 }}>
        Access Denied
      </h2>
      <p style={{ fontSize: 14, margin: 0 }}>
        You don't have permission to view this page.
      </p>
    </section>
  );
}

// Shown while auth/role is still resolving, so we never flash "Access Denied"
// before the role API has responded (e.g. on a dashboard reload). A page-shaped
// skeleton in the content area — the menu and header are already on screen.
function LoadingAccess() {
  return <SkeletonPage kpis={4} rows={7} cols={5} label="Loading your dashboard…" />;
}

function Dashboard() {
  const { canAccessView, loading } = useAuth();
  const [currentView, setCurrentView] = useState('main');
  // Bumped on every menu click so picking the page you're already on opens it
  // fresh (e.g. Orders → Problems reads its tab hint on mount).
  const [visit, setVisit] = useState(0);
  const [isMobile, setIsMobile] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  // Desktop only: full menu or icon rail, remembered in localStorage. Phones
  // always get the full menu as a drawer.
  const [isCollapsed, setIsCollapsed] = useState(false);
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
    try { setIsCollapsed(localStorage.getItem('sidebarCollapsed') === 'true'); } catch { /* storage blocked */ }
    const check = () => {
      const mobile = window.innerWidth <= 900;
      setIsMobile(mobile);
      if (!mobile) setIsMobileMenuOpen(false);
    };
    check();
    window.addEventListener('resize', check);
    return () => window.removeEventListener('resize', check);
  }, []);

  const handleToggleCollapse = () => {
    setIsCollapsed((prev) => {
      try { localStorage.setItem('sidebarCollapsed', String(!prev)); } catch { /* storage blocked */ }
      return !prev;
    });
  };

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
    setVisit((n) => n + 1);
    if (isMobile) setIsMobileMenuOpen(false);
  };

  const handleMobileMenuToggle = () => setIsMobileMenuOpen(p => !p);

  const renderContent = () => {
    switch (currentView) {
      case 'products':        return <Products />;
      case 'categories':      return <Categories />;
      case 'attributes':      return <Attributes />;
      case 'pack-pricing':    return <PackPricing />;
      case 'orders':          return <Orders key="orders" />;
      case 'consumers':       return <Consumers />;
      case 'customer':        return <CustomerProfile />;
      // Returns and failed deliveries live inside Orders as tabs now; the old
      // views open Orders on that tab so bookmarks and notifications still work.
      case 'returns':         return <Orders key="returns" initialTab="returns" />;
      case 'payments':        return <Payments />;
      case 'ndr':             return <Orders key="ndr" initialTab="problems" />;
      case 'shippingFees':    return <ShippingFees />;
      case 'webhook-events':  return <ShippingFees focus="log" />;
      case 'coupons':         return <Coupons />;
      case 'reviews':         return <Reviews />;
      // SEO page. Older seo-* views open the matching tab so bookmarks work.
      case 'seo':             return <SeoHub />;
      case 'seo-global':      return <SeoHub initialTab="settings" />;
      case 'seo-health':      return <SeoHub initialTab="overview" />;
      case 'seo-bulk':        return <SeoHub initialTab="overview" />;
      case 'seo-pages':       return <SeoHub initialTab="pages" />;
      case 'faqs':            return <SeoHub initialTab="faqs" />;
      case 'policies':        return <Policies />;
      case 'blogs':           return <Blogs />;
      case 'whatsapp':        return <WhatsAppManager />;
      case 'whatsapp-chat':   return <WhatsAppManager />;
      // Brands and settings are now one combined page — both menu items open it.
      case 'brands':          return <BrandManager />;
      case 'brand-settings':  return <BrandManager />;
      case 'slider':          return <Slider />;
      case 'media-gallery':   return <MediaGallery />;
      // Reports: two tabbed pages. The old single-report views (bookmarks,
      // links) open the page and tab that now hold them.
      case 'reports-sales':     return <ReportHub group="sales" />;
      case 'reports-marketing': return <ReportHub group="marketing" />;
      case 'reports': case 'traffic-report': case 'revenue-profit': case 'report-location':
      case 'report-products': case 'report-customers': case 'report-inventory': case 'report-coupons':
      case 'report-ads':
        return <ReportHub group={LEGACY_REPORT_VIEWS[currentView].group} initialTab={LEGACY_REPORT_VIEWS[currentView].tab} />;
      case 'leads':           return <Leads />;
      case 'loyalty':         return <Loyalty />;
      case 'staff-users':     return <StaffUsers />;
      // Scheduled jobs, queue, webhooks and errors (admin only — no other
      // role lists it in ROLE_VIEWS).
      case 'system-health':   return <SystemHealth />;
      default:                return <CardGrid />;
    }
  };

  return (
    <ProtectedRoute>
      <div className="dl">
        <Sidebar
          collapsed={isCollapsed}
          isMobile={isMobile}
          onToggleCollapse={handleToggleCollapse}
          onViewChange={onViewChange}
          currentView={currentView}
          isMobileMenuOpen={isMobileMenuOpen}
          onMobileMenuToggle={handleMobileMenuToggle}
        />
        <DashboardHeader
          currentView={currentView}
          isMobile={isMobile}
          isMobileMenuOpen={isMobileMenuOpen}
          onMobileMenuToggle={handleMobileMenuToggle}
          theme={theme}
          themeMode={themeMode}
          onToggleTheme={handleToggleTheme}
        />
        <DashboardFooter />
        <div className="dl-main">
          <main className="dl-content" aria-label="Page content">
            {loading ? (
              <LoadingAccess />
            ) : currentView !== 'main' && !canAccessView(currentView) ? (
              <NoAccess />
            ) : (
              <Fragment key={visit}>{renderContent()}</Fragment>
            )}
          </main>
        </div>
      </div>
    </ProtectedRoute>
  );
}

export default Dashboard;
