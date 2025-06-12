import { ThemeProvider } from 'next-themes';
import { Toaster } from 'react-hot-toast';
import { AuthProvider } from '../context/AuthContext';
import { CartProvider } from '../context/CartContext';
import { WishlistProvider } from '../context/WishlistContext';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/router';
import Loader from '../components/Loader';
import '../styles/globals.css';
import '../styles/components/Footer.css';
import '../styles/components/Header.css';
import '../styles/components/Testimonials.css';
import '../styles/pages/Home.css';
import '../styles/pages/products.css';
import '../styles/pages/ProductDetails.css';
import '../styles/pages/Cart.css';
import '../styles/pages/Shipping.css';
import '../styles/pages/Checkout.css';
import '../styles/pages/CheckoutUPI.css';
import '../styles/pages/ThankYou.css';
import '../styles/pages/Wishlist.css';
import '../styles/pages/Login.css';
import '../styles/pages/TC.css';
import '../styles/dashboard/layout.css';
import '../styles/dashboard/sidebar.css';
import '../styles/pages/auth/adminlogin.css';

export default function App({ Component, pageProps }) {
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    // Set initial loading state
    setLoading(true);
    const timer = setTimeout(() => {
      setLoading(false);
    }, 2000);

    // Handle route changes
    const handleStart = () => setLoading(true);
    const handleComplete = () => {
      setTimeout(() => {
        setLoading(false);
      }, 500);
    };

    router.events.on('routeChangeStart', handleStart);
    router.events.on('routeChangeComplete', handleComplete);
    router.events.on('routeChangeError', handleComplete);

    return () => {
      clearTimeout(timer);
      router.events.off('routeChangeStart', handleStart);
      router.events.off('routeChangeComplete', handleComplete);
      router.events.off('routeChangeError', handleComplete);
    };
  }, [router]);

  useEffect(() => {
    document.title = 'Cross Coin';
    const link = document.createElement('link');
    link.rel = 'icon';
    link.href = '/crosscoin icon.png';
    document.head.appendChild(link);
    return () => {
      document.head.removeChild(link);
    };
  }, []);

  return (
    <ThemeProvider attribute="class">
      <AuthProvider>
        <CartProvider>
          <WishlistProvider>
            {loading && (
              <div style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                backgroundColor: 'white',
                display: 'flex',
                justifyContent: 'center',
                alignItems: 'center',
                zIndex: 9999,
                backdropFilter: 'blur(5px)'
              }}>
                <div style={{
                  background: 'white',
                  padding: '2rem',
                  borderRadius: '1rem',
                  boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)'
                }}>
                  <Loader />
                </div>
              </div>
            )}
            <Component {...pageProps} />
            <Toaster position="top-right" />
          </WishlistProvider>
        </CartProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}