// import { ThemeProvider } from 'next-themes'; // Disabled dark mode
import Head from "next/head";
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "../lib/queryClient";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { AuthProvider } from "../context/AuthContext";
import { useEffect, useRef } from "react";
import { useRouter } from "next/router";
import { monitoring } from '../utils/monitoring';
import { installLinkHardening } from '../utils/sanitizeHtml';
import { installApiInterceptors } from '../utils/apiInterceptors';
import { installErrorReporter } from '../utils/errorReporter';
// ── Global CSS (Pages Router: all global CSS must be imported here) ──
// Obzus app = public site + admin dashboard + /login. Storefront page/component
// CSS has been removed; only shared globals, the admin login, the dashboard
// sidebar, and the design-system tokens/ui-kit stay global.
import "../styles/common/globals.css";
import "../styles/common/obzToast.css";
import "../styles/common/responsive.css";
import "../styles/common/mobile-utilities.css";
import "../styles/common/skeleton.css";
import "../styles/common/critical.css";
import "../styles/common/DonutChart.css";
import "../styles/common/Dropdown.css";
import "../styles/components/Sidebar.css";
import "../styles/pages/auth/adminlogin.css";
import "../styles/pages/NotFound.css";
// Design-system tokens + primitives (dashboard pages + shared components/ui/*)
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
// Heavy admin-page CSS is bundled into /public/dashboard.css and loaded via a
// <link> on /dashboard routes only (see AppContent).

import Analytics from "../components/common/Analytics";
import UTMTracker from "../components/common/UTMTracker";
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
        autoClose={3000}
        hideProgressBar={true}
        newestOnTop={true}
        closeOnClick={false}
        closeButton={false}
        icon={false}
        rtl={false}
        pauseOnFocusLoss={false}
        draggable={false}
        pauseOnHover={true}
        limit={3}
      />
    </>
  );
}

function AppWrapper({ Component, pageProps, progressRef }) {
  return (
    <QueryClientProvider client={queryClient}>
      {/* No storefront Cart/Wishlist providers here — this app is the public
          Obzus site + admin dashboard only. They used to fetch /api/cart and
          /api/wishlist on the public pages, which 401'd and wiped the admin
          token (forcing a re-login when returning to /dashboard). */}
      <AuthProvider>
        <AppContent
          Component={Component}
          pageProps={pageProps}
          progressRef={progressRef}
        />
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
    // Drain render errors + unhandled rejections to /api/client-errors.
    installErrorReporter();
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
      {!router.pathname.startsWith('/dashboard') && (
        <>
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

