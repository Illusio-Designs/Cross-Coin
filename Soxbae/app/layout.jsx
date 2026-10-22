import { Inter, Fraunces } from 'next/font/google';
import './globals.css';
import './cookie-banner.css';
import SmoothScroll from '@/components/SmoothScroll';
import Msg91Loader from '@/components/Msg91Loader';
import ToastHost from '@/components/ToastHost';
import { AuthProvider } from '@/context/AuthContext';
import { CartProvider } from '@/context/CartContext';
import Header from '@/components/layout/Header';
import Footer from '@/components/layout/Footer';
import CartDrawer from '@/components/cart/CartDrawer';
import ExitIntentModal from '@/components/cart/ExitIntentModal';
import FloatingWidgets from '@/components/layout/FloatingWidgets';
import Analytics from '@/components/layout/Analytics';
import VisitTracker from '@/components/common/VisitTracker';
import SentryInit from '@/components/SentryInit';
import ConsentSpeedInsights from '@/components/layout/ConsentSpeedInsights';
import CookieBanner from '@/components/ui/CookieBanner';

const inter = Inter({ subsets: ['latin'], variable: '--font-body', display: 'swap' });
// Fraunces is a variable font: omit an explicit weight array (it supplies the
// full 100–900 range, which covers the 400–600 the CSS uses) so next/font makes
// one clean variable-font request. Pinning weights + italic made the Google
// fetch flaky and broke the production build.
const fraunces = Fraunces({ subsets: ['latin'], variable: '--font-display', display: 'swap', style: ['normal', 'italic'] });

export const metadata = {
  metadataBase: new URL('https://soxbaesocks.com'),
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
      <head>
        {/* Pictures wait (hidden) until fully loaded; with JavaScript off, show them straight away. */}
        <noscript><style>{'.shimmer-img{opacity:1!important}.shimmer-img-skeleton{display:none!important}'}</style></noscript>
        {/* Run before paint so the browser never restores the previous scroll
            position (which could show the footer first) on a fresh load. */}
        <script dangerouslySetInnerHTML={{ __html: "try{if('scrollRestoration' in history)history.scrollRestoration='manual'}catch(e){}" }} />
      </head>
      <body>
        {/* Pictures stay hidden until fully loaded + decoded; this shows them
            as soon as they are ready, even before React has started. */}
        <script dangerouslySetInnerHTML={{ __html: "(function(){try{document.addEventListener('load',function(e){var t=e.target;if(!t||t.tagName!=='IMG'||!t.classList.contains('shimmer-img'))return;var r=function(){if(t.naturalWidth>0)t.classList.add('is-loaded')};if(t.decode){t.decode().then(r,function(){})}else{r()}},true)}catch(_){}})();" }} />
        {/* Deploy resilience (no Vercel Pro): reload once if a CSS chunk fails to load. */}
        <script dangerouslySetInnerHTML={{ __html: "(function(){try{var K='__cssReload';window.addEventListener('error',function(e){var t=e&&e.target;if(t&&t.tagName==='LINK'&&t.rel==='stylesheet'&&/\\/_next\\/static\\/css\\//.test(t.href||'')){if(!sessionStorage.getItem(K)){sessionStorage.setItem(K,'1');location.reload();}}},true);}catch(_){}})();" }} />
        <SentryInit />
        <VisitTracker />
            <CookieBanner />
        <ConsentSpeedInsights />
        <Msg91Loader />
        <AuthProvider>
          <CartProvider>
            <SmoothScroll>
              <Header />
              <main id="main">{children}</main>
              <Footer />
              <CartDrawer />
              <ExitIntentModal />
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
