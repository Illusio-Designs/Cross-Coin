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
// Critical CSS only - loaded immediately
import "../styles/globals.css";
import "../styles/responsive.css";
import "../styles/mobile-utilities.css";
// Page-specific CSS will be loaded by individual pages
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
      {/* Removed blocking loader - pages load instantly */}
      <Component {...pageProps} />
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
    
    console.log('🚀 App mounted - UTMTracker active');
    
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
