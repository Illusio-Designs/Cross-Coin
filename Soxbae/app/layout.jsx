import { Inter, Fraunces } from 'next/font/google';
import './globals.css';
import SmoothScroll from '@/components/SmoothScroll';
import Msg91Loader from '@/components/Msg91Loader';
import ToastHost from '@/components/ToastHost';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import CartDrawer from '@/components/cart/CartDrawer';
import FloatingWidgets from '@/components/layout/FloatingWidgets';
import Analytics from '@/components/layout/Analytics';

const inter = Inter({ subsets: ['latin'], variable: '--font-body', display: 'swap' });
const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-display', display: 'swap', weight: ['400', '500', '600'], style: ['normal', 'italic'] });

export const metadata = {
  metadataBase: new URL('https://www.soxbaesocks.com'),
  title: {
    default: 'Soxbae — Premium socks for sport & city life',
    template: '%s | Soxbae',
  },
  description:
    'Soxbae premium socks: engineered knit, lasting cushioning and clean design for every step — for sport and the city.',
  openGraph: {
    siteName: 'Soxbae',
    type: 'website',
    title: 'Soxbae — Premium socks for sport & city life',
    description: 'Engineered knit, lasting cushioning and clean design in every step.',
  },
  // Deployment marker so we can verify EXACTLY which commit is live:
  // view page source and search for <meta name="x-build" …>.
  other: { 'x-build': (process.env.VERCEL_GIT_COMMIT_SHA || 'local').slice(0, 7) },
};

// Mobile browser chrome (address bar / status bar) tinted to the Soxbae brand.
export const viewport = {
  themeColor: '#17181a',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${inter.variable} ${fraunces.variable}`}>
      <body>
        <Msg91Loader />
        <AuthProvider>
          <CartProvider>
            <SmoothScroll>
              <Header />
              <main id="main">{children}</main>
              <Footer />
              <CartDrawer />
            </SmoothScroll>
            <FloatingWidgets />
            <ToastHost />
            <Analytics />
          </CartProvider>
        </AuthProvider>
      </body>
    </html>
  );
}
