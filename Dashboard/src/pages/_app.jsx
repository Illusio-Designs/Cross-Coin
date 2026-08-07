// import { ThemeProvider } from 'next-themes'; // Disabled dark mode
import Head from "next/head";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "../lib/queryClient";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { CartProvider, useCart } from "../context/CartContext";
import { WishlistProvider } from "../context/WishlistContext";
import { BreadcrumbProvider } from "../components/common/Breadcrumb";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import Loader from "../components/common/Loader";
import CartDrawer from "../components/cart/CartDrawer";
import Breadcrumb from "../components/common/Breadcrumb";
import Header from "../components/layout/Header";
import Footer from "../components/layout/Footer";
import { monitoring } from '../utils/monitoring';
import { installLinkHardening } from '../utils/sanitizeHtml';
import { installApiInterceptors } from '../utils/apiInterceptors';
import { installErrorReporter } from '../utils/errorReporter';
import { tryInitSentry } from '../utils/sentryAdapter';
import SentryInit from '../components/SentryInit';
// Global CSS — all imports must live here (Next.js Pages Router rule)
import "../styles/common/globals.css";
import "../styles/common/responsive.css";
import "../styles/common/mobile-utilities.css";
import "../styles/common/skeleton.css";
import "../styles/common/critical.css";
import "../styles/common/DonutChart.css";
import "../styles/common/FomoElements.css";
// Components
import "../styles/components/InfiniteReviewsSlider.css";
import "../styles/components/ReviewForm.css";
// Pages
import "../styles/pages/Home.css";
import "../styles/pages/Login.css";
import "../styles/pages/Profile.css";
import "../styles/pages/products.css";
import "../styles/pages/ProductDetails.css";
import "../styles/pages/Wishlist.css";
import "../styles/pages/ThankYou.css";
import "../styles/pages/OrderTracking.css";
import "../styles/pages/SearchResults.css";
import "../styles/pages/Policy.css";
import "../styles/pages/Contact.css";
import "../styles/pages/Collections.css";
import "../styles/pages/About.css";
import "../styles/pages/auth/adminlogin.css";
import '../styles/pages/blog.css';
import '../styles/pages/blog-details.css';
import '../styles/pages/sitemap.css';
import '../styles/pages/NotFound.css';

// Components - Layout
import "../styles/components/Header.css";
import "../styles/components/Footer.css";
import "../styles/components/Breadcrumb.css";

// Components - Products
import "../styles/components/ProductCard.css";
import "../styles/components/HeroSlider.css";
import "../styles/components/SlidingCollection.css";
import "../styles/components/UnlockedExclusives.css";

// Components - Common
import "../styles/components/Testimonials.css";
import "../styles/components/TrustBadges.css";
import "../styles/components/CouponStrip.css";
import "../styles/components/Toast.css";
import "../styles/components/blog-section.css";

import "../styles/components/Sidebar.css";
import "../styles/components/CartDrawer.css";
import "../styles/components/SizeChartModal.css";
import "../styles/components/ProductFilterDrawer.css";
import "../styles/components/FomoBar.css";
import "../styles/common/Dropdown.css";

// UI Components CSS
// Design-system tokens + primitives (used by new admin pages and any
// legacy page migrated to <PageHeader> / <Panel> / <StatTile> etc.)
import "../styles/dashboard/tokens.css";
import "../styles/dashboard/primitives.css";
import "../styles/dashboard/ui-button.css";
import "../styles/dashboard/ui-input.css";
import "../styles/dashboard/ui-modal.css";
import "../styles/dashboard/ui-table.css";
import "../styles/dashboard/ui-pagination.css";
import "../styles/dashboard/ui-badge.css";
import "../styles/dashboard/ui-select.css";
import "../styles/dashboard/ui-switch.css";
import "../styles/dashboard/dateRangePicker.css";

// ── Admin-PAGE dashboard CSS is intentionally NOT imported here. ──
// manualOrder, layout, tables, Card, payments, products, orders, media,
// utmAnalytics, attributes, slider, pages, brands, brandSettings, brandTags,
// brandAssignment, seo, social, whatsapp, analytics were ~226KB of
// render-blocking CSS that EVERY storefront page downloaded (Pages-Router
// bundles all _app global CSS into one stylesheet) but only /dashboard uses.
// They are now bundled into /public/dashboard.css by
// scripts/build-dashboard-css.mjs and loaded via a <link> only on /dashboard
// routes (see AppContent). This removes that weight from the storefront's
// FCP/LCP critical path. The shared UI kit above (tokens / primitives / ui-* /
// dateRangePicker) STAYS global — storefront Products/SearchResults use
// Pagination + Modal from components/ui, which those styles back.
import "../styles/components/WhatsAppChat.css";
// Additional page CSS
import "../styles/pages/Lookbook.css";

