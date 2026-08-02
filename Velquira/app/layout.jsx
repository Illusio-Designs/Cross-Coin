import { Cormorant_Garamond, Jost } from 'next/font/google';
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
import SentryInit from '@/components/SentryInit';

// Elegant serif display + refined sans body — a fine-jewellery pairing.
const display = Cormorant_Garamond({ subsets: ['latin'], weight: ['500', '600', '700'], variable: '--font-display', display: 'swap' });
const body = Jost({ subsets: ['latin'], variable: '--font-body', display: 'swap' });

export const metadata = {
  metadataBase: new URL('https://www.velquira.in'),
  title: {
    default: 'Velquira — Fine jewellery, crafted to be treasured',
    template: '%s | Velquira',
  },
  description:
    'Velquira fine jewellery — rings, necklaces, earrings and bracelets in hallmarked gold, handmade in the Morbi studio for life’s most special moments.',
  openGraph: {
    siteName: 'Velquira',
    type: 'website',
    title: 'Velquira — Fine jewellery, crafted to be treasured',
    description: 'Hallmarked gold jewellery, handmade for life’s most special moments.',
  },
  // Deployment marker so we can verify EXACTLY which commit is live.
  other: { 'x-build': (process.env.VERCEL_GIT_COMMIT_SHA || 'local').slice(0, 7) },
};

// Mobile browser chrome tinted to the Velquira espresso brand.
export const viewport = {
  themeColor: '#2a2118',
  width: 'device-width',
  initialScale: 1,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" className={`${display.variable} ${body.variable}`}>
      <body>
        {/* Deploy resilience (no Vercel Pro): reload once if a CSS chunk fails to load. */}
        <script dangerouslySetInnerHTML={{ __html: "(function(){try{var K='__cssReload';window.addEventListener('error',function(e){var t=e&&e.target;if(t&&t.tagName==='LINK'&&t.rel==='stylesheet'&&/\\/_next\\/static\\/css\\//.test(t.href||'')){if(!sessionStorage.getItem(K)){sessionStorage.setItem(K,'1');location.reload();}}},true);}catch(_){}})();" }} />
        <SentryInit />
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
