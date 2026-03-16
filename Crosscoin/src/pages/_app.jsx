// import { ThemeProvider } from 'next-themes'; // Disabled dark mode
import Head from "next/head";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { AuthProvider, useAuth } from "../context/AuthContext";
import { CartProvider, useCart } from "../context/CartContext";
import { WishlistProvider } from "../context/WishlistContext";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import Loader from "../components/Loader";
import CartDrawer from "../components/cart/CartDrawer";
import Breadcrumb from "../components/Breadcrumb";
import Header from "../components/Header";
import Footer from "../components/Footer";
// Global CSS — all imports must live here (Next.js Pages Router rule)
import "../styles/globals.css";
import "../styles/responsive.css";
import "../styles/mobile-utilities.css";
import "../styles/skeleton.css";
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
import "../styles/pages/auth/adminlogin.css";
// Components
import "../styles/components/Header.css";
import "../styles/components/Breadcrumb.css";
import "../styles/components/Footer.css";
import "../styles/components/Testimonials.css";
import "../styles/components/TrustBadges.css";
import "../styles/components/HeroSlider.css";
import "../styles/components/SlidingCollection.css";
import "../styles/components/UnlockedExclusives.css";
import "../styles/components/CouponStrip.css";
// Common
import "../styles/common/TableControls.css";
import "../styles/common/FomoElements.css";
import "../styles/common/DonutChart.css";
// Dashboard
import "../styles/dashboard/layout.css";
import "../styles/dashboard/sidebar.css";
import "../styles/dashboard/full-width-fix.css";
import "../styles/dashboard/mobile.css";
import "../styles/dashboard/brands.css";
import "../styles/dashboard/brandSettings.css";
import "../styles/dashboard/brandTags.css";
import "../styles/dashboard/brandAssignment.css";
import "../styles/dashboard/reviews.css";
import "../styles/dashboard/seo.css";
import "../styles/dashboard/slider.css";
import "../styles/dashboard/header.css";
import "../styles/dashboard/Card.css";
// Component-local CSS (co-located with components)
import "../components/Sidebar/Sidebar.css";
import "../components/cart/CartDrawer.css";
import "../components/cart/QuantityOfferBar.css";
import "../components/ProductListSkeleton.css";
import "../components/DashboardSkeleton.css";
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
// Third-party
import "react-quill/dist/quill.snow.css";

import Analytics from "../components/common/Analytics";
import UTMTracker from "../components/common/UTMTracker";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics as VercelAnalytics } from "@vercel/analytics/react";

function AppContent({ Component, pageProps, progressRef }) {
  const { isDrawerOpen, setIsDrawerOpen, lastAddedItem, cartItems } = useCart();
  const { user } = useAuth();

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
      <Header />
      <Breadcrumb />
      {/* Removed blocking loader - pages load instantly */}
      <Component {...pageProps} />
      <Footer />
      <CartDrawer 
        isOpen={isDrawerOpen} 
        onClose={() => setIsDrawerOpen(false)}
        lastAddedItem={lastAddedItem}
      />
      
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
        newestOnTop={false}
        closeOnClick
        rtl={false}
        pauseOnFocusLoss
        draggable
        pauseOnHover
        theme="light"
      />
    </>
  );
}

function AppWrapper({ Component, pageProps, progressRef }) {
  return (
    <AuthProvider>
      <CartProvider>
        <WishlistProvider>
          <AppContent 
            Component={Component} 
            pageProps={pageProps}
            progressRef={progressRef}
          />
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

