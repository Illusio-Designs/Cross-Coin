// import { ThemeProvider } from 'next-themes'; // Disabled dark mode
import Head from "next/head";
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
// Global CSS — all imports must live here (Next.js Pages Router rule)
import "../styles/common/globals.css";
import "../styles/common/responsive.css";
import "../styles/common/mobile-utilities.css";
import "../styles/common/skeleton.css";
import "../styles/common/critical.css";
// Pages
import "../styles/pages/Home.css";
import "../styles/pages/Login.css";
import "../styles/pages/Profile.css";
import "../styles/pages/products.css";
import "../styles/pages/ProductDetails.css";
import "../styles/pages/UnifiedCheckout.css";
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

// Components - Co-located CSS (in component directories)
import "../components/Sidebar/Sidebar.css";
import "../components/cart/CartDrawer.css";
import "../components/cart/QuantityOfferBar.css";
import "../components/products/ProductDetailsTest.css";
import "../components/products/ProductFilterDrawer.css";
import "../components/ui/Dropdown.css";

// Additional dashboard CSS
import "../styles/dashboard/payments.css";
import "../styles/dashboard/products.css";
import "../styles/dashboard/orders.css";
import "../styles/dashboard/media.css";
import "../styles/dashboard/utmAnalytics.css";
import "../styles/dashboard/attributes.css";
// Additional page CSS
import "../styles/pages/Collections.css";
import "../styles/pages/About.css";
import "../styles/pages/BlogDetails.css";
import "../styles/components/blog-section.css";
// Third-party
import "react-quill/dist/quill.snow.css";

import Analytics from "../components/common/Analytics";
import UTMTracker from "../components/common/UTMTracker";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics as VercelAnalytics } from "@vercel/analytics/react";

function AppContent({ Component, pageProps, progressRef }) {
  const { isDrawerOpen, setIsDrawerOpen, lastAddedItem, cartItems } = useCart();
  const { user } = useAuth();
  const router = useRouter();
  
  // Check if current route is a dashboard route
  const isDashboard = router.pathname.startsWith('/dashboard');
  const isAuthPage = router.pathname === '/login' || router.pathname === '/register';

  return (
    <>
      {/* Custom vertical scroll progress bar */}
      <div className="custom-scrollbar-progress">
        <div
          className="custom-scrollbar-progress-fill"
          ref={progressRef}
          style={{ height: 0 }}
        />
      </div>
      {!isDashboard && !isAuthPage && <Header />}
      {!isDashboard && !isAuthPage && <Breadcrumb />}
      {/* Removed blocking loader - pages load instantly */}
      <Component {...pageProps} />
      {!isDashboard && !isAuthPage && <Footer />}
      <CartDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)}
        lastAddedItem={lastAddedItem}
      />
      
      <ToastContainer
        position="top-right"
        autoClose={2500}
        hideProgressBar={true}
        newestOnTop={true}
        closeOnClick={true}
        rtl={false}
        pauseOnFocusLoss={false}
        draggable={true}
        pauseOnHover={false}
        theme="light"
        limit={3}
      />
    </>
  );
}

function AppWrapper({ Component, pageProps, progressRef }) {
  return (
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
  );
}

function App({ Component, pageProps }) {
  const router = useRouter();
  const progressRef = useRef();
  const [analyticsLoaded, setAnalyticsLoaded] = useState(false);

  useEffect(() => {
    // Fix for turbopack error
    if (typeof window !== 'undefined' && !window.__turbopack_load_page_chunks__) {
      window.__turbopack_load_page_chunks__ = () => {};
    }
    
    // Defer analytics loading for better initial performance
    const timer = setTimeout(() => {
      setAnalyticsLoaded(true);
    }, 2000); // Load after 2 seconds
    
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    // Scroll progress bar logic with throttling to prevent excessive re-renders
    let ticking = false;
    
    function updateScrollProgress() {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      const percent = docHeight > 0 ? scrollTop / docHeight : 0;
      if (progressRef.current) {
        progressRef.current.style.height = `${percent * 100}%`;
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
        <title>Cross Coin</title>
        <link rel="icon" href="/crosscoin icon.png" />
      </Head>
      <UTMTracker />
      <Analytics />
      {analyticsLoaded && (
        <>
          <SpeedInsights />
          <VercelAnalytics />
        </>
      )}
      <AppWrapper 
        Component={Component} 
        pageProps={pageProps}
        progressRef={progressRef}
      />
    </>
  );
}

export default App;

