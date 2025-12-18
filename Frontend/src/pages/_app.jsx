// import { ThemeProvider } from 'next-themes'; // Disabled dark mode
import Head from "next/head";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";
import { AuthProvider } from "../context/AuthContext";
import { CartProvider } from "../context/CartContext";
import { WishlistProvider } from "../context/WishlistContext";
import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/router";
import Loader from "../components/Loader";
import "../styles/globals.css";
import "../styles/responsive.css";
import "../styles/mobile-utilities.css";
import "../styles/components/Footer.css";
import "../styles/components/Header.css";
import "../styles/components/Testimonials.css";
import "../styles/pages/Home.css";
import "../styles/pages/products.css";
import "../styles/pages/ProductDetails.css";
import "../styles/pages/UnifiedCheckout.css";
import "../styles/pages/ThankYou.css";
import "../styles/pages/Wishlist.css";
import "../styles/pages/Login.css";
import "../styles/pages/Policy.css";
import "../styles/dashboard/layout.css";
import "../styles/dashboard/sidebar.css";
import "../styles/pages/auth/adminlogin.css";
import Analytics from "../components/common/Analytics";
import { SpeedInsights } from "@vercel/speed-insights/next";
import { Analytics as VercelAnalytics } from "@vercel/analytics/react";

export default function App({ Component, pageProps }) {
  const [loading, setLoading] = useState(false); // Start with false to allow immediate paint
  const router = useRouter();
  const progressRef = useRef();
  const isInitialMount = useRef(true);

  useEffect(() => {
    // Skip initial loading overlay to allow First Contentful Paint
    if (isInitialMount.current) {
      isInitialMount.current = false;
      // Don't show loader on initial mount - let content paint immediately
      return;
    }

    // Handle route changes only (not initial load)
    const handleStart = () => setLoading(true);
    const handleComplete = () => {
      // Use requestAnimationFrame to ensure smooth transition
      requestAnimationFrame(() => {
        setTimeout(() => {
          setLoading(false);
        }, 100);
      });
    };

    router.events.on("routeChangeStart", handleStart);
    router.events.on("routeChangeComplete", handleComplete);
    router.events.on("routeChangeError", handleComplete);

    return () => {
      router.events.off("routeChangeStart", handleStart);
      router.events.off("routeChangeComplete", handleComplete);
      router.events.off("routeChangeError", handleComplete);
    };
  }, [router.events]);

  useEffect(() => {
    // Fix for turbopack error
    if (typeof window !== 'undefined' && !window.__turbopack_load_page_chunks__) {
      window.__turbopack_load_page_chunks__ = () => {};
    }
  }, []);

  useEffect(() => {
    // Scroll progress bar logic
    function updateScrollProgress() {
      const scrollTop = window.scrollY || document.documentElement.scrollTop;
      const docHeight =
        document.documentElement.scrollHeight - window.innerHeight;
      const percent = docHeight > 0 ? scrollTop / docHeight : 0;
      if (progressRef.current) {
        progressRef.current.style.height = `${percent * 100}%`;
      }
    }
    window.addEventListener("scroll", updateScrollProgress);
    updateScrollProgress();
    return () => window.removeEventListener("scroll", updateScrollProgress);
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
      <Analytics />
      <SpeedInsights />
      <VercelAnalytics />
      <AuthProvider>
        <CartProvider>
          <WishlistProvider>
            {/* Custom vertical scroll progress bar */}
            <div className="custom-scrollbar-progress">
              <div
                className="custom-scrollbar-progress-fill"
                ref={progressRef}
                style={{ height: 0 }}
              />
            </div>
            {loading && (
              <div
                style={{
                  position: "fixed",
                  top: 0,
                  left: 0,
                  width: "100%",
                  height: "100%",
                  backgroundColor: "rgba(255, 255, 255, 1)",
                  display: "flex",
                  justifyContent: "center",
                  alignItems: "center",
                  zIndex: 9999,
                  backdropFilter: "blur(5px)",
                  pointerEvents: "auto",
                }}
              >
                <Loader />
              </div>
            )}
            <Component {...pageProps} />
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
          </WishlistProvider>
        </CartProvider>
      </AuthProvider>
    </>
  );
}
