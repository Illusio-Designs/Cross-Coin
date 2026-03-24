import type { Metadata } from 'next';
import './globals.css';
import { StoreProvider } from '@/lib/store';
import Navbar from '@/components/layout/Navbar';
import Footer from '@/components/layout/Footer';
import CartDrawer from '@/components/cart/CartDrawer';
import AnnouncementBar from '@/components/layout/AnnouncementBar';
import SearchOverlay from '@/components/layout/SearchOverlay';
import CookieBanner from '@/components/ui/CookieBanner';
import ScrollToTop from '@/components/ui/ScrollToTop';

export const metadata: Metadata = {
  title: 'Velmique — Luxury Fashion',
  description: 'Discover Velmique — where luxury meets artistry. Explore our curated collections of high-fashion clothing crafted for the extraordinary woman.',
  keywords: 'luxury fashion, designer clothing, velmique, evening wear, luxury brand',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,600&family=Cormorant+Garamond:ital,wght@0,300;0,400;0,500;0,600;1,300;1,400&family=Jost:wght@300;400;500;600&display=swap" rel="stylesheet" />
      </head>
      <body>
        <StoreProvider>
          <AnnouncementBar />
          <Navbar />
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
