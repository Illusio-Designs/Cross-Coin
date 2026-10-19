import { Suspense } from 'react';
import './globals.css';
import './cookie-banner.css';
import './mint.css';
import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer } from 'react-toastify';
import { StoreProvider } from '@/lib/store';
import { AuthProvider } from '@/context/AuthContext';
import ClientProviders from '@/components/layout/ClientProviders';
import SentryInit from '@/components/SentryInit';
import ConsentSpeedInsights from '@/components/layout/ConsentSpeedInsights';
import Analytics from '@/components/layout/Analytics';
import CartDrawer from '@/components/cart/CartDrawer';
import ExitIntentModal from '@/components/cart/ExitIntentModal';
import CookieBanner from '@/components/ui/CookieBanner';
import ScrollToTop from '@/components/ui/ScrollToTop';
import ScrollProgress from '@/components/ui/ScrollProgress';
import WhatsAppChat from '@/components/ui/WhatsAppChat';
import VisitTracker from '@/components/common/VisitTracker';
import MintShell from './_components/MintShell';
import { SITE_URL } from '@/lib/site';

/* Fonts are loaded via a standard Google Fonts <link> in <head> (below) using
   their real family names — Playfair Display (display serif) + Inter (body),
   the Maison "Mint" type pair. We deliberately avoid next/font here: its hashed
   CSS-variable approach was collapsing to the body sans on the deployed site
   when the variable failed to resolve. Plain family names can never collapse. */
const DESCRIPTION = 'VELMIQUE — refined, handcrafted Indian fragrances. Discover our Maison de Parfum: eau de parfum crafted from rare ingredients, made in India.';

export const metadata = {
  // Absolute base for canonical/OG URLs (matches sitemap.js / robots.js host).
  metadataBase: new URL(SITE_URL),
  title: 'Velmique — Maison de Parfum',
  description: DESCRIPTION,
  keywords: 'luxury perfume, niche fragrance, velmique, eau de parfum, indian perfume, oud, luxury scent',
  applicationName: 'Velmique',
  openGraph: {
    type: 'website',
    siteName: 'Velmique',
    title: 'Velmique — Maison de Parfum',
    description: DESCRIPTION,
    url: SITE_URL,
    locale: 'en_IN',
    images: [{ url: '/logo.webp' }],
  },
  twitter: { card: 'summary_large_image', title: 'Velmique — Maison de Parfum', description: DESCRIPTION },
};

// Allow pinch-zoom so shoppers can inspect product photos on mobile. Locking the
// viewport (userScalable:false) blocked zoom and is an accessibility regression.
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#0d0d0f',
  colorScheme: 'dark',
};

export default function RootLayout({ children }) {
  return (
    // data-maison switches the shared design tokens in globals.css to the onyx &
    // gold palette, so shared components (cart drawer, toasts…) match the shell.
    <html lang="en" data-maison="">
      <head>
        {/* Run before paint so the browser never restores the previous scroll
            position (which could show the footer first) on a fresh load. */}
        <script dangerouslySetInnerHTML={{ __html: "try{if('scrollRestoration' in history)history.scrollRestoration='manual'}catch(e){}" }} />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,400;0,500;0,600;0,700;1,400;1,500&family=Inter:wght@300;400;500;600;700;800&display=swap"
        />
        <link rel="dns-prefetch" href="https://ik.imagekit.io" />
        <link rel="dns-prefetch" href="https://api.crosscoin.in" />
        {/* MSG91 OTP widget — exposes window.sendOtp / window.verifyOtp for
            phone-OTP login. Only login + register need it, never at first
            paint, so the third-party script is deferred until the browser is
            idle instead of competing with the critical render path. */}
        <script
          dangerouslySetInnerHTML={{
            __html: `
              (function() {
                var configuration = {
                  widgetId: "366342706343383735393039",
                  tokenAuth: "426738T7QwVqDd1uX69c7fc1dP1",
                  exposeMethods: true,
                  identifier: "",
                  success: function(data) { window.__msg91OtpSuccess = data; },
                  failure: function(error) { window.__msg91OtpFailure = error; }
                };
                var urls = ['https://verify.msg91.com/otp-provider.js', 'https://verify.phone91.com/otp-provider.js'];
                function tryLoad(i) {
                  if (i >= urls.length) { window.__msg91Started = false; return; }
                  var s = document.createElement('script');
                  s.type = 'text/javascript';
                  s.async = true;
                  s.src = urls[i];
                  s.onload = function() {
                    if (typeof initSendOTP === 'function') initSendOTP(configuration);
                  };
                  s.onerror = function() { tryLoad(i + 1); };
                  document.head.appendChild(s);
                }
                function loadMsg91() {
                  if (window.__msg91Started) return;
                  window.__msg91Started = true;
                  tryLoad(0);
                }
                var ric = window.requestIdleCallback || function(cb){ return setTimeout(cb, 2500); };
                ric(loadMsg91);
              })();
            `,
          }}
        />
      </head>
      <body>
        {/* Deploy resilience (no Vercel Pro): reload once if a CSS chunk fails to load. */}
        <script dangerouslySetInnerHTML={{ __html: "(function(){try{var K='__cssReload';window.addEventListener('error',function(e){var t=e&&e.target;if(t&&t.tagName==='LINK'&&t.rel==='stylesheet'&&/\\/_next\\/static\\/css\\//.test(t.href||'')){if(!sessionStorage.getItem(K)){sessionStorage.setItem(K,'1');location.reload();}}},true);}catch(_){}})();" }} />
        <SentryInit />
        <ConsentSpeedInsights />
        <a href="#main" className="skip-to-main">Skip to main content</a>
        <ClientProviders>
          <AuthProvider>
            <StoreProvider>
              <ScrollProgress />
              <div className="m-root">
                <MintShell>{children}</MintShell>
              </div>
              <ExitIntentModal />
              <ScrollToTop />
              <WhatsAppChat />
              <CookieBanner />
              {/* The bag + full checkout (coupons, fees, COD/prepaid, WhatsApp
                  abandoned-cart capture and the ?recover=1 recovery link). */}
              <CartDrawer />
              {/* Analytics calls useSearchParams() for route-change tracking;
                  it must live inside a Suspense boundary or Next 14 bails
                  static prerendering on every page. */}
              <Suspense fallback={null}>
                <Analytics />
              </Suspense>
              <VisitTracker />
              <ToastContainer
                position="top-right"
                autoClose={2500}
                hideProgressBar
                newestOnTop
                closeOnClick
                pauseOnFocusLoss={false}
                pauseOnHover={false}
                draggable={false}
                theme="dark"
                limit={3}
                toastClassName="velmique-toast"
              />
            </StoreProvider>
          </AuthProvider>
        </ClientProviders>
      </body>
    </html>
  );
}
