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
import '../styles/pages/UnifiedCheckout.css';
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

  useEffect(() => {
    // Intercom integration
    const INTERCOM_APP_ID = process.env.NEXT_PUBLIC_INTERCOM_APP_ID || 'YOUR_INTERCOM_APP_ID';
    if (!window.Intercom) {
      (function () {
        var w = window;
        var ic = w.Intercom;
        if (typeof ic === "function") {
          ic('reattach_activator');
          ic('update', {});
        } else {
          var d = document;
          var i = function () {
            i.c(arguments)
          };
          i.q = [];
          i.c = function (args) {
            i.q.push(args)
          };
          w.Intercom = i;
          function l() {
            var s = d.createElement('script');
            s.type = 'text/javascript';
            s.async = true;
            s.src = 'https://widget.intercom.io/widget/' + INTERCOM_APP_ID;
            var x = d.getElementsByTagName('script')[0];
            x.parentNode.insertBefore(s, x);
          }
          if (document.readyState === 'complete') {
            l();
          } else if (w.attachEvent) {
            w.attachEvent('onload', l);
          } else {
            w.addEventListener('load', l, false);
          }
        }
      })();
    }
    // Boot Intercom with user info if available
    if (window.Intercom) {
      const user = JSON.parse(localStorage.getItem('user'));
      window.Intercom('boot', {
        app_id: INTERCOM_APP_ID,
        ...(user && user.email ? { email: user.email, name: user.name } : {})
      });
    }
    return () => {
      if (window.Intercom) {
        window.Intercom('shutdown');
      }
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
                
                  <Loader />
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