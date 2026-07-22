import { Inter } from 'next/font/google';
import './globals.css';
import SmoothScroll from '@/components/SmoothScroll';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import CartDrawer from '@/components/cart/CartDrawer';
import Analytics from '@/components/layout/Analytics';

const inter = Inter({ subsets: ['latin'], variable: '--font-body', display: 'swap' });

export const metadata = {
  metadataBase: new URL('https://www.morbixsocks.com'),
  title: {
    default: 'Morbix — Premium socks for sport & city life',
    template: '%s | Morbix',
  },
  description:
    'Morbix premium socks: engineered knit, lasting cushioning and clean design for every step — for sport and the city.',
  openGraph: {
    siteName: 'Morbix',
    type: 'website',
    title: 'Morbix — Premium socks for sport & city life',
    description: 'Engineered knit, lasting cushioning and clean design in every step.',
  },
  icons: { icon: '/icon.svg' },
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        <AuthProvider>
          <CartProvider>
            <SmoothScroll>
              <Header />
              <main id="main">{children}</main>
              <Footer />
              <CartDrawer />
            </SmoothScroll>
            <Analytics />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