import Analytics from "../components/common/Analytics";
import Msg91Loader from "../components/common/Msg91Loader";
import UTMTracker from "../components/common/UTMTracker";
import WhatsAppChat from "../components/common/WhatsAppChat";
import PhonePopupModal from "../components/common/PhonePopupModal";
import "../styles/components/PhonePopupModal.css";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics as VercelAnalytics } from "@vercel/analytics/react";
import ErrorBoundary from "../components/common/ErrorBoundary";
import { DASHBOARD_CSS_VERSION } from "../dashboardCssVersion";

function AppContent({ Component, pageProps, progressRef }) {
  const router = useRouter();

  // This app serves the public Obzus site (own Layout) + the admin dashboard
  // (own Sidebar/Header) + /login. There is NO storefront chrome here — the
  // dashboard CSS bundle is still loaded only on /dashboard routes.
  const isDashboard = router.pathname.startsWith('/dashboard');

  return (
    <>
      <SentryInit />
      {isDashboard && (
        <Head>
          <link rel="stylesheet" href={`/dashboard.css?v=${DASHBOARD_CSS_VERSION}`} />
        </Head>
      )}
      {/* Global reading progress bar */}
      <div className="custom-scrollbar-progress">
        <div
          className="custom-scrollbar-progress-fill"
          ref={progressRef}
          style={{ width: 0 }}
        />
      </div>

      <Component {...pageProps} />

      <ToastContainer
        position="top-right"
        autoClose={1500}
        hideProgressBar={true}
        newestOnTop={true}
        closeOnClick={true}
        closeButton={true}
        rtl={false}
        pauseOnFocusLoss={false}
        draggable={false}
        pauseOnHover={false}
        theme="light"
        limit={3}
        toastOptions={{
          autoClose: 1500,
          pauseOnHover: false,
          pauseOnFocusLoss: false,
        }}
      />
    </>
  );
}

function AppWrapper({ Component, pageProps, progressRef }) {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <CartProvider>
          <WishlistProvider>
            <BreadcrumbProvider>
              <AppContent 
                Component={Component} 
                pageProps={pageProps}
                progressRef={progressRef}
              />
            </BreadcrumbProvider>
          </WishlistProvider>
        </CartProvider>
      </AuthProvider>
    </QueryClientProvider>
  );
}

function App({ Component, pageProps }) {
  const router = useRouter();
  const progressRef = useRef();
  useEffect(() => {
    // Fix for turbopack error
    if (typeof window !== 'undefined' && !window.__turbopack_load_page_chunks__) {
      window.__turbopack_load_page_chunks__ = () => {};
    }
    // Harden external links inside DOMPurify-sanitized content
    // (adds target=_blank + rel=noopener, lazy-loads images).
    installLinkHardening();
    // Wire axios interceptors: timeout, error toast, CSRF token mirror.
    installApiInterceptors();
    // Drain render errors + unhandled rejections. If @sentry/nextjs is
    // installed AND NEXT_PUBLIC_SENTRY_DSN is set, errors go to Sentry;
    // otherwise they fall through to /api/client-errors.
    installErrorReporter(tryInitSentry() || undefined);
  }, []);

  useEffect(() => {
    // Track page views with router events
    const handleRouteChange = (url) => {
      if (typeof window !== 'undefined' && monitoring) {
        const pageName = url.split('?')[0] || '/';
        monitoring.logPageView(pageName, { url });
      }
    };

    router.events?.on('routeChangeComplete', handleRouteChange);
    return () => {
      router.events?.off('routeChangeComplete', handleRouteChange);
    };
  }, [router]);

  useEffect(() => {
    // Scroll progress bar logic with throttling to prevent excessive re-renders
    let ticking = false;

    function updateScrollProgress() {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      const percent = docHeight > 0 ? scrollTop / docHeight : 0;
      if (progressRef.current) {
        progressRef.current.style.width = `${percent * 100}%`;
      }
      ticking = false;
    }

    function requestTick() {
      if (!ticking) {
        window.requestAnimationFrame(updateScrollProgress);
        ticking = true;
      }
    }

    window.addEventListener("scroll", requestTick, { passive: true });
    updateScrollProgress();
    return () => window.removeEventListener("scroll", requestTick);
  }, []);

  return (
    <>
      <Head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=5, user-scalable=yes"
        />
        <title>Obzus Admin</title>
        <link rel="icon" href="/favicon.ico" sizes="any" />
        <link rel="icon" href="/favicon.svg" type="image/svg+xml" />
        <link rel="icon" type="image/png" sizes="32x32" href="/favicon-32.png" />
        <link rel="apple-touch-icon" href="/apple-touch-icon.png" />
      </Head>
      <UTMTracker />
      <Analytics />
      {!router.pathname.startsWith('/dashboard') && !router.pathname.startsWith('/auth') && (
        <>
          <Msg91Loader />
          <SpeedInsights />
          <VercelAnalytics />
        </>
      )}
      <ErrorBoundary>
        <AppWrapper
          Component={Component}
          pageProps={pageProps}
          progressRef={progressRef}
        />
      </ErrorBoundary>
    </>
  );
}

export default App;

