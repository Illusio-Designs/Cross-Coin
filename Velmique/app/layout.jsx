import { Playfair_Display, Cormorant_Garamond, Jost, Anton } from 'next/font/google';
import './globals.css';
import { StoreProvider } from '@/lib/store';
import HeaderShell from '@/components/layout/HeaderShell';
import Footer from '@/components/layout/Footer';
import CartDrawer from '@/components/cart/CartDrawer';
import SearchOverlay from '@/components/layout/SearchOverlay';
import CookieBanner from '@/components/ui/CookieBanner';
import ScrollToTop from '@/components/ui/ScrollToTop';
import ScrollProgress from '@/components/ui/ScrollProgress';

/* Fonts loaded via next/font — Next inlines them at build time, self-hosts
   them, and emits font-display: optional / swap behaviour so the browser
   shows the real face on first paint instead of flashing a system font. */
const playfair = Playfair_Display({
  subsets: ['latin'],
  weight: ['400', '600', '700', '800', '900'],
  style: ['normal', 'italic'],
  variable: '--font-playfair',
  display: 'swap',
  preload: true,
  fallback: ['Georgia', 'serif'],
});

const cormorant = Cormorant_Garamond({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600'],
  style: ['normal', 'italic'],
  variable: '--font-cormorant',
  display: 'swap',
  preload: true,
  fallback: ['Georgia', 'serif'],
});

const jost = Jost({
  subsets: ['latin'],
  weight: ['300', '400', '500', '600', '700'],
  variable: '--font-jost',
  display: 'swap',
  preload: true,
  fallback: ['system-ui', 'sans-serif'],
});

const anton = Anton({
  subsets: ['latin'],
  weight: '400',
  variable: '--font-anton',
  display: 'swap',
  preload: true,
  fallback: ['Impact', 'sans-serif'],
});

export const metadata = {
  title: 'Velmique — Luxury Perfume',
  description: 'Discover Velmique — where luxury meets artistry. Explore our curated fragrance collections crafted from the world\'s rarest ingredients.',
  keywords: 'luxury perfume, niche fragrance, velmique, eau de parfum, extrait de parfum, oud, luxury scent',
};

export default function RootLayout({ children }) {
  return (
    <html
      lang="en"
      className={`${playfair.variable} ${cormorant.variable} ${jost.variable} ${anton.variable}`}
    >
      <head>
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
        <link rel="dns-prefetch" href="https://ik.imagekit.io" />
        <link rel="dns-prefetch" href="https://api.crosscoin.in" />
      </head>
      <body className={jost.className}>
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
