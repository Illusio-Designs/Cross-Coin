import { CartProvider } from '../context/CartContext';
import { WishlistProvider } from '../context/WishlistContext';
import '../styles/globals.css';
import { SessionProvider } from "next-auth/react";
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
import { useEffect } from 'react';

export default function App({ Component, pageProps: { session, ...pageProps } }) {
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
    <CartProvider>
      <WishlistProvider>
        <SessionProvider session={session}>
          <Component {...pageProps} />
        </SessionProvider>
      </WishlistProvider>
    </CartProvider>
  );
}
