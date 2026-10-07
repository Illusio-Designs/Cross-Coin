import { Suspense } from 'react';
import './globals.css';
import 'react-toastify/dist/ReactToastify.css';
import { ToastContainer } from 'react-toastify';
import { StoreProvider } from '@/lib/store';
import { AuthProvider } from '@/context/AuthContext';
import ClientProviders from '@/components/layout/ClientProviders';
import SentryInit from '@/components/SentryInit';
import ConsentSpeedInsights from '@/components/layout/ConsentSpeedInsights';
import Analytics from '@/components/layout/Analytics';
import HeaderShell from '@/components/layout/HeaderShell';
import Footer from '@/components/layout/Footer';
import CartDrawer from '@/components/cart/CartDrawer';
import SearchOverlay from '@/components/layout/SearchOverlay';
import CookieBanner from '@/components/ui/CookieBanner';
import ScrollToTop from '@/components/ui/ScrollToTop';
import ScrollProgress from '@/components/ui/ScrollProgress';
import WhatsAppChat from '@/components/ui/WhatsAppChat';
import VisitTracker from '@/components/common/VisitTracker';

/* Fonts are loaded via a standard Google Fonts <link> in <head> (below) using
   their real family names — Bodoni Moda (display serif) + Manrope (body). We
   deliberately avoid next/font here: its hashed CSS-variable approach was
   collapsing to the body sans on the deployed site when the variable failed to
   resolve. Plain family names can never collapse that way. */
export const metadata = {
  title: 'Velmique — Luxury Perfume',
  description: 'Discover Velmique — where luxury meets artistry. Explore our curated fragrance collections crafted from the world\'s rarest ingredients.',
  keywords: 'luxury perfume, niche fragrance, velmique, eau de parfum, extrait de parfum, oud, luxury scent',
};

// Disable user zoom (pinch + ctrl-scroll). Locks viewport at 1.0 scale.
export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  minimumScale: 1,
  userScalable: false,
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        {/* Type system — Bodoni Moda (display serif) + Manrope (body) via a
            standard Google Fonts link with real family names. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          rel="stylesheet"
          href="https://fonts.googleapis.com/css2?family=Bodoni+Moda:ital,wght@0,400;0,500;0,600;0,700;0,800;1,400;1,500;1,600&family=Manrope:wght@300;400;500;600;700;800&display=swap"
        />
        <link rel="dns-prefetch" href="https://images.unsplash.com" />
        <link rel="dns-prefetch" href="https://ik.imagekit.io" />
        <link rel="dns-prefetch" href="https://api.crosscoin.in" />
        {/* MSG91 OTP widget — exposes window.sendOtp / window.verifyOtp for
            phone-OTP login. Only login + checkout need it, never at first paint,
            so we defer the third-party script until the browser is idle instead
            of loading it eagerly in <head> on every page. By the time a user
            reaches an OTP step it has long since loaded, but it no longer
            competes with the critical render path. */}
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
              <HeaderShell />
              <main id="main">{children}</main>
              <Footer />
              <CartDrawer />
              <SearchOverlay />
              <CookieBanner />
              <ScrollToTop />
              <WhatsAppChat />
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
                theme="light"
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
