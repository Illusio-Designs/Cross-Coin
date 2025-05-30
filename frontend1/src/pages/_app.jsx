import '../styles/globals.css';
import { SessionProvider } from "next-auth/react";
import '../styles/components/Footer.css';
import '../styles/components/Header.css';
import '../styles/components/Testimonials.css';
import '../styles/pages/Home.css';
import '../styles/pages/Products.css'
import '../styles/pages/ProductDetails.css';
import '../styles/pages/Cart.css';
import '../styles/pages/Shipping.css';
import '../styles/pages/Checkout.css';
import '../styles/pages/CheckoutUPI.css';
import '../styles/pages/ThankYou.css';
import '../styles/pages/Login.css';
import '../styles/pages/Policy.css';
import '../styles/pages/auth/Login.css';
import '../styles/dashboard/layout.css';
import '../styles/dashboard/sidebar.css';

export default function App({ Component, pageProps: { session, ...pageProps } }) {
  return (
    <SessionProvider session={session}>
      <Component {...pageProps} />
    </SessionProvider>
  );
}
