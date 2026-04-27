import './globals.css';
import { StoreProvider } from '@/lib/store';
import HeaderShell from '@/components/layout/HeaderShell';
import Footer from '@/components/layout/Footer';
import CartDrawer from '@/components/cart/CartDrawer';
import SearchOverlay from '@/components/layout/SearchOverlay';
import CookieBanner from '@/components/ui/CookieBanner';
import ScrollToTop from '@/components/ui/ScrollToTop';
import ScrollProgress from '@/components/ui/ScrollProgress';

export const metadata = {
  title: 'Velmique — Luxury Perfume',
  description: 'Discover Velmique — where luxury meets artistry. Explore our curated fragrance collections crafted from the world\'s rarest ingredients.',
  keywords: 'luxury perfume, niche fragrance, velmique, eau de parfum, extrait de parfum, oud, luxury scent',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,600;0,700;1,400&family=Cormorant+Garamond:wght@300;400;500&family=Jost:wght@300;400;500&display=swap" rel="stylesheet" />
      </head>
      <body>
        <StoreProvider>
          <ScrollProgress />
          <HeaderShell />
          <main>{children}</main>
          <Footer />
          <CartDrawer />
          <SearchOverlay />
          <CookieBanner />
          <ScrollToTop />
        </StoreProvider>
      </body>
    </html>
  );
}
